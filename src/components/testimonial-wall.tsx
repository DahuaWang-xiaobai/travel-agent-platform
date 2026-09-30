"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Star } from "lucide-react";
import { testimonials, type Testimonial } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

/**
 * 官网评价墙：错落式瀑布流。
 *
 * 布局用 CSS multi-column（columns-*）而不是 flex 网格 ——
 * 网格会把每行强行拉成等高，评价长短不一时会留出大片空白；
 * 多列布局让每张卡按自身内容高度自然堆叠，才有「评价墙」的松弛感。
 *
 * 折叠/展开用 ref 实测是否溢出，而不是按字数猜 ——
 * 字数阈值在不同字号、不同屏宽下都会误判，要么该收的没收，
 * 要么给一段没超出的文字也挂上「展开」按钮。
 */

function TestimonialCard({ item }: { item: Testimonial }) {
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const bodyRef = useRef<HTMLQuoteElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    // 此时是折叠态，scrollHeight 是完整高度、clientHeight 是被裁剪后的高度
    setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <figure className="mb-6 break-inside-avoid rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-window">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <Star
            key={value}
            size={14}
            className={value <= item.score ? "fill-amber-400 text-amber-400" : "text-ink-200"}
          />
        ))}
      </div>

      <blockquote
        ref={bodyRef}
        className={cn(
          "mt-4 text-sm leading-relaxed text-ink-600",
          !expanded && "line-clamp-4",
        )}
      >
        {item.content}
      </blockquote>

      {needsToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-brand-600 transition hover:text-brand-700"
        >
          {expanded ? "收起" : "展开"}
          <ChevronDown size={13} className={cn("transition", expanded && "rotate-180")} />
        </button>
      ) : null}

      <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600">
          {item.name.slice(0, 1)}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-ink-800">{item.name}</span>
            <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
              {item.tag}
            </span>
          </span>
          <span className="mt-1 block truncate text-[11px] text-ink-400">
            {item.city} · {item.trip}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

export function TestimonialWall() {
  return (
    <div className="mt-14 columns-1 gap-6 sm:columns-2 lg:columns-3">
      {testimonials.map((item) => (
        <TestimonialCard key={item.id} item={item} />
      ))}
    </div>
  );
}
