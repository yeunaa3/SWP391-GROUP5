import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("pulse-theme") === "dark"; } catch { return false; } });
  useEffect(() => { document.documentElement.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem("pulse-theme", dark ? "dark" : "light"); } catch { /* Theme still works without storage. */ }
  }, [dark]);
  return <button type="button" className="icon-button theme-toggle" aria-label={dark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"} aria-pressed={dark} onClick={() => setDark(value => !value)}>
    {dark ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg>
      : <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></svg>}
  </button>;
}
