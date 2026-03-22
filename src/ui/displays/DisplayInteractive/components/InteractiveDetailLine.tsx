import React from "react";
import { Text } from "ink";
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
}: Props) {
  const sel = selector(isSelected);
  return <Text>{`${anchorPrefix}      ${sel} ${text}`}</Text>;
}