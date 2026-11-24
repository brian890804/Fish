import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/CloseRounded";
import dayjs from "dayjs";
import DayDetail from "../components/DayDetail";

export default function DayDialog({ date, onClose }: { date: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!date} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: "flex", alignItems: "center", fontWeight: 800 }}>
        <span style={{ flex: 1 }}>{date && dayjs(date).format("M 月 D 日 dddd")}</span>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <DayDetail date={date} />
      </DialogContent>
    </Dialog>
  );
}
