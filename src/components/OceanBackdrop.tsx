import React, { useEffect, useRef } from "react";

export const OceanBackdrop: React.FC = () => {
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    let rafId: number | null = null;

    const updateParallax = () => {
      rafId = null;
      const el = imgRef.current;
      if (!el) return;

      const doc = document.documentElement;
      const maxScroll = Math.max(1, doc.scrollHeight - window.innerHeight);
      const ratio = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      // Smoothly dive down up to 34% of the tall 3D underwater panorama via GPU translate3d
      const translatePct = -(ratio * 34);
      el.style.transform = `translate3d(0, ${translatePct.toFixed(3)}%, 0)`;
    };

    const onScroll = () => {
      if (rafId === null) {
        rafId = window.requestAnimationFrame(updateParallax);
      }
    };

    updateParallax();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none select-none bg-[#d8f1f7]"
    >
      <img
        ref={imgRef}
        src="/assets/ocean-bg-3d.jpg"
        alt=""
        className="w-full h-[155vh] object-cover object-top will-change-transform"
        style={{ transform: "translate3d(0, 0%, 0)" }}
      />
      {/* Soft pastel veil to keep foreground typography and cards crisp & readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fbf8f2]/72 via-[#f4fafc]/68 to-[#eaf6fa]/76" />
    </div>
  );
};

