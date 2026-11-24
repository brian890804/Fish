import { useEffect, useState } from "react";

/**
 * 記住使用者在這台裝置上的選擇（例如預報表的 1h／2h／3h）。
 * 讀寫都包在 try/catch 裡，私密瀏覽或儲存空間不足時就只是不記住，不影響使用。
 */
export function useStoredState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : (JSON.parse(raw) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 忽略 */
    }
  }, [key, value]);
  return [value, setValue];
}
