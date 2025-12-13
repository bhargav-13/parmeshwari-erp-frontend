// Authentication Types
export interface SignInRequest {
  username: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ErrorResponse {
  message: string;
  code: string;
  detail?: Record<string, any>;
}

// User Types
export const UserGroup = {
  Admin: 'Admin',
} as const;

export type UserGroup = typeof UserGroup[keyof typeof UserGroup];

export interface User {
  id: number;
  email: string;
  userGroup: UserGroup;
  enabled: boolean;
}

export interface UserRegistrationRequest {
  email: string;
  password: string;
  userGroup: UserGroup;
}

export interface UpdateUserGroupRequest {
  userGroup: UserGroup;
}

// Pagination Types
export interface PaginatedResult<T> {
  data: T[];
  empty: boolean;
  last: boolean;
  first: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
}

// Subcontracting Types
export const SubcontractingStatus = {
  IN_PROCESS: 'IN_PROCESS',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
} as const;

export type SubcontractingStatus = typeof SubcontractingStatus[keyof typeof SubcontractingStatus];

export const Unit = {
  KG: 'KG',
  PC: 'PC',
} as const;

export type Unit = typeof Unit[keyof typeof Unit];

export interface SubOrderRequest {
  contractorName: string;
  materialName: string;
  orderDate: string; // ISO date format
  sentStock: number;
  price: number;
  unit: Unit;
  remark?: string;
}

export interface SubReturnRequest {
  returnDate: string; // ISO date format
  returnStock: number;
}

export interface Subcontracting {
  subcontractingId: number;
  contractorName: string;
  materialName: string;
  orderDate: string;
  sentStock: number;
  price: number;
  returnDate?: string;
  returnStock?: number;
  usedStock?: number;
  totalAmount?: number;
  unit: Unit;
  status: SubcontractingStatus;
  remark?: string;
}

export interface SubcontractingStats {
  totalOrders: number;
  inProgress: number;
  completed: number;
  totalBilledAmount: number;
}

// Inventory Types
export const InventoryStatus = {
  IN_STOCK: 'IN_STOCK',
  LOW_STOCK: 'LOW_STOCK',
} as const;

export type InventoryStatus = typeof InventoryStatus[keyof typeof InventoryStatus];

export const QuantityUnit = {
  KG: 'KG',
  GM: 'GM',
} as const;

export type QuantityUnit = typeof QuantityUnit[keyof typeof QuantityUnit];

export interface Product {
  productId: number;
  productName: string;
}

export interface ProductRequest {
  productName: string;
}

export interface Category {
  categoryId: number;
  categoryName: string;
}

export interface CategoryRequest {
  categoryName: string;
}

export interface StockItemImage {
  imageId?: number;
  imageName: string;
  imageLocation: string;
  publicId?: string;
}

export interface StockItem {
  stockItemId: number;
  product: Product;
  category: Category;
  quantityInKg: number;
  quantityInPc: number;
  weightPerPc: number;
  pricePerKg: number;
  totalPrice: number;
  quantityUnit: QuantityUnit;
  status: InventoryStatus;
  lowStockAlert: number;
  images?: StockItemImage[];
}

export interface StockItemRequest {
  productId: number;
  categoryId: number;
  quantityInKg: number;
  quantityInPc: number;
  weightPerPc: number;
  pricePerKg: number;
  quantityUnit: QuantityUnit;
  lowStockAlert: number;
  images?: StockItemImage[];
}

export interface StockItemStatusRequest {
  status: InventoryStatus;
}

export interface RawItem {
  rawItemId: number;
  product: Product;
  quantityInKg: number;
  status: InventoryStatus;
  lowStockAlert: number;
  lastUpdatedAt: string;
}

export interface RawItemRequest {
  productId: number;
  quantityInKg: number;
  lowStockAlert: number;
}

export interface RawItemStatusRequest {
  status: InventoryStatus;
}

// Order Management Types
export const OrderStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export interface OrderProductRequest {
  productName: string;
  quantityKg: number;
  marketRate: number;
  rateDifference: number;
  totalAmount: number;
}

export interface OrderRequest {
  customerName: string;
  customerMobileNo?: string | null;
  customerEmail?: string | null;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentDate?: string | null;
  totalItems?: number | null;
  offlineBillPercent: number;
  offlineTotal?: number | null;
  officialBillAmount: number;
  gst: number;
  grandTotal: number;
  productsTotal: number;
  products: OrderProductRequest[];
}

export interface OrderProduct extends OrderProductRequest {
  id: number;
}

export interface Order extends Omit<OrderRequest, 'products'> {
  id: number;
  orderStatus: OrderStatus;
  products: OrderProduct[];
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalAmount: number;
}
