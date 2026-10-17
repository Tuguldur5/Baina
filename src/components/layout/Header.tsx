"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, LogIn, Menu, Plus, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { CommandSearch } from "@/components/layout/CommandSearch";
import { Container } from "@/components/layout/Container";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CreateTenderModal } from "@/components/tenders/CreateTenderModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";
import { isActivePath, cn } from "@/lib/utils";
import { getAdminUrl } from "@/lib/hosts";
import { mn } from "@/lib/i18n/mn";
import { logout } from "@/lib/actions/auth";
import { markNotificationRead } from "@/lib/actions/notifications";
import { useTheme } from "@/components/providers/ThemeProvider";
import type { Notification, TenderOwner } from "@/lib/types/index";

/**
 * Header user = the lightweight public owner shape plus the account email
 * (own menu only) and the admin flag, which only decides whether the
 * "Админ самбар" entry appears in the user menu.
 */
export type HeaderUser = TenderOwner & {
  email?: string | null;
  isAdmin?: boolean;
};

/**
 * The three primary destinations, identical for every visitor; only the
 * dashboard entry adapts (logged out it goes to the login form with `next`).
 * "Хэрхэн ажилладаг" deep-links to the how-it-works section on /about.
 *
 * NOTE: the public company directory ("Компанийн сан", /companies) was removed
 * on purpose — it had no function beyond a redirect to the owner-type filter,
 * which is reachable straight from the tenders page.
 */
function buildNavLinks(hasUser: boolean) {
  return [
    { href: "/tenders", label: mn.header.navTenders, match: "/tenders" },
    { href: "/about#how", label: mn.header.navHow, match: "/about" },
    {
      href: hasUser ? "/dashboard" : "/auth/login?next=/dashboard",
      label: mn.header.navDashboard,
      match: "/dashboard",
    },
  ] as const;
}

/** Desktop nav pills with ONE animated active highlight (layoutId). */
function NavLinks({ hasUser }: { hasUser: boolean }) {
  const pathname = usePathname();
  const links = buildNavLinks(hasUser);

  return (
    <nav aria-label={mn.header.menuLabel} className="col-start-2 row-start-1 hidden md:block">
      <ul className="flex items-center gap-0.5">
        {links.map((link) => {
          const active = isActivePath(pathname, link.match);
          return (
            <li key={link.match}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                  active ? "text-text" : "text-muted hover:text-text"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="header-nav-active"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-surface shadow-card ring-1 ring-border"
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bell + dropdown: latest 5 notifications and "Бүгдийг харах". */
function NotificationBell({
  unread,
  notifications,
  className,
}: {
  unread: number;
  notifications: Notification[];
  className?: string;
}) {
  const latest = notifications.slice(0, 5);

  return (
    <Dropdown
      panelClassName="w-80"
      className={className}
      trigger={
        <button
          type="button"
          aria-label={`${mn.header.notifications} (${unread})`}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-surface" />
          )}
        </button>
      }
    >
      <div className="px-3 py-2">
        <p className="text-sm font-semibold text-text">{mn.header.notifications}</p>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {latest.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted">
            {mn.header.notificationsEmpty}
          </p>
        ) : (
          latest.map((notification) => (
            <DropdownItem
              key={notification.id}
              href={notification.link ?? "/dashboard/notifications"}
              onClick={() => void markNotificationRead(notification.id)}
            >
              <span className="flex items-start gap-2">
                {!notification.read && (
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500"
                    aria-hidden="true"
                  />
                )}
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span
                    className={cn(
                      "text-sm",
                      notification.read
                        ? "font-medium text-muted"
                        : "font-semibold text-text"
                    )}
                  >
                    {notification.title}
                  </span>
                  <span className="line-clamp-2 text-xs text-muted">
                    {notification.body}
                  </span>
                </span>
              </span>
            </DropdownItem>
          ))
        )}
      </div>
      <DropdownSeparator />
      <DropdownItem href="/dashboard/notifications">
        {mn.header.viewAllNotifications}
      </DropdownItem>
    </Dropdown>
  );
}

/** Role chip: green for individuals, blue for companies (brand accents). */
function RoleBadge({ role }: { role: "user" | "company" }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
        role === "company"
          ? "bg-info-50 text-info-700 dark:bg-info-950 dark:text-info-300"
          : "bg-accent-50 text-accent-700 dark:bg-accent-950 dark:text-accent-300"
      )}
    >
      {role === "company" ? mn.roles.company : mn.roles.user}
    </span>
  );
}

/**
 * The ONE header on every public page: a floating glass bar (`.glass-header`)
 * at `top-3` whose width equals the shared `Container`, 56px tall and
 * shrinking to 52px once you scroll past 8px. Implemented with `position:
 * fixed` (the "sticky" look) — content offset lives in (site)/layout.tsx so
 * nothing jumps. No page-specific variants: home looks like every other page.
 *
 * z-index scale: header z-40, panels z-50, chat z-[55], modals z-[60],
 * toasts z-[70].
 */
export function Header({
  user,
  unread = 0,
  notifications = [],
}: {
  user: HeaderUser | null;
  unread?: number;
  notifications?: Notification[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile panel on navigation.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // 56px -> 52px after 8px of scroll (same value on server and first render,
  // so hydration never mismatches — the listener attaches after mount).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handlePostTender = () => {
    if (!user) {
      router.push("/auth/login?next=/tenders/new");
      return;
    }
    // Full page form on small screens, modal from the header on desktop.
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      router.push("/tenders/new");
      return;
    }
    setCreateOpen(true);
  };

  const displayName = user ? (user.companyName ?? user.name) : "";

  return (
    <>
      <header className="fixed inset-x-0 top-3 z-40">
        <Container>
          <div
            className={cn(
              "glass-header grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-full px-2 transition-[height] duration-300 ease-out sm:gap-3 sm:px-2.5",
              scrolled ? "h-[52px]" : "h-14"
            )}
          >
            {/* Brand */}
            <Link
              href="/"
              className="col-start-1 row-start-1 flex shrink-0 items-center gap-2 justify-self-start rounded-full pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label={mn.brand.name}
            >
              <Logo
                vertical="tender"
                variant={theme === "dark" ? "dark" : "light"}
                size={32}
                textClassName="hidden sm:inline-flex"
              />
            </Link>

            <NavLinks hasUser={Boolean(user)} />

            {/* Right cluster */}
            <div className="col-start-3 row-start-1 flex items-center gap-1 justify-self-end sm:gap-1.5">
              <CommandSearch />

              <span className="hidden sm:block">
                <ThemeToggle />
              </span>

              {user && (
                <NotificationBell
                  unread={unread}
                  notifications={notifications}
                  className="hidden sm:block"
                />
              )}

              <Button
                size="sm"
                onClick={handlePostTender}
                aria-label={mn.header.postTender}
                className="h-9 min-h-0 px-2.5 text-xs sm:px-3.5"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{mn.header.postTender}</span>
              </Button>

              {user ? (
                <Dropdown
                  className="hidden sm:block"
                  panelClassName="w-64"
                  trigger={
                    <button
                      type="button"
                      aria-label={mn.header.userMenu}
                      aria-haspopup="menu"
                      className="flex h-9 items-center gap-1 rounded-full bg-surface/80 pl-1 pr-1.5 ring-1 ring-border transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <Avatar src={user.avatarUrl} name={displayName} size="sm" />
                      <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                    </button>
                  }
                >
                  {/* User block: avatar, name, role badge, email */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar src={user.avatarUrl} name={displayName} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text">
                        {displayName}
                      </p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5">
                        <RoleBadge role={user.role} />
                        {user.email && (
                          <span className="min-w-0 truncate text-xs text-muted">
                            {user.email}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <DropdownSeparator />
                  <DropdownItem href="/dashboard">{mn.header.navDashboard}</DropdownItem>
                  <DropdownItem href="/dashboard/profile">{mn.header.profile}</DropdownItem>
                  {/* Absolute URL: the admin panel is a different host (and a
                      separate session) — see src/lib/hosts.ts. */}
                  {user.isAdmin && (
                    <DropdownItem href={getAdminUrl("/")}>{mn.admin.title}</DropdownItem>
                  )}
                  {/* Theme row — only visible on small screens (phones use the
                      hamburger panel; desktop has the toggle in the bar). */}
                  <div className="md:hidden">
                    <DropdownSeparator />
                    <div className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-sm text-text">{mn.header.themeLabel}</span>
                      <ThemeToggle />
                    </div>
                  </div>
                  <DropdownSeparator />
                  <DropdownItem danger onClick={() => void logout()}>
                    {mn.header.logout}
                  </DropdownItem>
                </Dropdown>
              ) : (
                <Link href="/auth/login" className="hidden sm:inline-flex">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 min-h-0 border-black/5 bg-white px-4 text-xs text-navy shadow-card hover:bg-white/90 dark:border-white/10"
                  >
                    <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                    {mn.header.login}
                  </Button>
                </Link>
              )}

              {/* Hamburger (mobile/tablet only) */}
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? mn.header.closeMenu : mn.header.openMenu}
                aria-expanded={menuOpen}
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={menuOpen ? "close" : "menu"}
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-surface text-text ring-1 ring-border"
                  >
                    {menuOpen ? (
                      <X className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Menu className="h-4 w-4" aria-hidden="true" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </button>
            </div>
          </div>
        </Container>

        {/* Mobile expanded panel */}
        <AnimatePresence>
          {menuOpen && (
            <MobileMenu
              onClose={() => setMenuOpen(false)}
              user={user}
              unread={unread}
              onPostTender={handlePostTender}
            />
          )}
        </AnimatePresence>
      </header>

      <CreateTenderModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </>
  );
}

/**
 * Animated GLASS rounded-3xl panel below the bar on mobile/tablet (<768px).
 * Closes on route change / outside click / Esc, locks body scroll and traps
 * focus while open.
 */
function MobileMenu({
  onClose,
  user,
  unread,
  onPostTender,
}: {
  onClose: () => void;
  user: HeaderUser | null;
  unread: number;
  onPostTender: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const pathname = usePathname();
  const links = buildNavLinks(Boolean(user));

  // NOTE: closing on route change is handled ONCE at the header level (its
  // pathname effect) — doing it here too would fire on every parent re-render
  // (new onClose identity) and instantly close the panel.

  // Body scroll lock + focus trap + Esc + outside click.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    }, 80);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        "a[href], button:not([disabled])",
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) onClose();
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousedown", onPointerDown);
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={mn.header.menuLabel}
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="glass-header absolute inset-x-0 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl p-4 md:hidden"
    >
      <nav aria-label={mn.header.menuLabel}>
        <ul className="flex flex-col gap-0.5">
          {links.map((link) => {
            const active = isActivePath(pathname, link.match);
            return (
              <li key={link.match}>
                <Link
                  href={link.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-tap items-center rounded-2xl px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
                    active
                      ? "bg-surface text-text shadow-card ring-1 ring-border"
                      : "text-muted hover:bg-surface/70 hover:text-text"
                  )}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
        {user ? (
          <>
            <Link
              href="/dashboard/notifications"
              onClick={onClose}
              className="flex min-h-tap items-center justify-between rounded-2xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface/70 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" aria-hidden="true" />
                {mn.header.notifications}
              </span>
              {unread > 0 && (
                <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-navy">
                  {unread}
                </span>
              )}
            </Link>

            <Button fullWidth onClick={onPostTender} className="mt-1 h-11">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {mn.header.postTender}
            </Button>

            <Link
              href="/dashboard/profile"
              onClick={onClose}
              className="flex min-h-tap items-center rounded-2xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface/70 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {mn.header.profile}
            </Link>

            {/* Absolute URL: the admin panel is a different host. */}
            {user.isAdmin && (
              <Link
                href={getAdminUrl("/")}
                onClick={onClose}
                className="flex min-h-tap items-center rounded-2xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface/70 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {mn.admin.title}
              </Link>
            )}

            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-tap items-center rounded-2xl px-4 text-sm font-semibold text-muted transition-colors hover:bg-surface/70 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {mn.header.logout}
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/login" onClick={onClose}>
              <Button
                fullWidth
                variant="secondary"
                className="h-11 border-black/5 bg-white text-navy hover:bg-white/90 dark:border-white/10"
              >
                <LogIn className="h-4 w-4" aria-hidden="true" />
                {mn.header.login}
              </Button>
            </Link>
            <Link href="/auth/register" onClick={onClose}>
              <Button fullWidth className="h-11">
                {mn.header.register}
              </Button>
            </Link>
          </>
        )}

        <div className="mt-1 flex items-center justify-between rounded-2xl px-4 py-1.5">
          <span className="text-sm font-semibold text-muted">{mn.header.themeLabel}</span>
          <ThemeToggle />
        </div>
      </div>
    </motion.div>
  );
}
