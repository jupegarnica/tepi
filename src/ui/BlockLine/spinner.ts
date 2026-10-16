// Termdom-based replacement for ink-spinner dots4: a frame index caller rotates.
const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
let frame = 0;

export function Spinner(): string {
  frame = (frame + 1) % FRAMES.length;
  return FRAMES[frame];
}
