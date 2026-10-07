"use client";

import {
  ArrowRight,
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  Headphones,
  LogOut,
  LockKeyhole,
  Menu,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth";
import { Brand } from "./brand";
import { ThemeToggle } from "./theme-toggle";
import {adminNav, platformNav, type PlatformNavItem } from "./platform-nav";
// import { adminNav, platformNav } from "./platform-nav";
import { billingApi, type BillingSummary } from "@/lib/billing/api";
import { capabilitiesApi, type Capabilities } from "@/lib/billing/capabilities";

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function isActive(pathname: string, href: string) {
  if (href === "#") return false;
  if (href === "/platform") return pathname === "/platform";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SearchItem = PlatformNavItem & { keywords?: string[] };

const EXTRA_SEARCH_ITEMS: SearchItem[] = [
  {
    label: "Settings",
    href: "/platform/settings",
    icon: Settings,
    keywords: ["account", "password", "profile"],
  },
];

function matchesQuery(item: SearchItem, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    item.label,
    item.href,
    ...(item.keywords ?? []),
    item.beta ? "beta" : "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // const { ready, isAuthenticated, displayName, logout } = useAuth();
  // const [sidebarOpen, setSidebarOpen] = useState(false);
  // const [profileOpen, setProfileOpen] = useState(false);
  // const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { ready, isAuthenticated, displayName, logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchItems = useMemo<SearchItem[]>(
    () => [...platformNav, ...EXTRA_SEARCH_ITEMS],
    [],
  );

  const filteredSearch = useMemo(
    () => searchItems.filter((item) => matchesQuery(item, searchQuery)),
    [searchItems, searchQuery],
  );

  const openSearch = useCallback(() => {
    setSearchOpen(true);
    setSearchQuery("");
    setActiveIndex(0);
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
    setActiveIndex(0);
  }, []);

  const goToSearchItem = useCallback(
    (item: SearchItem) => {
      if (!item.href || item.href === "#") return;
      closeSearch();
      setSidebarOpen(false);
      router.push(item.href);
    },
    [closeSearch, router],
  );

  useEffect(() => {
    if (ready && !isAuthenticated) logout(true);
  }, [ready, isAuthenticated, logout]);

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    closeSearch();
  }, [pathname, closeSearch]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void billingApi.summary().then(setBillingSummary).catch(() => setBillingSummary(null));
  }, [ready, isAuthenticated, pathname]);

  useEffect(() => {
    if (!ready || !isAuthenticated) return;
    void capabilitiesApi.get().then(setCapabilities).catch(() => setCapabilities(null));
  }, [ready, isAuthenticated]);

  useEffect(() => {
    if (!profileOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isModK =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isModK) {
        event.preventDefault();
        if (searchOpen) closeSearch();
        else openSearch();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [searchOpen, openSearch, closeSearch]);

  useEffect(() => {
    if (!searchOpen) return;
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [searchOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="grid h-screen place-items-center bg-bg">
        <span className="inline-block h-[18px] w-[18px] animate-[spin_.7s_linear_infinite] rounded-full border-2 border-border border-t-brand" />
      </div>
    );
  }

  const modKeyLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)
      ? "⌘"
      : "Ctrl";

  return (
    <div className="flex min-h-screen bg-platform">
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-30 flex h-screen w-[238px] flex-col overflow-hidden border-r border-[#f1ede7] bg-sidebar px-3.5 transition-transform duration-250 max-[1050px]:w-[210px] max-[820px]:-translate-x-full",
          sidebarOpen && "max-[820px]:translate-x-0",
        )}
      >
        <div className="flex h-[68px] items-center px-2 [&_img]:w-[135px] [&_img]:h-auto">
          <Brand href="/platform" />
          <button
            type="button"
            className="ml-auto hidden border-0 bg-transparent text-muted max-[820px]:block"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <nav className="grid gap-1">
          {platformNav
            .filter((item) => user?.role === "superAdmin" ? item.adminOnly : !item.adminOnly)
            .map((item) => {
            const active = isActive(pathname, item.href);
            const locked = Boolean(item.capability && capabilities && !capabilities.capabilities[item.capability]);
            const className = cx(
              "relative flex h-[39px] items-center gap-[11px] rounded-lg border-0 px-[11px] text-left text-[12px] font-semibold text-muted transition-colors hover:bg-brand-soft hover:text-text",
              active &&
                "bg-nav-active text-text before:absolute before:-left-3.5 before:h-[22px] before:w-[3px] before:rounded-r before:bg-brand [&_svg]:text-accent",
            );
            const content = (
              <>
                <item.icon size={18} />
                {item.label}
                {item.beta && (
                  <span className="ml-auto rounded border border-brand-border px-1 py-0.5 text-[12px] text-accent">
                    BETA
                  </span>
                )}
              </>
            );
            return item.href === "#" ? (
              <button type="button" key={item.label} className={className}>
                {content}
              </button>
            ) : (
              <Link key={item.label} href={item.href} className={className} title={locked ? `${item.label} is not included in your current plan` : undefined}>
                {content}
                {locked && <LockKeyhole size={12} className="ml-auto text-warning" />}
              </Link>
            );
            })}
          </nav>

          {user?.role === "superAdmin" && (
            <div className="mt-5 border-t border-brand-border pt-4">
            <p className="px-[11px] pb-2 text-[8px] font-bold uppercase tracking-[0.16em] text-muted">
              Admin modules
            </p>
            <nav className="grid gap-1">
              {adminNav.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cx(
                      "relative flex h-[34px] items-center gap-[11px] rounded-lg px-[11px] text-[10px] font-semibold text-muted transition-colors hover:bg-brand-soft hover:text-text",
                      active && "bg-nav-active text-text [&_svg]:text-accent",
                    )}
                  >
                    <item.icon size={16} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            </div>
          )}
        </div>

        <div className="mt-3 flex shrink-0 flex-col gap-2 pb-3">
          {user?.role !== "superAdmin" && (
            <div className="rounded-[10px] border border-brand-border bg-[linear-gradient(145deg,var(--theme-surface-raised),var(--theme-surface))] p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-accent">
                <Sparkles size={14} /> Credit balance
              </div>
              <strong className="mt-2.5 mb-2 block text-[13px] leading-5 font-semibold text-text">
                {billingSummary
                  ? `${billingSummary.balanceCredits.toLocaleString()} credits left`
                  : "Loading credits…"}
              </strong>
              {billingSummary && billingSummary.balanceCredits <= 0 && (
                <p className="mb-2 text-[10px] leading-4 text-warning">
                  Credits exhausted · recharge to continue
                </p>
              )}
              <span className="block h-1.5 overflow-hidden rounded-full bg-brand-soft">
                <i
                  className="block h-full bg-[linear-gradient(90deg,var(--color-brand-a),var(--color-brand-b))]"
                  style={{
                    width: `${
                      billingSummary
                        ? Math.min(
                            100,
                            Math.max(
                              0,
                              (billingSummary.balanceCredits /
                                Math.max(1, billingSummary.initialCredits)) *
                                100,
                            ),
                          )
                        : 0
                    }%`,
                  }}
                />
              </span>
              {/* <Link
                href="/platform/plans?kind=service"
                className="mt-2 flex items-center gap-1 border-0 bg-transparent p-0 pt-2 text-[10px] font-medium text-muted hover:text-text"
              >
                View plans <ArrowRight size={14} />
              </Link>
              <Link
                href="/platform/plans?kind=wallet_topup"
                className="flex items-center gap-1 p-0 text-[8px] text-muted hover:text-text"
              >
                Recharge wallet <ArrowRight size={14} />
              </Link> */}
            </div>
          )}

          <div ref={profileRef} className="relative">
            {profileOpen && (
              <div className="absolute right-0 bottom-[calc(100%+8px)] left-0 z-40 overflow-hidden rounded-xl border border-brand-border bg-brand-soft py-1.5 shadow-[0_16px_40px_rgba(0,0,0,.45)]">
                <Link
                  href="/platform/subscriptions"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-text transition-colors hover:bg-brand-soft"
                  onClick={() => setProfileOpen(false)}
                >
                  <CreditCard size={16} className="text-muted" />
                  My plan
                </Link>
                <Link
                  href="/platform/settings"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-text transition-colors hover:bg-brand-soft"
                  onClick={() => setProfileOpen(false)}
                >
                  <Settings size={16} className="text-muted" />
                  Settings
                </Link>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-text transition-colors hover:bg-brand-soft"
                  onClick={() => setProfileOpen(false)}
                >
                  <Headphones size={16} className="text-muted" />
                  Support
                </button>
                <div className="my-1 border-t border-brand-border" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[12px] font-medium text-danger transition-colors hover:bg-brand-soft"
                  onClick={() => logout(true)}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}

            <button
              type="button"
              aria-expanded={profileOpen}
              aria-haspopup="menu"
              onClick={() => setProfileOpen((open) => !open)}
              className={cx(
                "flex w-full items-center gap-2.5 rounded-xl border border-brand-border bg-brand-soft px-2.5 py-2 text-left transition-colors hover:bg-brand-soft",
                profileOpen && "bg-brand-soft",
              )}
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[12px] font-semibold text-text">
                {displayName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-text">
                  {displayName}
                </span>
                <span className="mt-0.5 block truncate text-[9px] text-accent">
                  {capabilities?.plan
                    ? capabilities.plan.replace(/_/g, " ")
                    : "Loading plan…"}
                </span>
              </span>
              <ChevronDown
                size={15}
                className={cx(
                  "shrink-0 text-muted transition-transform",
                  profileOpen && "rotate-180",
                )}
              />
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[25] hidden border-0 bg-theme-overlay max-[820px]:block"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        />
      )}

      <section className="min-h-screen w-[calc(100%-238px)] ml-[238px] max-[1050px]:ml-[210px] max-[1050px]:w-[calc(100%-210px)] max-[820px]:ml-0 max-[820px]:w-full">
        <header className="sticky top-0 z-[15] flex h-[68px] items-center justify-between border-b border-[#f1ede7] bg-theme-header px-7 backdrop-blur-[12px] max-[820px]:px-[17px]">
          <div className="flex items-center">
            <button
              type="button"
              className="mr-1.5 hidden h-[34px] w-[34px] place-items-center border-0 bg-transparent text-muted max-[820px]:grid"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu />
            </button>
            <button
              type="button"
              onClick={openSearch}
              className="flex h-[34px] w-[250px] cursor-text items-center gap-2 rounded-lg border border-brand-border bg-brand-soft px-2.5 text-left text-[12px] text-muted transition-colors hover:border-brand-border max-[560px]:hidden"
            >
              <Search size={16} className="shrink-0 text-muted" />
              <span className="flex-1 truncate">Search pages…</span>
              <kbd className="ml-auto rounded border border-brand-border px-1.5 py-0.5 text-[12px] text-muted">
                {modKeyLabel} K
              </kbd>
            </button>
            <button
              type="button"
              onClick={openSearch}
              className="mr-1 hidden h-[34px] w-[34px] place-items-center border-0 bg-transparent text-muted max-[560px]:grid"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle compact />
            <button
              type="button"
              className="grid h-[33px] w-[33px] place-items-center border-0 bg-transparent text-muted max-[560px]:hidden"
            >
              <CircleHelp size={19} />
            </button>
            <button
              type="button"
              className="relative grid h-[33px] w-[33px] place-items-center border-0 bg-transparent text-muted"
            >
              <Bell size={19} />
              <i className="absolute top-[5px] right-[7px] h-[5px] w-[5px] rounded-full border border-brand-border bg-brand" />
            </button>
          </div>
        </header>

        <div className="mx-auto w-[min(1560px,calc(100%-60px))] py-10 pb-16 max-[820px]:w-[calc(100%-34px)] max-[560px]:pt-7">
          {children}
        </div>
      </section>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-theme-overlay px-4 pt-[12vh]">
          <button
            type="button"
            className="absolute inset-0 border-0 bg-transparent"
            aria-label="Close search"
            onClick={closeSearch}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Search pages"
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-brand-border bg-brand-soft shadow-[0_24px_60px_rgba(0,0,0,.55)]"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closeSearch();
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((i) =>
                  filteredSearch.length
                    ? Math.min(i + 1, filteredSearch.length - 1)
                    : 0,
                );
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const item = filteredSearch[activeIndex];
                if (item) goToSearchItem(item);
              }
            }}
          >
            <div className="flex items-center gap-2 border-b border-brand-border px-4 py-3">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pages…"
                className="h-9 w-full border-0 bg-transparent text-[14px] text-text outline-none placeholder:text-muted"
              />
              <kbd className="rounded border border-brand-border px-1.5 py-0.5 text-[11px] text-muted">
                Esc
              </kbd>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2">
              {filteredSearch.length === 0 ? (
                <p className="px-3 py-6 text-center text-[13px] text-muted">
                  No matching pages.
                </p>
              ) : (
                filteredSearch.map((item, index) => {
                  const disabled = !item.href || item.href === "#";
                  const active = index === activeIndex;
                  return (
                    <button
                      key={`${item.label}-${item.href}`}
                      type="button"
                      disabled={disabled}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => goToSearchItem(item)}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] transition-colors",
                        active
                          ? "bg-brand-soft text-text"
                          : "text-text hover:bg-brand-soft",
                        disabled && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <item.icon size={17} className="shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {item.label}
                      </span>
                      {item.beta && (
                        <span className="rounded border border-brand-border px-1 py-0.5 text-[11px] text-accent">
                          BETA
                        </span>
                      )}
                      {disabled ? (
                        <span className="text-[11px] text-muted">Soon</span>
                      ) : (
                        <span className="truncate text-[11px] text-muted">
                          {item.href}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
