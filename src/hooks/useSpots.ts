import { useApi } from "../lib/api";
import type { Spot } from "../lib/types";

export function useSpots() {
  return useApi<Spot[]>("/spots");
}
