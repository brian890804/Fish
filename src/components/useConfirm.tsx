import { useCallback, useRef, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

interface Options {
  title: string;
  message?: string;
  confirmText?: string;
}

/**
 * 取代 window.confirm：有些內嵌瀏覽器或 WebView 會直接擋掉原生確認視窗（永遠回傳 false），
 * 所以改用 MUI Dialog。用法：const [confirmDialog, confirm] = useConfirm(); if (await confirm({...})) ...
 */
export function useConfirm(): [React.ReactNode, (o: Options) => Promise<boolean>] {
  const [opts, setOpts] = useState<Options | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const ask = useCallback((o: Options) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current?.(v);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = (
    <Dialog open={!!opts} onClose={() => close(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>{opts?.title}</DialogTitle>
      {opts?.message && (
        <DialogContent>
          <Typography color="text.secondary">{opts.message}</Typography>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={() => close(false)}>取消</Button>
        <Button variant="contained" color="error" onClick={() => close(true)} autoFocus>
          {opts?.confirmText ?? "刪除"}
        </Button>
      </DialogActions>
    </Dialog>
  );

  return [dialog, ask];
}
