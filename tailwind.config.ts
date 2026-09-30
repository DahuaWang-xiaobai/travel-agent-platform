import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /**
         * 品牌主色 #5941F5（紫）。
         * 之前是靛蓝 #4f46e5，整套换成单色紫阶，三端（官网/工作台/后台）统一。
         * 键名保持 50–900 不变，所以调用方不用改类名。
         */
        brand: {
          50: "#f3f1ff",
          100: "#eae6ff",
          200: "#d6ceff",
          300: "#b7a8ff",
          400: "#9179fb",
          500: "#7558f7",
          600: "#5941f5",
          700: "#4830d6",
          800: "#3a26ac",
          900: "#2e1e85",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#64748b",
          600: "#475569",
          700: "#334155",
          800: "#1e293b",
          900: "#0f172a",
          950: "#080f1e",
        },
        /** 官网区块底色：极浅紫，用来替代原来的网格背景 */
        canvas: "#fafafe",
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,0.04), 0 8px 24px -12px rgba(15,23,42,0.12)",
        lift: "0 2px 4px rgba(15,23,42,0.04), 0 18px 40px -18px rgba(15,23,42,0.22)",
        glow: "0 0 60px -12px rgba(89,65,245,0.55)",
        /** 官网统一卡片阴影 */
        card: "0 2px 14px rgba(0,0,0,0.06)",
        /** 官网 Demo 窗口：柔和 + 微微上浮 */
        window: "0 4px 12px rgba(15,23,42,0.05), 0 24px 60px -24px rgba(15,23,42,0.20)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)",
        /** 品牌渐变：单色紫（浅紫 → 深紫），去掉原来的多色高饱和 */
        "brand-sheen": "linear-gradient(120deg, #7c68f0 0%, #5941f5 55%, #4630c9 100%)",
        /** 首屏背景：中心极淡浅紫，向外到纯白 */
        "hero-radial":
          "radial-gradient(72% 62% at 50% 30%, rgba(89,65,245,0.10) 0%, rgba(243,241,255,0.55) 42%, rgba(255,255,255,0) 76%)",
      },
      backgroundSize: {
        grid: "44px 44px",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseRing: {
          "0%": { opacity: "0.7", transform: "scale(0.9)" },
          "70%": { opacity: "0", transform: "scale(1.6)" },
          "100%": { opacity: "0", transform: "scale(1.6)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // 右侧抽屉：面板从右滑入，遮罩淡入
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // 进度条呼吸：只改透明度，不缩放，避免宽度动画和它打架
        breathe: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.62" },
        },
        // 列表项依次浮现（配合 animationDelay 做错峰）
        riseIn: {
          "0%": { opacity: "0", transform: "translateY(5px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "pulse-ring": "pulseRing 2.4s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 2.2s linear infinite",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        breathe: "breathe 2.4s ease-in-out infinite",
        "rise-in": "riseIn 0.45s cubic-bezier(0.22,1,0.36,1) backwards",
      },
    },
  },
  plugins: [],
};

export default config;
