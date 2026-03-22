import React from "react";
import { Text } from "ink";
import * as fmt from "@std/fmt/colors";

type Props = {
  watchPaths: string[];
  watchTriggerPaths: string[];
};

export function WatchStatus({ watchPaths, watchTriggerPaths }: Props) {
  return (
    <Text>
      {fmt.dim("\nWatching and running tests from:")}
      {"\n"}
      {watchPaths.map((p, i) => (
        <Text key={i}>{fmt.cyan(`  ${p}`)}{"\n"}</Text>
      ))}
      {watchTriggerPaths.length > 0 && (
        <>
          {fmt.dim("\nRerun when changes from:")}
          {"\n"}
          {watchTriggerPaths.map((p, i) => (
            <Text key={i}>{fmt.cyan(`  ${p}`)}{"\n"}</Text>
          ))}
        </>
      )}
    </Text>
  );
}
