import { ISeller } from '../models/Seller.js';
import { ICategory } from '../models/Category.js';
import { ISettings, Settings } from '../models/Settings.js';

export interface CommissionCalculationResult {
  commissionRate: number; // percentage applied (e.g. 8 for 8%)
  commissionAmount: number; // in paise
  sellerPayout: number; // in paise (subtotal - commissionAmount)
}

/**
 * Resolves the effective commission rate based on the 3-tier hierarchy:
 * 1. Seller-specific override (seller.commissionRate)
 * 2. Category-specific default (category.defaultCommissionRate)
 * 3. Platform default setting (Settings.platformCommissionRate)
 */
export async function resolveCommissionRate(
  seller: ISeller,
  category?: ICategory | null,
  cachedSettings?: ISettings | null
): Promise<number> {
  // 1. Seller level override
  if (seller.commissionRate !== null && seller.commissionRate !== undefined && !isNaN(seller.commissionRate)) {
    return seller.commissionRate;
  }

  // 2. Category level default
  if (
    category &&
    category.defaultCommissionRate !== null &&
    category.defaultCommissionRate !== undefined &&
    !isNaN(category.defaultCommissionRate)
  ) {
    return category.defaultCommissionRate;
  }

  // 3. Platform settings default
  const settings = cachedSettings || (await Settings.findOne());
  return settings?.platformCommissionRate ?? 10;
}

/**
 * Calculates commission amount and seller payout in paise (integer arithmetic)
 */
export function calculateCommission(
  subtotal: number,
  commissionRate: number
): CommissionCalculationResult {
  const safeSubtotal = Math.max(0, Math.round(subtotal));
  const safeRate = Math.max(0, Math.min(100, commissionRate));

  // Commission in paise = round(subtotal * (rate / 100))
  const commissionAmount = Math.round(safeSubtotal * (safeRate / 100));
  const sellerPayout = Math.max(0, safeSubtotal - commissionAmount);

  return {
    commissionRate: safeRate,
    commissionAmount,
    sellerPayout,
  };
}
