import SvgIcon, { type SvgIconProps } from "@mui/material/SvgIcon";
import type { Species } from "../lib/types";
import { SPECIES_COLOR } from "../theme";

/** 軟絲 */
export function SquidIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M12 1.5c2.6 2.2 3.6 5.4 3.6 8.2v3.3H8.4V9.7c0-2.8 1-6 3.6-8.2z" />
      <path d="M8.4 6.5C6 7.3 4.7 9.4 4.5 12c1.8-.5 3-1.6 3.9-2.4zM15.6 6.5c2.4.8 3.7 2.9 3.9 5.5-1.8-.5-3-1.6-3.9-2.4z" opacity=".75" />
      <path
        d="M9.2 13.2c-.4 3-1 5.3-2 7.3M11 13.4c0 3.2-.2 5.5-.6 8.1M13 13.4c0 3.2.2 5.5.6 8.1M14.8 13.2c.4 3 1 5.3 2 7.3"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"
      />
    </SvgIcon>
  );
}

/** 魚 */
export function FishIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox="0 0 24 24" {...props}>
      <path d="M2.5 12c2.6-4 6.2-6 10-6 3.4 0 6.2 1.8 7.5 4l3-2.6v9.2l-3-2.6c-1.3 2.2-4.1 4-7.5 4-3.8 0-7.4-2-10-6zm5.2-.8a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" fillRule="evenodd" />
    </SvgIcon>
  );
}

export function SpeciesIcon({ species, ...props }: SvgIconProps & { species: Species }) {
  const Icon = species === "squid" ? SquidIcon : FishIcon;
  return <Icon {...props} sx={{ color: SPECIES_COLOR[species], ...props.sx }} />;
}

export const SPECIES_LABEL: Record<Species, string> = { squid: "軟絲", fish: "魚" };
