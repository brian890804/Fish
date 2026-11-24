// 讀 JPEG 照片的 EXIF：拍攝時間（DateTimeOriginal）與 GPS 位置。
// 只在手機上讀，不會上傳；上傳的照片在壓縮時本來就會去掉 EXIF。
// 註：iPhone 從網頁選照片時預設會移除位置（要在選照片的「選項」打開「位置」），Android 也常被遮掉，所以位置不一定有。

export interface PhotoMeta {
  /** 拍攝時間（unix 秒）；照片沒寫時區時當成台灣時間 */
  takenAt?: number;
  lat?: number;
  lon?: number;
}

const TAG = {
  exifIfd: 0x8769,
  gpsIfd: 0x8825,
  dateTimeOriginal: 0x9003,
  offsetTimeOriginal: 0x9011,
  gpsLatRef: 1,
  gpsLat: 2,
  gpsLonRef: 3,
  gpsLon: 4,
};

export async function readPhotoMeta(file: Blob): Promise<PhotoMeta> {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return {}; // 不是 JPEG
    let p = 2;
    while (p + 4 <= v.byteLength) {
      const marker = v.getUint16(p);
      const len = v.getUint16(p + 2);
      // APP1 + "Exif\0\0"
      if (marker === 0xffe1 && v.getUint32(p + 4) === 0x45786966 && v.getUint16(p + 8) === 0) {
        return parseTiff(v, p + 10);
      }
      if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) break; // 影像資料開始，後面不會有 EXIF
      p += 2 + len;
    }
  } catch {
    /* 讀不到就算了 */
  }
  return {};
}

function parseTiff(v: DataView, start: number): PhotoMeta {
  const little = v.getUint16(start) === 0x4949;
  const u16 = (o: number) => v.getUint16(start + o, little);
  const u32 = (o: number) => v.getUint32(start + o, little);

  const readIfd = (off: number) => {
    const entries = new Map<number, { type: number; count: number; valueOffset: number; entryAt: number }>();
    const n = u16(off);
    for (let i = 0; i < n; i++) {
      const e = off + 2 + i * 12;
      entries.set(u16(e), { type: u16(e + 2), count: u32(e + 4), valueOffset: u32(e + 8), entryAt: e + 8 });
    }
    return entries;
  };
  const ascii = (e: { count: number; valueOffset: number; entryAt: number }) => {
    const at = e.count <= 4 ? e.entryAt : e.valueOffset;
    let s = "";
    for (let i = 0; i < e.count - 1; i++) s += String.fromCharCode(v.getUint8(start + at + i));
    return s;
  };
  const rationals = (e: { count: number; valueOffset: number }) =>
    Array.from({ length: e.count }, (_, i) => {
      const den = u32(e.valueOffset + i * 8 + 4);
      return den ? u32(e.valueOffset + i * 8) / den : 0;
    });

  const out: PhotoMeta = {};
  const ifd0 = readIfd(u32(4));

  const exifPtr = ifd0.get(TAG.exifIfd);
  if (exifPtr) {
    const exif = readIfd(exifPtr.valueOffset);
    const dt = exif.get(TAG.dateTimeOriginal);
    if (dt) {
      // "2026:11:21 19:42:05"
      const m = /^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(ascii(dt));
      if (m) {
        const off = exif.get(TAG.offsetTimeOriginal);
        const tz = off ? ascii(off) : "+08:00";
        const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${/^[+-]\d{2}:\d{2}$/.test(tz) ? tz : "+08:00"}`);
        if (Number.isFinite(t)) out.takenAt = Math.floor(t / 1000);
      }
    }
  }

  const gpsPtr = ifd0.get(TAG.gpsIfd);
  if (gpsPtr) {
    const gps = readIfd(gpsPtr.valueOffset);
    const lat = gps.get(TAG.gpsLat);
    const lon = gps.get(TAG.gpsLon);
    const latRef = gps.get(TAG.gpsLatRef);
    const lonRef = gps.get(TAG.gpsLonRef);
    if (lat && lon) {
      const dms = (r: number[]) => r[0] + (r[1] ?? 0) / 60 + (r[2] ?? 0) / 3600;
      let la = dms(rationals(lat));
      let lo = dms(rationals(lon));
      // N/S、E/W 是 2 個字元的字串，直接放在欄位裡
      if (latRef && ascii(latRef) === "S") la = -la;
      if (lonRef && ascii(lonRef) === "W") lo = -lo;
      // 0,0 代表沒有定位
      if (Math.abs(la) > 0.0001 || Math.abs(lo) > 0.0001) {
        out.lat = la;
        out.lon = lo;
      }
    }
  }
  return out;
}
