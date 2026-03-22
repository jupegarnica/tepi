import type { BlockState } from "../store/store.ts";

export type BlockDetailProps = {
  block: BlockState;
  truncateBody: boolean;
  truncateHeaders: boolean;
  showErrorDetail: boolean;
};
