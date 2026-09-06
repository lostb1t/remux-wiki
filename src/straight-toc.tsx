"use client";

import { TOCItem } from "fumadocs-core/toc";
import {
  TOCScrollArea,
  useItems,
  useTOCItems,
} from "fumadocs-ui/components/toc";
import { ChevronDown, Text } from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const AT_TOP = 1;
const AT_BOTTOM = 2;
const SCROLL_BOUNDARY_TOLERANCE = 2;

function getScrollBoundary() {
  const scrollElement = document.scrollingElement ?? document.documentElement;
  const scrollTop = scrollElement.scrollTop;
  let boundary = 0;
  if (scrollTop <= SCROLL_BOUNDARY_TOLERANCE) boundary |= AT_TOP;
  if (
    scrollTop + scrollElement.clientHeight >=
    scrollElement.scrollHeight - SCROLL_BOUNDARY_TOLERANCE
  ) {
    boundary |= AT_BOTTOM;
  }
  return boundary;
}

function subscribeToScrollBoundary(onChange: () => void) {
  const resizeObserver = new ResizeObserver(onChange);

  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  resizeObserver.observe(document.body);

  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
    resizeObserver.disconnect();
  };
}

function useScrollBoundary() {
  return useSyncExternalStore(
    subscribeToScrollBoundary,
    getScrollBoundary,
    () => AT_TOP,
  );
}

function itemIndent(depth: number) {
  if (depth <= 2) return 16;
  if (depth === 3) return 28;
  return 40;
}

export function StraightToc() {
  const items = useTOCItems();
  const trackedItems = useItems();
  const scrollBoundary = useScrollBoundary();
  const activeIndex =
    scrollBoundary & AT_TOP
      ? 0
      : scrollBoundary & AT_BOTTOM
        ? items.length - 1
        : trackedItems.findIndex((item) => item.active);
  const activeUrl = items[activeIndex]?.url;
  const activeAnchor = activeUrl?.startsWith("#")
    ? activeUrl.slice(1)
    : undefined;

  useEffect(() => {
    const nextHash = scrollBoundary & AT_TOP ? "" : activeAnchor;
    if (nextHash === undefined) return;

    const url = new URL(window.location.href);
    url.hash = nextHash;
    if (url.href === window.location.href) return;

    window.history.replaceState(window.history.state, "", url);
  }, [activeAnchor, scrollBoundary]);

  if (items.length === 0) {
    return (
      <div
        id="nd-toc-placeholder"
        className="hidden xl:layout:[--fd-toc-width:268px]"
      />
    );
  }

  return (
    <div
      id="nd-toc"
      className="sticky top-(--fd-docs-row-1) h-[calc(var(--fd-docs-height)-var(--fd-docs-row-1))] flex flex-col [grid-area:toc] w-(--fd-toc-width) pt-12 pe-4 pb-2 xl:layout:[--fd-toc-width:268px] max-xl:hidden"
    >
      <h3
        id="toc-title"
        className="inline-flex items-center gap-1.5 text-sm text-fd-muted-foreground"
      >
        <Text className="size-4" />
        On this page
      </h3>

      <TOCScrollArea>
        <StraightTocItems />
      </TOCScrollArea>
    </div>
  );
}

export function StraightTocMobile() {
  const items = useTOCItems();
  const trackedItems = useItems();
  const scrollBoundary = useScrollBoundary();
  const [open, setOpen] = useState(false);
  const selectedIndex =
    scrollBoundary & AT_TOP
      ? 0
      : scrollBoundary & AT_BOTTOM
        ? items.length - 1
        : trackedItems.findIndex((item) => item.active);
  const selectedItem = items[selectedIndex];
  const observedLastActiveIndex = trackedItems.reduce(
    (last, item, index) => (item.active ? index : last),
    -1,
  );
  const lastActiveIndex =
    scrollBoundary & AT_BOTTOM ? items.length - 1 : observedLastActiveIndex;
  const progress = (lastActiveIndex + 1) / Math.max(1, trackedItems.length);

  if (items.length === 0) return null;

  return (
    <div
      data-toc-popover=""
      className="sticky top-(--fd-docs-row-2) z-10 [grid-area:toc-popover] h-(--fd-toc-popover-height) xl:hidden max-xl:layout:[--fd-toc-popover-height:--spacing(10)]"
    >
      <header className="border-b bg-fd-background/80 backdrop-blur-sm">
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex h-10 w-full items-center gap-2.5 px-4 py-2.5 text-start text-sm text-fd-muted-foreground md:px-6"
        >
          <ProgressCircle value={progress} />
          <span className="flex-1 truncate transition-colors">
            {!open && selectedItem ? selectedItem.title : "On this page"}
          </span>
          <ChevronDown
            className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="max-h-[50vh] overflow-y-auto px-4 pb-4 md:px-6">
            <StraightTocItems onSelect={() => setOpen(false)} />
          </div>
        )}
      </header>
    </div>
  );
}

function ProgressCircle({ value }: { value: number }) {
  const size = 18;
  const strokeWidth = 1.5;
  const radius = size / 2 - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, value));

  return (
    <svg
      role="progressbar"
      aria-label="Page progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      viewBox={`0 0 ${size} ${size}`}
      className="size-4.5 shrink-0"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        strokeWidth={strokeWidth}
        className="stroke-current/25"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-all"
      />
    </svg>
  );
}

function StraightTocItems({ onSelect }: { onSelect?: () => void }) {
  const items = useTOCItems();
  const trackedItems = useItems();
  const scrollBoundary = useScrollBoundary();
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({
    top: 0,
    bottom: 0,
    visible: false,
  });
  const observedFirstActiveIndex = trackedItems.findIndex(
    (item) => item.active,
  );
  const observedLastActiveIndex = trackedItems.reduce(
    (last, item, index) => (item.active ? index : last),
    -1,
  );
  const firstActiveIndex =
    scrollBoundary & AT_TOP
      ? 0
      : observedFirstActiveIndex === -1 && scrollBoundary & AT_BOTTOM
        ? items.length - 1
        : observedFirstActiveIndex;
  const lastActiveIndex =
    scrollBoundary & AT_BOTTOM
      ? items.length - 1
      : observedLastActiveIndex === -1 && scrollBoundary & AT_TOP
        ? 0
        : observedLastActiveIndex;

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateIndicator = () => {
      if (firstActiveIndex === -1 || lastActiveIndex === -1) {
        setIndicator((current) => ({ ...current, visible: false }));
        return;
      }

      const first = container.querySelector<HTMLElement>(
        `[data-toc-index="${firstActiveIndex}"]`,
      );
      const last = container.querySelector<HTMLElement>(
        `[data-toc-index="${lastActiveIndex}"]`,
      );
      if (!first || !last) return;

      const top = first.offsetTop;
      const lastBottom = last.offsetTop + last.offsetHeight;
      const bottom = container.offsetHeight - lastBottom;
      setIndicator({ top, bottom, visible: true });
    };

    const observer = new ResizeObserver(updateIndicator);
    observer.observe(container);
    updateIndicator();

    return () => observer.disconnect();
  }, [firstActiveIndex, lastActiveIndex]);

  return (
    <div
      ref={containerRef}
      className="relative mt-3 flex flex-col border-s border-fd-foreground/10"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-s-px w-px bg-fd-primary transition-[top,bottom,opacity] duration-250 ease-out motion-reduce:transition-none"
        style={{
          top: indicator.top,
          bottom: indicator.bottom,
          opacity: indicator.visible ? 1 : 0,
          width: "2px",
          borderRadius: "0 4px 4px 0",
        }}
      />
      {items.map((item, index) => (
        <TOCItem
          key={item.url}
          href={item.url}
          onClick={onSelect}
          data-toc-index={index}
          data-active={
            trackedItems[index]?.active ||
            (Boolean(scrollBoundary & AT_TOP) && index === 0) ||
            (Boolean(scrollBoundary & AT_BOTTOM) && index === items.length - 1)
          }
          style={{ paddingInlineStart: itemIndent(item.depth) }}
          className="relative py-1.5 pe-2 text-sm text-fd-muted-foreground transition-colors hover:text-fd-foreground data-[active=true]:text-fd-primary"
        >
          {item.title}
        </TOCItem>
      ))}
    </div>
  );
}
