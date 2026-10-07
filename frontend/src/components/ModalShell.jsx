import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ModalShell({ title, onClose, children, className = "" }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [...dialog.current.querySelectorAll('a[href],button:not(:disabled),input,textarea,select,[tabindex="0"]')];
    (dialog.current.querySelector("input") || focusable()[0] || dialog.current).focus();
    const keyboard = event => {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const nodes = focusable(); const first = nodes[0]; const last = nodes.at(-1);
        if (!nodes.length) { event.preventDefault(); return; }
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", keyboard);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keyboard); previous?.focus(); };
  }, [onClose]);
  return createPortal(<div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={dialog} tabIndex={-1} className={`pulse-modal ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal-title"><strong>{title}</strong><button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}>×</button></div>{children}
    </section>
  </div>, document.body);
}
