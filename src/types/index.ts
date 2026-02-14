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

export const PackagingType = {
  BAG: 'BAG',
  FOAM: 'FOAM',
  PETI: 'PETI',
  DRUM: 'DRUM',
} as const;

export type PackagingType = typeof PackagingType[keyof typeof PackagingType];

export const ReturnType = {
  MAAL: 'MAAL',
  CHHOL: 'CHHOL',
  TAYAR_MAAL: 'TAYAR_MAAL',
} as const;

export type ReturnType = typeof ReturnType[keyof typeof ReturnType];

// Contractor and SubItem Types
export interface Contractor {
  contractorId: number;
  name: string;
}

export interface SubItem {
  subItemId: number;
  name: string;
}

export interface SubOrderRequest {
  contractorId: number;
  itemId: number;
  orderDate: string; // ISO date format
  sentStock: number;
  jobWorkPay: number;
  price: number;
  unit: Unit;
  remark?: string;
}

export interface SubReturnRequest {
  returnDate: string; // ISO date format
  returnStock: number; // Gross return stock
  packagingType: PackagingType;
  packagingWeight: number; // Weight per packaging unit in KG
  packagingCount: number; // Number of packaging units
  returnRemark?: string | null;
}

export interface SubReturn {
  returnItemName: string;
  returnDate: string;
  returnStock: number;
  returnElement?: number | null;
  packagingCount?: number;
  packagingWeight?: number;
  packagingType: PackagingType;
  returnType: ReturnType;
  returnRemark?: string | null;
  netReturnStock?: number;
}

export interface Subcontracting {
  subcontractingId: number;
  contractor: Contractor;
  item: SubItem;
  orderDate: string;
  sentStock: number;
  jobWorkPay: number;
  price: number;
  subReturns?: SubReturn[];
  totalReturnStock?: number;
  totalNetReturnStock?: number;
  usedStock?: number;
  totalAmount?: number;
  unit: Unit;
  status: SubcontractingStatus;
  remark?: string;
  cromeCount?: number;
  availableStockForCrome?: number;
  canCreateCrome?: boolean;
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

export const InventoryFloor = {
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
} as const;

export type InventoryFloor = typeof InventoryFloor[keyof typeof InventoryFloor];

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
  format?: string;
  width?: number;
  height?: number;
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
  inventoryFloor?: InventoryFloor;
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
  inventoryFloor?: InventoryFloor;
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
  DISPATCHED: 'DISPATCHED',
} as const;

export type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];

export const OrderFloor = {
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
} as const;

export type OrderFloor = typeof OrderFloor[keyof typeof OrderFloor];

export type OrderQuantityUnit = 'kg' | 'pc';

export interface OrderProductRequest {
  itemId: number;
  productName?: string;
  quantityUnit?: OrderQuantityUnit;
  quantityKg?: number;
  quantityPc?: number;
  marketRate: number;
  rateDifference: number;
  totalAmount: number;
}

export interface DispatchItem {
  itemId: number;
  quantityKg?: number;
  quantityPc?: number;
}

export interface DispatchRequest {
  items: DispatchItem[];
}

//orderrequest
export interface OrderRequest {
  partyId: number;
  customerName: string;
  customerMobileNo?: string | null;
  customerEmail?: string | null;
  orderDate: string;
  expectedDeliveryDate: string;
  paymentDate?: string | null;
  totalItems?: number | null;
  orderFloor?: OrderFloor;
  offlineBillPercent: number;
  offlineTotal?: number | null;
  officialBillAmount: number;
  gst: number;
  grandTotal: number;
  productsTotal: number;
  products: OrderProductRequest[];
}

export interface OrderProduct {
  id: number;
  itemId: number;
  productName: string;
  quantityUnit?: OrderQuantityUnit;
  quantityKg?: number;
  quantityPc?: number;
  marketRate: number;
  rateDifference: number;
  totalAmount: number;
}

export interface Order extends Omit<OrderRequest, 'products'> {
  id: number;
  orderStatus: OrderStatus;
  orderFloor?: OrderFloor;
  products: OrderProduct[];
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalAmount: number;
}

// Invoice Types
export const InvoiceStatus = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
} as const;

export type InvoiceStatus = typeof InvoiceStatus[keyof typeof InvoiceStatus];

export const InvoiceFloor = {
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
} as const;

export type InvoiceFloor = typeof InvoiceFloor[keyof typeof InvoiceFloor];

export interface Invoice {
  id: number;
  order: Order;
  invoiceStatus: InvoiceStatus;
  floorEnum: InvoiceFloor;
}

export interface InvoiceStats {
  totalOfficialBill: number;
  totalOfflineBill: number;
  totalBilledAmount: number;
}

// Payment Reminder Types
export const PaymentStatus = {
  OVERDUE: 'OVERDUE',
  DUE_SOON: 'DUE_SOON',
  UPCOMING: 'UPCOMING',
} as const;

export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export const PaymentFloor = {
  GROUND_FLOOR: 'GROUND_FLOOR',
  FIRST_FLOOR: 'FIRST_FLOOR',
} as const;

export type PaymentFloor = typeof PaymentFloor[keyof typeof PaymentFloor];

export interface Payment {
  id: number;
  orderId: number;
  customerName?: string; // May be included by backend
  receivedAmount: number | null;
  lastReceivedDate: string | null;
  newReceivedAmount?: number | null;
  newReceivedDate?: string | null;
  totalAmount: number | null;
  lastReminder: string | null;
  dueDate: string;
  paymentStatus: PaymentStatus;
  floor: PaymentFloor;
}

export interface PaymentReceiveRequest {
  newReceivedAmount: number;
  newReceivedDate: string;
}

export interface PaymentStats {
  overduePayments: number;
  overdueAmount: number;
  dueSoonCount: number;
  totalOutstanding: number;
}

// Billing Type
export const BillingType = {
  OFFICIAL: 'OFFICIAL',
  OFFLINE: 'OFFLINE',
} as const;

export type BillingType = typeof BillingType[keyof typeof BillingType];

// Subcontract Types (for Subcontractors list/view)
export interface SubcontractingBySubcontractInfo {
  contractorName: string;
  lastUpdatedAt: string;
  itemName: string;
}

export interface SubcontractingBySubcontract {
  orderDate: string;
  price: number;
  jobWorkPay: number;
  itemName: string;
  sentStock: number;
  returnDate: string;
  returnItemName: string;
  returnStock: number;
  returnElement: number;
  packagingType: PackagingType;
  usedStock: number;
  netWeight: number;
  totalJobPay: number;
  totalAmount: number;
}

export interface SubcontractingBySubcontractList {
  contractorName: string;
  subcontractList: SubcontractingBySubcontract[];
  totalPaidRs: number;
  totalSentStock: number;
  totalReturnStock: number;
  totalUsed: number;
}

// Party Types
export interface Party {
  partyId: number;
  name: string;
  officialAmount: number;
  offlineAmount: number;
}

export interface PartyRequest {
  name: string;
  officialAmount: number;
  offlineAmount: number;
}

export interface OrderByParty {
  orderDate: string;
  officialInvoiceId: number;
  offlineInvoiceId: number;
  officialTotalAmount: number;
  offlineTotalAmount: number;
}

export interface OrderByPartyResponse {
  name: string;
  orders: OrderByParty[];
}

// Crome Types
export interface CromeRequest {
  subcontractingId: number;
  partyId: number;
  cromeDate: string;
  sentStock: number;
  packagingType: PackagingType;
  packagingWeight: number;
  packagingCount: number;
  remark?: string | null;
}

export interface CromeReturn {
  cromeReturnId: number;
  returnDate: string;
  returnStock: number;
  netReturnStock: number;
  packagingType: PackagingType;
  packagingWeight: number;
  packagingCount: number;
  returnRemark?: string | null;
}

export interface Crome {
  cromeId: number;
  subcontractingId: number;
  contractorName: string;
  partyName: string;
  cromeDate: string;
  itemName: string;
  sentStock: number;
  grossWeight: number;
  unit: Unit;
  packagingType: PackagingType;
  packagingWeight: number;
  packagingCount: number;
  status: SubcontractingStatus;
  remark?: string | null;
  cromeReturn?: CromeReturn | null;
}

export interface SubcontractingCromeInfo {
  subcontractingId: number;
  contractorId: number;
  contractorName: string;
  itemId: number;
  itemName: string;
  orderDate: string;
  originalSentStock: number;
  returnedStock: number;
  returnPackagingType?: PackagingType;
  returnPackagingWeight?: number;
  returnPackagingCount?: number;
  netReturnedStock: number;
  stockAlreadyInCrome: number;
  availableStockForCrome: number;
  unit: Unit;
  price: number;
  jobWorkPay: number;
  status: SubcontractingStatus;
}

export interface CromeReturnRequest {
  returnDate: string;
  returnStock: number;
  packagingType: PackagingType;
  packagingWeight: number;
  packagingCount: number;
  returnRemark?: string | null;
  addToInventory?: boolean;
  inventoryItemName?: string;
  inventoryFloor?: InventoryFloor;
  inventoryPricePerKg?: number;
  inventoryQuantityPc?: number;
}

// Casting Types
export interface CastingEntry {
  id?: number;
  date: string; // DD/MM/YYYY format for UI
  mell: number;
  brass: number;
}

export interface CastingSale {
  id?: number;
  date: string; // DD/MM/YYYY format for UI
  kadi: number | null;
  kadiRate: number | null;
  kadiAmount: number | null;
  lokhand: number | null;
  lokhandRate: number | null;
  lokhandAmount: number | null;
  totalAmount?: number;
}
