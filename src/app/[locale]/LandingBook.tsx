"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

const TURN_MS = 1100;

/**
 * Table colour and accent for each spread, picked from its photo.
 * These are sample data, not interface tokens; real books will take them from the photo itself.
 */
const SPREAD_COLORS = [
  ["#9fd2f0", "#0f5582"],
  ["#f5a9bc", "#8c1d3f"],
  ["#f5cd62", "#7a5200"],
  ["#bfe3b4", "#2f6a2a"],
] as const;

/** Phones show one page at a time; wider screens show the open spread. */
const ONE_PAGE = "(max-width: 639px)";

function Face({
  side,
  back = false,
  folio,
  children,
}: {
  side: "l" | "r";
  back?: boolean;
  folio?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className={`lb-face lb-${side}${back ? " lb-back" : ""}`}>
      {children}
      {folio ? (
        <div className="absolute bottom-[5cqw] w-full text-center text-[2.8cqw] text-pencil-soft">{folio}</div>
      ) : null}
      <div className="lb-shade" />
    </div>
  );
}

/**
 * The landing hero: captions on one side, a sample book on the other.
 * The book turns like a real one: click the right page or swipe left to go forward. The page itself scrolls as usual.
 * `pages` are the book pages in order (even ones are left pages); `thoughts` are one caption per spread.
 */
export function LandingBook({
  header,
  thoughts,
  pages,
}: {
  header: React.ReactNode;
  thoughts: React.ReactNode[];
  pages: React.ReactNode[];
}) {
  const t = useTranslations("Landing");
  const [single, setSingle] = useState<boolean | null>(null);
  const [current, setCurrent] = useState(0);
  const turned = useRef<boolean[]>([]);
  const layout = useRef<boolean | null>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const swiped = useRef(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  const total = pages.length;
  const leafCount = single ? total - 1 : (total - 2) / 2;
  const spread = single ? Math.floor(current / 2) : current;
  const [table, accent] = SPREAD_COLORS[Math.min(spread, SPREAD_COLORS.length - 1)];

  useEffect(() => {
    const mq = matchMedia(ONE_PAGE);
    const sync = () => {
      // Keep the same story open when the layout switches between one and two pages.
      if (layout.current !== null && layout.current !== mq.matches) {
        setCurrent((c) => (mq.matches ? Math.min(c * 2, total - 1) : Math.floor(c / 2)));
      }
      setSingle(mq.matches);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [total]);

  useLayoutEffect(() => {
    if (single === null) return;
    const silent = layout.current !== single;
    layout.current = single;
    if (silent) turned.current = [];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const leaves = Array.from(bookRef.current?.querySelectorAll<HTMLDivElement>(":scope > .lb-leaf") ?? []).sort(
      (a, b) => Number(a.dataset.k) - Number(b.dataset.k),
    );

    if (silent) {
      leaves.forEach((leaf, k) => {
        if (!leaf) return;
        const on = k < current;
        turned.current[k] = on;
        leaf.style.transitionDuration = "0s";
        leaf.style.transform = on ? "rotateY(-180deg)" : "none";
        leaf.style.zIndex = String(on ? 10 + k : 50 - k);
        if (single) leaf.style.opacity = on ? "0" : "1";
      });
      return;
    }

    // After a jump several pages turn one after another: forward from the front, back from the end.
    const forward = leaves.map((_, k) => k).filter((k) => k < current && !turned.current[k]);
    const back = leaves
      .map((_, k) => k)
      .filter((k) => k >= current && turned.current[k])
      .reverse();
    [...forward, ...back].forEach((k, i) => {
      const leaf = leaves[k];
      if (!leaf) return;
      const on = !turned.current[k];
      turned.current[k] = on;
      const delay = reduce ? 0 : i * 160;
      leaf.style.transitionDuration = "";
      leaf.style.transitionDelay = `${delay}ms, ${delay + (on ? TURN_MS / 2 : 0)}ms`;
      leaf.style.zIndex = String(100 + (on ? k : leafCount - k));
      leaf.style.transform = on ? "rotateY(-180deg)" : "none";
      if (single) leaf.style.opacity = on ? "0" : "1";
      leaf.querySelectorAll<HTMLElement>(".lb-shade").forEach((el) => {
        el.style.animation = "none";
        void el.offsetWidth;
        el.style.animation = reduce ? "none" : `lb-shade ${TURN_MS}ms ease ${delay}ms`;
      });
    });
  }, [current, single, leafCount]);

  const go = (step: number) => setCurrent((c) => Math.min(leafCount, Math.max(0, c + step)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    // A horizontal trackpad gesture over the book turns one page.
    let lock = 0;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (Math.abs(e.deltaX) < 12 || Date.now() < lock) return;
      lock = Date.now() + 700;
      go(e.deltaX > 0 ? 1 : -1);
    };
    const book = bookRef.current;
    addEventListener("keydown", onKey);
    book?.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      removeEventListener("keydown", onKey);
      book?.removeEventListener("wheel", onWheel);
    };
  });

  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a") || swiped.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    go(single || e.clientX > r.left + r.width / 2 ? 1 : -1);
  };

  // Swipe on touch screens; vertical swipes still scroll the page (touch-action: pan-y).
  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    start.current = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  // When a turn ends, the leaf drops from "above everything" to its place in the stack.
  const onTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform" || e.target !== e.currentTarget) return;
    const k = Number(e.currentTarget.dataset.k);
    e.currentTarget.style.zIndex = String(turned.current[k] ? 10 + k : 50 - k);
  };

  const leaves: React.ReactNode[] = [];
  if (single) {
    // One page at a time: every page turns away to the left, its back is blank paper.
    for (let k = 0; k < total - 1; k++) {
      leaves.push(
        <div key={`one-${k}`} data-k={k} className="lb-leaf" onTransitionEnd={onTransitionEnd}>
          <Face side="r" folio={k + 1}>
            {pages[k]}
          </Face>
          <Face side="l" back />
        </div>,
      );
    }
  } else {
    for (let k = 0; k < (total - 2) / 2; k++) {
      leaves.push(
        <div key={`two-${k}`} data-k={k} className="lb-leaf" onTransitionEnd={onTransitionEnd}>
          <Face side="r" folio={2 * k + 2}>
            {pages[2 * k + 1]}
          </Face>
          <Face side="l" back folio={2 * k + 3}>
            {pages[2 * k + 2]}
          </Face>
        </div>,
      );
    }
  }

  const atEnd = current === leafCount;
  const count = single
    ? t("pageOf", { page: current + 1, total })
    : t("pagesOf", { from: current * 2 + 1, to: current * 2 + 2, total });

  return (
    <section className="lb-table" style={{ "--table": table, "--accent": accent } as React.CSSProperties}>
      {header}
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 pb-14 pt-2 sm:px-6 xl:min-h-[calc(100svh-104px)] xl:grid-cols-[400px_1fr] xl:gap-14 xl:pb-16">
        <div className="grid">
          {thoughts.map((node, i) => (
            <div
              key={i}
              aria-hidden={i !== spread}
              className={`lb-thought flex flex-col justify-center [grid-area:1/1] ${i === spread ? "lb-on" : ""}`}
            >
              {node}
            </div>
          ))}
        </div>

        <div className="flex min-w-0 flex-col items-center gap-5">
          <div className="[perspective:2800px]">
            <div
              ref={bookRef}
              role="region"
              aria-roledescription={t("bookLabel")}
              aria-label={t("bookLabel")}
              onClick={onClick}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              className={`lb-book transition-opacity duration-500 ${single ? "lb-one" : ""} ${atEnd ? "lb-end" : ""} ${single === null ? "opacity-0" : ""}`}
            >
              {!single && (
                <div className="lb-page lb-left">
                  <Face side="l" folio={1}>
                    {pages[0]}
                  </Face>
                </div>
              )}
              <div className="lb-page lb-right">
                <Face side="r" folio={total}>
                  {pages[total - 1]}
                </Face>
              </div>
              {leaves}
            </div>
          </div>

          <div className="flex items-center gap-4 text-[16px] text-ink">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={current === 0}
              aria-label={t("prev")}
              className="flex size-12 items-center justify-center rounded-full border border-ink text-[20px] disabled:opacity-30"
            >
              &larr;
            </button>
            <span aria-live="polite" className="min-w-[7em] text-center tabular-nums">
              {count}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={atEnd}
              aria-label={t("next")}
              className="flex size-12 items-center justify-center rounded-full border border-ink text-[20px] disabled:opacity-30"
            >
              &rarr;
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
