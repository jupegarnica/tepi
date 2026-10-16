import { selector } from "../utils/interactiveFormatters.ts";

type Props = {
  text: string;
  isSelected: boolean;
  anchorPrefix?: string;
};

export function InteractiveDetailLine({
  text,
  isSelected,
  anchorPrefix = "",
}: Props): string {
  const sel = selector(isSelected);
  return `${anchorPrefix}      ${sel} ${text}`;
}
