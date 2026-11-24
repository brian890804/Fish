// 產生 Web Push 用的 VAPID 金鑰，直接存成 Cloudflare Worker 的 secret（金鑰不會顯示在畫面上，也不會寫進檔案）。
// 用法：在 Fish 資料夾執行 node scripts/setup-push.mjs
// 注意：重新產生金鑰後，所有手機都要在設定頁把通知關掉再打開一次。
import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";

const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const pub = publicKey.export({ format: "jwk" });
const priv = privateKey.export({ format: "jwk" });
const b64url = (buf) => Buffer.from(buf).toString("base64url");
// 公鑰：未壓縮格式 0x04 || x || y
const publicKeyB64 = b64url(Buffer.concat([Buffer.from([4]), Buffer.from(pub.x, "base64url"), Buffer.from(pub.y, "base64url")]));
const privateKeyB64 = priv.d;

for (const [name, value] of [["VAPID_PUBLIC_KEY", publicKeyB64], ["VAPID_PRIVATE_KEY", privateKeyB64]]) {
  console.log(`設定 ${name}…`);
  const r = spawnSync("npx", ["wrangler", "secret", "put", name], { input: value, stdio: ["pipe", "inherit", "inherit"] });
  if (r.status !== 0) {
    console.error(`設定 ${name} 失敗`);
    process.exit(1);
  }
}
console.log("完成！到 App 的「設定 → 好時段通知」打開開關就可以了。");
