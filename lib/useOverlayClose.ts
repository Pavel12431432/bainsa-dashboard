"use client";

import { useRef, MouseEvent } from "react";

/** Returns mousedown/mouseup handlers for a modal overlay that close on
 *  outside-click but ignore drag-releases that started inside the modal
 *  (e.g. selecting text and releasing outside). Spread on the overlay div;
 *  keep `onClick={(e) => e.stopPropagation()}` on the inner content. */
export function useOverlayClose(onClose: () => void) {
  const downOnOverlay = useRef(false);
  return {
    onMouseDown: (e: MouseEvent) => {
      downOnOverlay.current = e.target === e.currentTarget;
    },
    onMouseUp: (e: MouseEvent) => {
      const fire = downOnOverlay.current && e.target === e.currentTarget;
      downOnOverlay.current = false;
      if (fire) onClose();
    },
  };
}
