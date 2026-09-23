export type UserRole = 'customer' | 'seller' | 'admin';

export type SellerStatus = 'pending' | 'approved' | 'rejected' | 'suspended';

export type ProductFulfilmentType = 'ready_stock' | 'made_to_order';

export type ProductStatus = 'draft' | 'pending' | 'approved' | 'rejected';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded';

export type SellerOrderStatus =
  | 'new'
  | 'accepted'
  | 'preparing'
  | 'ready_for_pickup'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type SettlementStatus = 'pending' | 'settled';

export type InvoiceType = 'sale' | 'commission' | 'credit_note';

export type PaymentProvider = 'mock' | 'razorpay';

export interface IAddress {
  name: string;
  phone: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  stateCode: string; // e.g. "19" for West Bengal, "27" for Maharashtra
  pincode: string;
  isDefault?: boolean;
}

export interface IProductDimension {
  l: number;
  w: number;
  h: number;
  unit: 'cm' | 'inch' | 'mm';
}

export interface IProductImage {
  url: string;
  publicId: string;
  alt: string;
}

export interface IOrderItemSnapshot {
  productId: string;
  title: string;
  image: string;
  unitPrice: number; // in paise
  qty: number;
  customisationNote?: string;
  hsnCode?: string;
  gstRate?: number; // percentage, e.g. 5, 12, 18 or 0
  lineTotal: number; // in paise (unitPrice * qty)
}

export interface ISupplierSnapshot {
  name: string;
  address: IAddress | string;
  gstin?: string | null;
  phone: string;
  email: string;
}

export interface IBuyerSnapshot {
  name: string;
  billingAddress: IAddress | string;
  shippingAddress: IAddress | string;
  phone: string;
  email: string;
}

export interface IInvoiceLineItem {
  title: string;
  hsnCode?: string;
  qty: number;
  unitPrice: number; // in paise
  discount?: number; // in paise
  taxableValue: number; // in paise
  gstRate?: number; // percentage
  cgst: number; // in paise
  sgst: number; // in paise
  igst: number; // in paise
  lineTotal: number; // in paise
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}
