import { format } from 'date-fns';
import type { Subcontracting, SubReturn, SubSend } from '../types';

/** Months as 'yyyy-MM', both ends included. null = all time. */
export interface MonthRange {
  from: string;
  to: string;
}

export type PeriodMode = 'month' | 'all' | 'custom';

export const currentMonth = (): string => format(new Date(), 'yyyy-MM');

export const inRange = (date: string | undefined | null, range: MonthRange | null): boolean => {
  if (!range) return true;
  const key = (date || '').slice(0, 7);
  return key >= range.from && key <= range.to;
};

export const describeRange = (range: MonthRange | null): string => {
  if (!range) return 'All time';
  const label = (m: string) => format(new Date(`${m}-01T00:00:00`), 'MMM yyyy');
  return range.from === range.to ? label(range.from) : `${label(range.from)} – ${label(range.to)}`;
};

const returnNet = (r: SubReturn): number => {
  if (r.netReturnStock != null) return r.netReturnStock;
  const deduction = (r.packagings || []).reduce((d, p) => d + (p.packagingWeight || 0) * (p.packagingCount || 0), 0);
  return r.returnStock - deduction;
};

const round3 = (v: number) => Math.round(v * 1000) / 1000;

export interface PeriodTotals {
  sends: SubSend[];
  returns: SubReturn[];
  sentStock: number;
  avgPrice: number;
  avgJobWork: number;
  totalValue: number;
  grossJobPay: number;
  netReturned: number;
  usedStock: number;
  rejectionKg: number;
  rejectionRate: number;
  rejectionAmount: number;
  /** The rejection kg was set by hand on the order (only applied for all time) */
  rejectionManual: boolean;
}

/**
 * Sent lots, returns and the money worked out from them, for the lots sent and the returns
 * made in the range. With no range (all time) the order's own totals are used as they are.
 */
export function subcontractTotals(sc: Subcontracting, range: MonthRange | null): PeriodTotals {
  const allSends: SubSend[] = sc.subSends && sc.subSends.length > 0
    ? sc.subSends
    // Orders from before sent lots were kept: the whole order is one lot on its order date
    : [{ sendDate: sc.orderDate, sentStock: sc.sentStock, price: sc.price, jobWorkPay: sc.jobWorkPay } as SubSend];
  const allReturns = sc.subReturns || [];
  const rejectionRate = sc.rejectionPrice ?? sc.price ?? 0;

  if (!range) {
    const netReturned = round3(sc.totalNetReturnStock ?? allReturns.reduce((s, r) => s + returnNet(r), 0));
    const rejectionKg = sc.rejectionStock ?? allReturns.reduce((s, r) => s + (r.rejectionStock || 0), 0);
    return {
      sends: allSends,
      returns: allReturns,
      sentStock: sc.sentStock,
      avgPrice: sc.price,
      avgJobWork: sc.jobWorkPay,
      totalValue: sc.totalAmount || 0,
      grossJobPay: (sc.jobWorkPay || 0) * sc.sentStock,
      netReturned,
      usedStock: round3(sc.sentStock - netReturned),
      rejectionKg,
      rejectionRate,
      rejectionAmount: sc.rejectionAmount ?? rejectionKg * (sc.price || 0),
      rejectionManual: !!sc.rejectionStockManual,
    };
  }

  const sends = allSends.filter((s) => inRange(s.sendDate, range));
  const returns = allReturns.filter((r) => inRange(r.returnDate, range));
  const sentStock = round3(sends.reduce((s, x) => s + (x.sentStock || 0), 0));
  const totalValue = sends.reduce((s, x) => s + (x.sentStock || 0) * (x.price || 0), 0);
  const grossJobPay = sends.reduce((s, x) => s + (x.sentStock || 0) * (x.jobWorkPay || 0), 0);
  const netReturned = round3(returns.reduce((s, r) => s + returnNet(r), 0));
  const rejectionKg = round3(returns.reduce((s, r) => s + (r.rejectionStock || 0), 0));
  return {
    sends,
    returns,
    sentStock,
    avgPrice: sentStock > 0 ? totalValue / sentStock : 0,
    avgJobWork: sentStock > 0 ? grossJobPay / sentStock : 0,
    totalValue,
    grossJobPay,
    netReturned,
    usedStock: round3(sentStock - netReturned),
    rejectionKg,
    rejectionRate,
    rejectionAmount: rejectionKg * rejectionRate,
    rejectionManual: false,
  };
}
