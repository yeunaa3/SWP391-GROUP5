import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

export default function MotionExperience() {
  const { pathname } = useLocation();
  const progressRef = useRef(null);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: "instant" });
    let frame;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const article = document.querySelector(".srs-article");
        const start = article ? article.getBoundingClientRect().top + window.scrollY : 0;
        const length = article ? article.offsetHeight - window.innerHeight * .35 : document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.max(0, Math.min(1, (window.scrollY - start) / Math.max(length, 1)));
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${progress})`;
        setShowTop(window.scrollY > 500);
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const seen = new WeakSet();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("motion-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: "0px 0px -20px 0px" });
    const scan = () => {
      if (!reduced) document.querySelectorAll(".headline-grid > article, .news-category-block, .live-ad, .stat-card, .dashboard-section, .source-panel, .paywall-card, .srs-filter-panel")
        .forEach((element, index) => {
          if (seen.has(element)) return;
          seen.add(element);
          element.style.setProperty("--reveal-delay", `${Math.min(index % 3, 2) * 65}ms`);
          element.classList.add("motion-reveal");
          observer.observe(element);
        });
      update();
    };
    const mutations = new MutationObserver(scan);
    mutations.observe(document.getElementById("root"), { childList: true, subtree: true });
    scan();
    return () => {
      observer.disconnect(); mutations.disconnect(); cancelAnimationFrame(frame);
      document.querySelectorAll(".motion-reveal").forEach(element => element.classList.remove("motion-reveal", "motion-visible"));
      window.removeEventListener("scroll", update); window.removeEventListener("resize", update);
    };
  }, [pathname]);

  return <>
    <div className="reading-progress" aria-hidden="true"><span ref={progressRef} /></div>
    <button className={`back-to-top ${showTop ? "is-visible" : ""}`} tabIndex={showTop ? 0 : -1} aria-hidden={!showTop}
      aria-label="Về đầu trang" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 14 6-6 6 6" /></svg>
    </button>
  </>;
}
