"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "首页" },
  { href: "/brief", label: "活动简报" },
  { href: "/results", label: "策略结果" },
  { href: "/evaluation", label: "质量评估" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-semibold text-white">
              CP
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight text-slate-900">
                CampaignPilot
              </span>
              <span className="hidden text-xs text-slate-500 sm:block">
                AI Marketing Campaign Copilot
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active
                      ? "bg-violet-50 font-medium text-violet-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                  aria-current={active ? "page" : undefined}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            className="rounded-lg border border-line px-3 py-2 text-sm text-slate-700 md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            {open ? "关闭菜单" : "菜单"}
          </button>
        </div>
        {open ? (
          <nav id="mobile-nav" className="border-t border-line px-4 py-3 md:hidden">
            <div className="grid gap-1">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active ? "bg-violet-50 font-medium text-violet-700" : "text-slate-700"
                  }`}
                >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs leading-5 text-slate-500 sm:px-6">
        CampaignPilot 可以生成本地 Demo，也可以在服务器上调用 DeepSeek。评分来自固定规则，不代表真实营销效果。
      </footer>
    </div>
  );
}
