import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { getPortalRoot } from "../../utils/format";

/** Floating panel yang di-portal ke body (tidak terpotong overflow). */
export function Popover({ open, anchorRef, onClose, children, align = "left", matchWidth = false, width, className, maxHeight = 320 }) {
  const menuRef = useRef(null);
  const [pos, setPos] = useState(null);

  const update = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const menuH = Math.min(menuRef.current?.offsetHeight || maxHeight, maxHeight);
    const below = window.innerHeight - r.bottom;
    const up = below < menuH + 16 && r.top > below;
    const w = matchWidth ? r.width : width;
    let left = align === "right" && w ? r.right - w : r.left;
    if (w) left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    setPos({
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
      left: align === "right" && !w ? undefined : left,
      right: align === "right" && !w ? Math.max(8, window.innerWidth - r.right) : undefined,
      width: w,
      origin: up ? "bottom" : "top",
      maxH: Math.max(160, Math.min(maxHeight, (up ? r.top : below) - 20)),
    });
  }, [anchorRef, align, matchWidth, width, maxHeight]);

  useLayoutEffect(() => {
    if (open) update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || anchorRef.current?.contains(e.target)) return;
      onClose?.();
    };
    const onScroll = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      update();
    };
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", update);
    };
  }, [open, onClose, update, anchorRef]);

  return createPortal(
    <AnimatePresence>
      {open && pos && (
        <motion.div
          ref={menuRef}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.97, y: pos.origin === "top" ? -6 : 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.14 }}
          style={{ position: "fixed", zIndex: 150, top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, width: pos.width, maxHeight: pos.maxH, transformOrigin: `${pos.origin} left` }}
          className={`thin-scroll overflow-auto rounded-xl border border-slate-200 bg-white shadow-2xl shadow-navy-900/15 ${className || ""}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    getPortalRoot()
  );
}
