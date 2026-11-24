import { forwardRef } from "react";
import { AppBar, Box, Dialog, IconButton, Slide, Toolbar, Typography } from "@mui/material";
import type { TransitionProps } from "@mui/material/transitions";
import CloseIcon from "@mui/icons-material/CloseRounded";
import dayjs from "dayjs";
import DayDetail from "../components/DayDetail";

const SlideUp = forwardRef(function SlideUp(props: TransitionProps & { children: React.ReactElement }, ref: React.Ref<unknown>) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function DaySheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  return (
    <Dialog fullScreen open={!!date} onClose={onClose} slots={{ transition: SlideUp }}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ pt: "env(safe-area-inset-top)", bgcolor: "background.paper" }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1 }}>{date && dayjs(date).format("M 月 D 日 dddd")}</Typography>
          <IconButton edge="end" onClick={onClose}><CloseIcon /></IconButton>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2, maxWidth: 640, mx: "auto", width: "100%", pb: "calc(24px + env(safe-area-inset-bottom))" }}>
        <DayDetail date={date} />
      </Box>
    </Dialog>
  );
}
