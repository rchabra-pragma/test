// Pure geometry for panels anchored to a trigger. No React / react-native imports so it stays
// testable with plain node.

/** A trigger's position and size in window coordinates. */
export type Anchor = { x: number; y: number; w: number; h: number };

export type PanelLayout = {
  width: number;
  left: number;
  maxHeight: number;
  /** Exactly one of these is set: `top` when the panel opens downwards, `bottom` when flipped. */
  top?: number;
  bottom?: number;
};

const GAP = 4; // breathing room between trigger and panel
const EDGE = 8; // keep clear of the window edges
const MAX_H = 320;
const MIN_BELOW = 180; // below this, opening downwards is too cramped to be useful

/**
 * Positions a dropdown against its trigger: below when there is room, flipped above when there is
 * not, and always clamped inside the window so it can never run off-screen.
 */
export function panelLayout(a: Anchor, winW: number, winH: number, preferredWidth = 300): PanelLayout {
  const width = Math.max(a.w, Math.min(preferredWidth, winW - EDGE * 2));
  const left = Math.min(Math.max(a.x, EDGE), Math.max(EDGE, winW - width - EDGE));
  const below = winH - (a.y + a.h);
  const above = a.y;
  const space = (room: number) => Math.max(0, Math.min(MAX_H, room - GAP - EDGE));

  return below < MIN_BELOW && above > below
    ? { width, left, bottom: winH - a.y + GAP, maxHeight: space(above) }
    : { width, left, top: a.y + a.h + GAP, maxHeight: space(below) };
}
