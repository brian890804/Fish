import dayjs from "dayjs";
import { useApi } from "../lib/api";
import type { CalendarDay } from "../lib/types";

export function useCalendar(month: dayjs.Dayjs) {
  const { data, ...rest } = useApi<CalendarDay[]>(`/calendar?month=${month.format("YYYY-MM")}`);
  const byDate = new Map((data ?? []).map((d) => [d.date, d]));
  const totals = (data ?? []).reduce(
    (a, d) => ({ trips: a.trips + d.trips, squid: a.squid + d.squid, fish: a.fish + d.fish, blank: a.blank + (d.squid + d.fish === 0 ? 1 : 0) }),
    { trips: 0, squid: 0, fish: 0, blank: 0 },
  );
  const first = month.startOf("month");
  const cells: (dayjs.Dayjs | null)[] = [
    ...Array(first.day()).fill(null),
    ...Array.from({ length: month.daysInMonth() }, (_, i) => first.add(i, "day")),
  ];
  while (cells.length % 7) cells.push(null);
  return { data, byDate, totals, cells, ...rest };
}
