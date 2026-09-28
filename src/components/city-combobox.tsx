"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 城市输入框：**下拉可选 + 自由输入**。
 *
 * 为什么不用原生 `<input list>` + `<datalist>`：
 *   原生 datalist 的弹出列表会**按输入框里已有的值做过滤**。输入框里是「上海」时，
 *   点开只看到「上海」一项 —— 等于没有下拉。而这个过滤逻辑是浏览器实现的，改不了。
 *   所以这里自己实现一个 combobox：
 *
 *     · 刚展开时展示**全部**建议（不受当前值影响）
 *     · 一旦开始打字才按关键字过滤
 *     · 任何时候都允许输入列表里没有的城市，不会被强制改写
 *
 * 键盘操作：↑↓ 移动高亮、Enter 选中、Esc 收起、Tab 离开时自动收起。
 * 无障碍：遵循 combobox 模式（role / aria-expanded / aria-activedescendant）。
 */
export function CityCombobox({
  id,
  value,
  onChange,
  options,
  placeholder = "输入或选择",
  ariaLabel,
}: {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  /**
   * 展开后用户是否已经打过字。
   * false 时展示全部建议 —— 这正是原生 datalist 做不到的地方：
   * 输入框里已有「上海」时，点开也应该看到全部城市，而不是被过滤成只剩「上海」。
   */
  const [typing, setTyping] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const keyword = value.trim();
  const visible = typing && keyword ? options.filter((city) => city.includes(keyword)) : options;

  // 点击组件外部时收起
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // 键盘移动高亮时，把高亮项滚进可视区
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  /**
   * 展开下拉。
   *
   * @param focusFirst 键盘展开时传 true：当前值不在建议里就高亮第一项，
   *                   否则用户按了 ↓ 却看不到任何高亮，会以为「按了没反应」。
   */
  function openList(focusFirst = false) {
    setOpen(true);
    setTyping(false);
    const matched = options.indexOf(keyword);
    setActiveIndex(matched >= 0 ? matched : focusFirst && options.length > 0 ? 0 : -1);
  }

  function closeList() {
    setOpen(false);
    setTyping(false);
    setActiveIndex(-1);
  }

  function pick(city: string) {
    onChange(city);
    closeList();
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    onChange(next);
    setTyping(true);
    setOpen(true);
    // 打字时高亮第一项，方便直接按 Enter 采用；但清空时不高亮，
    // 否则用户删光内容后按 Enter 会莫名其妙选中列表里的第一个城市
    setActiveIndex(next.trim() ? 0 : -1);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openList(true);
        return;
      }
      setActiveIndex((prev) => Math.min(visible.length - 1, prev + 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        openList(true);
        return;
      }
      setActiveIndex((prev) => Math.max(0, prev - 1));
      return;
    }

    if (event.key === "Enter") {
      // 有高亮项就用高亮项；否则视为「直接采用手输的值」，只收起列表
      const target = open ? visible[activeIndex] : undefined;
      if (target) {
        event.preventDefault();
        pick(target);
      } else {
        closeList();
      }
      return;
    }

    if (event.key === "Escape") {
      closeList();
      return;
    }

    if (event.key === "Tab") {
      closeList();
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input
        id={id}
        type="text"
        className="field pr-9"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        aria-label={ariaLabel}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        // 注意这里不能用 onFocus={openList}：那样 React 会把 FocusEvent 当成
        // focusFirst 参数传进去（对象是 truthy），导致鼠标点击时也高亮第一项
        onFocus={() => openList()}
        // 输入框已经聚焦时，再点它不会再触发 focus 事件 —— 只靠 onFocus 的话
        // 「Esc 关掉后再点一下」就打不开了。所以这里补一个 click。
        onClick={() => {
          if (!open) openList();
        }}
        onKeyDown={handleKeyDown}
      />

      {/* 用按钮而不是纯图标：点它就能展开/收起，鼠标用户不必先聚焦输入框 */}
      <button
        type="button"
        tabIndex={-1}
        aria-label={open ? "收起城市列表" : "展开城市列表"}
        onClick={() => (open ? closeList() : openList())}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-600"
      >
        <ChevronDown size={15} className={cn("transition", open && "rotate-180")} />
      </button>

      {open ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-ink-200 bg-white py-1 shadow-lg"
        >
          {visible.length === 0 ? (
            <li className="px-3.5 py-2.5 text-xs leading-relaxed text-ink-400">
              建议里没有匹配的城市，可以直接用「{keyword}」
            </li>
          ) : (
            visible.map((city, index) => {
              const selected = city === keyword;
              const active = index === activeIndex;
              return (
                <li
                  key={city}
                  id={`${listId}-${index}`}
                  data-index={index}
                  role="option"
                  aria-selected={selected}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(city)}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2 text-xs transition",
                    active ? "bg-brand-50 text-brand-700" : "text-ink-700",
                  )}
                >
                  <span className="truncate">{city}</span>
                  {selected ? <Check size={13} className="shrink-0 text-brand-600" /> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
