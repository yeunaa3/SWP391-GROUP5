const paths = {
  grid: "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
  company: "M4 21V7l8-4 8 4v14 M2 21h20 M9 21v-5h6v5 M8 9h1 M15 9h1 M8 12h1 M15 12h1",
  document: "M6 3h9l4 4v14H6z M14 3v5h5 M9 12h7 M9 16h7",
  calendar: "M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16 M8 14h1 M14 14h1 M8 17h1",
  campaign: "M4 10h5l10-5v14l-10-5H4z M7 14l2 7h3 M22 9v6",
  chart: "M4 3v18h17 M8 16v-4 M13 16V8 M18 16V5",
  user: "M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0 M4 21v-3a8 8 0 0 1 16 0v3",
  arrow: "M5 12h14 M13 6l6 6-6 6",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  check: "M5 12l4 4L19 6",
};

export default function UiIcon({ name = "grid", className = "" }) {
  return <svg className={`ui-icon ${className}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.grid}/></svg>;
}
