"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, LogIn, Menu, Plus, X } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { CreateTenderModal } from "@/components/tenders/CreateTenderModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import {
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from "@/components/ui/Dropdown";
import { isActivePath } from "@/lib/utils";
import { mn } from "@/lib/i18n/mn";
import { logout } from "@/lib/actions/auth";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications";
import type { Notification, TenderOwner } from "@/lib/types/index";

/**
 * The two primary destinations. The old "Компанийн сан" item was a query
 * variant of /tenders (`?owner=company`) and only confused people — filtering
 * by owner now happens on the tenders page itself (Ангилал / Зарлагч filters).
 */
const NAV_LINKS = [
  { href: "/tenders", label: mn.header.navTenders, exact: false },
  {
    href: "/dashboard?tab=tenders",
    label: mn.header.navMyTenders,
    exact: false,
  },
] as const;

function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label={mn.header.menuLabel} className="col-start-2 row-start-1 hidden md:block">
      <ul className="flex items-center gap-0.5">
        {NAV_LINKS.map((link) => {
          const active = isActivePath(pathname, link.href.split("?")[0]);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                  active ? "text-white" : "text-white/65 hover:text-white"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="header-nav-active"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-white/15 ring-1 ring-white/10"
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

function NotificationBell({
  unread,
  notifications,
}: {
  unread: number;
  notifications: Notification[];
}) {
  return (
    <Dropdown
      dark
      panelClassName="w-80"
      trigger={
        <button
          type="button"
          aria-label={`${mn.header.notifications} (${unread})`}
          className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unread > 0 && (
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary-500 ring-2 ring-navy" />
          )}
        </button>
      }
    >
      <div className="px-3 py-2">
        <p className="text-sm font-semibold text-white">
          {mn.header.notifications}
        </p>
      </div>
      <div className="max-h-72 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-white/60">
            {mn.header.notificationsEmpty}
          </p>
        ) : (
          notifications.map((notification) => (
            <DropdownItem
              key={notification.id}
              dark
              href={notification.link ?? "/dashboard?tab=notifications"}
              onClick={() => void markNotificationRead(notification.id)}
            >
              <span className="flex flex-col gap-0.5">
                <span
                  className={`text-sm font-medium ${notification.read ? "text-white/70" : "text-white"}`}
                >
                  {notification.title}
                </span>
                <span className="line-clamp-2 text-xs text-white/50">
                  {notification.body}
                </span>
              </span>
            </DropdownItem>
          ))
        )}
      </div>
      <DropdownSeparator dark />
      <DropdownItem dark onClick={() => void markAllNotificationsRead()}>
        {mn.dashboard.notifications.markAllRead}
      </DropdownItem>
      <DropdownItem dark href="/dashboard?tab=notifications">
        {mn.header.viewAll}
      </DropdownItem>
    </Dropdown>
  );
}

/**
 * Compact floating navy pill header (sticky at top-3, max-w-6xl, 56px).
 * No search here — the search lives in the hero (see components/landing/Hero).
 * z-40 — dropdown/panel z-50, modals z-[60], toasts z-[70].
 */
export function Header({
  user,
  unread = 0,
  notifications = [],
}: {
  user: TenderOwner | null;
  unread?: number;
  notifications?: Notification[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

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

  const initials = user
    ? (user.companyName ?? user.name).trim().slice(0, 1).toUpperCase()
    : "?";

  /**
   * On the home page the hero runs behind the header (see components/landing/Hero),
   * so the bar turns into a translucent navy glass: the aurora shows through and
   * the two surfaces read as one. On every other page the bar stays solid, where
   * there is no coloured surface behind it to blend with.
   */
  const blended = pathname === "/";

  return (
    <>
      <header className="fixed inset-x-0 top-3 z-40 px-3 sm:px-5">
        <div
          className={`mx-auto grid h-14 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-full px-2 ring-1 sm:gap-3 sm:px-2.5 ${blended ? "bg-navy/75 backdrop-blur-xl ring-white/15" : "bg-navy ring-white/10"}`}
          style={{ boxShadow: "0 8px 24px -14px rgb(15 23 42 / 0.55)" }}
        >
          {/* Brand */}
          <Link
            href="/"
            className="col-start-1 row-start-1 flex shrink-0 items-center gap-2 justify-self-start rounded-full pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label={mn.brand.name}
          >
            <Logo
              vertical="tender"
              variant="dark"
              size={32}
              textClassName="hidden sm:inline-flex"
            />
          </Link>

          <NavLinks />

          {/* Right cluster */}
          <div className="col-start-3 row-start-1 flex items-center gap-1 justify-self-end sm:gap-1.5">
            <span className="hidden sm:block">
              <ThemeToggle />
            </span>

            {user ? (
              <>
                <NotificationBell
                  unread={unread}
                  notifications={notifications}
                />

                <Button
                  size="sm"
                  onClick={handlePostTender}
                  className="hidden h-9 min-h-0 px-3.5 text-xs sm:inline-flex"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {mn.header.postTender}
                </Button>

                <Dropdown
                  dark
                  trigger={
                    <button
                      type="button"
                      aria-label={mn.header.userMenu}
                      aria-haspopup="menu"
                      className="flex h-9 items-center gap-1 rounded-full bg-white/10 pl-1 pr-1.5 text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                    >
                      <Avatar
                        src={user.avatarUrl}
                        name={user.companyName ?? user.name}
                        size="sm"
                      />
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  }
                >
                  <div className="flex items-center gap-2 px-3 py-2">
                    <span className="text-sm font-semibold text-white">
                      {user.companyName ?? user.name}
                    </span>
                    <span className="rounded-full bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-navy">
                      {initials}
                    </span>
                  </div>
                  <DropdownSeparator dark />
                  <DropdownItem dark href="/dashboard?tab=profile">
                    {mn.header.profile}
                  </DropdownItem>
                  <DropdownItem dark href="/dashboard?tab=tenders">
                    {mn.header.myTenders}
                  </DropdownItem>
                  <DropdownItem dark href="/dashboard?tab=proposals">
                    {mn.header.myProposals}
                  </DropdownItem>
                  <DropdownItem dark href="/dashboard?tab=notifications">
                    {mn.header.notifications}
                  </DropdownItem>
                  <DropdownSeparator dark />
                  <DropdownItem dark danger onClick={() => void logout()}>
                    {mn.header.logout}
                  </DropdownItem>
                </Dropdown>
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="hidden h-9 min-h-0 border-transparent bg-white px-4 text-xs text-navy hover:bg-white/90 sm:inline-flex"
                  >
                    <LogIn className="h-3.5 w-3.5" aria-hidden="true" />
                    {mn.header.login}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={handlePostTender}
                  className="h-9 min-h-0 px-3.5 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  {mn.header.postTender}
                </Button>
              </>
            )}

            {/* Hamburger (mobile only) */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? mn.header.closeMenu : mn.header.openMenu}
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 md:hidden"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={menuOpen ? "close" : "menu"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-navy"
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

        {/* Mobile expanded panel */}
        <AnimatePresence>
          {menuOpen && (
            <MobileMenu
              onClose={() => setMenuOpen(false)}
              user={user}
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

/** Dark rounded-3xl panel that drops below the bar on mobile (<768px). */
function MobileMenu({
  onClose,
  user,
  onPostTender,
}: {
  onClose: () => void;
  user: TenderOwner | null;
  onPostTender: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Body scroll lock + focus trap + Esc.
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
      className="absolute inset-x-0 top-full z-50 mt-2 rounded-3xl bg-navy p-5 ring-1 ring-white/10 md:hidden"
      style={{ boxShadow: "0 20px 50px -20px rgb(15 23 42 / 0.6)" }}
    >
      <nav aria-label={mn.header.menuLabel}>
        <ul className="flex flex-col items-center gap-1 text-center">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                className="flex min-h-tap items-center justify-center rounded-full px-6 text-base font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
        {user ? (
          <>
            <Button fullWidth onClick={onPostTender} className="h-11">
              <Plus className="h-4 w-4" aria-hidden="true" />
              {mn.header.postTender}
            </Button>
            <Link href="/dashboard?tab=profile" onClick={onClose}>
              <Button
                fullWidth
                variant="secondary"
                className="h-11 border-white/15 bg-white/10 text-white hover:bg-white/15"
              >
                {mn.header.profile}
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-tap w-full items-center justify-center rounded-full text-sm font-semibold text-white/70 transition-colors hover:bg-white/10 hover:text-white"
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
                className="h-11 border-transparent bg-white text-navy hover:bg-white/90"
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
        <div className="flex justify-center pt-1">
          <ThemeToggle />
        </div>
      </div>
    </motion.div>
  );
}
