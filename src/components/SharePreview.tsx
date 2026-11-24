import { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { canShareImage, downloadImage, shareImage } from "../lib/shareCard";

export interface CardPreview {
  blob: Blob;
  /** blob 的預覽網址（呼叫端負責關閉時 revoke） */
  url: string;
  date: string;
}

/** 分享前先看圖卡：按下分享或下載才真的送出／存檔 */
export default function SharePreview({ card, onClose }: { card: CardPreview | null; onClose: () => void }) {
  const [error, setError] = useState("");
  if (!card) return null;
  const canShare = canShareImage(card.blob, card.date);

  const onShare = async () => {
    try {
      await shareImage(card.blob, card.date);
    } catch (e) {
      // 使用者自己取消分享選單時不用提示
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>分享圖卡預覽</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        <Box component="img" src={card.url} alt={`${card.date} 釣況圖卡`} sx={{ width: "100%", display: "block", borderRadius: 2 }} />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>關閉</Button>
        <Button onClick={() => downloadImage(card.blob, card.date)}>下載圖片</Button>
        {canShare && <Button variant="contained" onClick={onShare}>分享</Button>}
      </DialogActions>
    </Dialog>
  );
}
