import { useEffect, useState } from "react";
import type { StoreApi, TepiStore } from "../../store/store.ts";

export function useStore<T>(store: StoreApi, selector: (state: TepiStore) => T): T {
  const [value, setValue] = useState(() => selector(store.getState()));
  useEffect(() => {
    const unsub = store.subscribe((state) => {
      setValue(selector(state));
    });
    return unsub;
  }, [store]);
  return value;
}
