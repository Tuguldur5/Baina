import {
  Briefcase,
  Cpu,
  GraduationCap,
  HardHat,
  HeartPulse,
  Shapes,
  ShoppingCart,
  Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Single source of truth for how a tender category is drawn: one icon and one
 * two-stop gradient built only from existing design tokens (no raw hex), so the
 * same identity is used by the landing category tiles and the tender cards.
 */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Барилга: HardHat,
  Технологи: Cpu,
  Тээвэр: Truck,
  Худалдаа: ShoppingCart,
  Үйлчилгээ: Briefcase,
  Боловсрол: GraduationCap,
  'Эрүүл мэнд': HeartPulse,
  Бусад: Shapes,
};

export const CATEGORY_GRADIENTS: Record<string, string> = {
  Барилга: 'from-primary-400 to-primary-600',
  Технологи: 'from-info-400 to-info-600',
  Тээвэр: 'from-brand-classified to-info-500',
  Худалдаа: 'from-brand-jobs to-info-500',
  Үйлчилгээ: 'from-accent-400 to-accent-600',
  Боловсрол: 'from-info-500 to-brand-jobs',
  'Эрүүл мэнд': 'from-accent-500 to-brand-classified',
  Бусад: 'from-muted to-text',
};

/** Fallback icon for a category the seed data doesn't know about. */
export function categoryIcon(category: string): LucideIcon {
  return CATEGORY_ICONS[category] ?? Shapes;
}

/** Fallback gradient for an unknown category. */
export function categoryGradient(category: string): string {
  return CATEGORY_GRADIENTS[category] ?? CATEGORY_GRADIENTS['Бусад'];
}
