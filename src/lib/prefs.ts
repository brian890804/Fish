import { useEffect, useState } from "react";

const EVENT = "fish:pref";

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw == null ? initial : (JSON.parse(raw) as T);
  } catch {
    return initial;
  }
}

/**
 * 記住使用者在這台裝置上的選擇（例如預報表的 1h／2h／3h、要看的釣點、軟絲／魚）。
 * 同一個 key 在畫面上好幾個地方用時會同步（例如電腦版側邊欄與總覽）。
 * 讀寫都包在 try/catch 裡，私密瀏覽或儲存空間不足時就只是不記住，不影響使用。
 */
export function useStoredState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, initial));

  // 別的元件改了同一個 key，就跟著更新
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string; value: T }>).detail;
      if (detail?.key === key) setValue(detail.value);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, [key]);

  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* 忽略 */
    }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { key, value: v } }));
  };
  return [value, set];
}
