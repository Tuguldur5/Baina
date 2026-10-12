import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Menu, Settings, Users, Company, ChartBar, Folder, Bell, LogOut, Mail, CheckCircle, X, Shield, Palette, MessageCircle, FolderOpen, Home, Search, BellOff, LogOut as LogOutIcon, Users2, LayoutDashboard, Monitor } from 'lucide-react';

interface AdminSidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  activeSubSection?: string;
  setActiveSubSection?: (subSection: string) => void;
}

/**
 * Admin sidebar component.
 * Freebuff-inspired structure with icon rail + secondary sidebar + collapsible behavior.
 * Scoped to the .admin-theme class.
 */
export function AdminSidebar({ activeSection, setActiveSection, activeSubSection, setActiveSubSection }: AdminSidebarProps) {
  const sections = [
    { key: 'overview', label: 'Хянах самбар', icon: Home, href: '/admin' },
    { key: 'tenders', label: 'Тендер', icon: FolderOpen, href: '/admin/tenders' },
    { key: 'proposals', label: 'Хэрэглэгчийн санал', icon: MessageCircle, href: '/admin/proposals' },
    { key: 'users', label: 'Хэрэглэгч', icon: Users2, href: '/admin/users' },
    { key: 'companies', label: 'Эрүүл мэндийн компания', icon: Company, href: '/admin/companies' },
    { key: 'reports', label: 'Мэдэгдэл/Гомдол', icon: Bell, href: '/admin/reports' },
    { key: 'categories', label: 'Талбай', icon: Palette, href: '/admin/categories' },
    { key: 'settings', label: 'Систем', icon: Settings, href: '/admin/settings' },
  ];

  return (
    <nav
      className="admin-sidebar flex h-full w-64 flex-shrink-0 bg-white border-r border-admin-border overflow-y-auto scrollbar-hide sm:scrollbar-auto"
      aria-label="Main navigation"
    >
      <div className="h-16 border-b border-admin-border px-3 py-2 flex items-center justify-between">
        <Link
          href="/admin"
          className="flex items-center gap-2 text-admin-text font-medium text-sm hover:text-admin-primary transition-colors"
          aria-label="Тендер байна холбоос"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="3" x2="21" y2="21" />
            <line x1="3" y1="21" x2="21" y2="3" />
          </svg>
          <span>Тендер байна</span>
        </Link>
        <button
          className="p-1 rounded-md hover:bg-admin-surface-2 transition-colors"
          aria-label="Зүүн хасах"
        >
          <svg
            className="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <ul className="space-y-1 px-3 py-4">
        {sections.map((section) => {
          const isActive = activeSection === section.key;
          
          return (
            <li key={section.key} className="group rounded-md p-2.5 text-sm text-admin-muted hover:text-admin-primary hover:bg-admin-surface-2 transition-all" aria-current="page" onClick={() => setActiveSection(section.key)}>
              <Link
                href={section.href}
                className="flex items-center gap-2 w-full rounded-md p-1.5 text-admin-text hover:text-admin-primary transition-colors"
                onClick={() => setActiveSection(section.key)}
              >
                <section.icon
                  className={`w-4 h-4 ${isActive ? 'text-admin-primary' : 'text-admin-muted'}`}
                />
                <span>{section.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto pt-4 border-t border-admin-border px-3">
        <div className="text-center text-xs text-admin-muted mb-2">
          Админ хэсэг
        </div>
        <Link
          href="/admin/system"
          className="w-full rounded-md px-2 py-1.5 text-xs text-admin-muted hover:text-admin-primary hover:bg-admin-surface-2 transition-colors flex items-center gap-2"
          aria-label="Хүснэтлийн удирдлага"
        >
          <Settings className="w-3 h-3" />
          <span>Систем</span>
        </Link>
      </div>
    </nav>
  );
}
