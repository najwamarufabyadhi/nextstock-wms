export type Role = 'SUPER_ADMIN' | 'WAREHOUSE_LEAD' | 'WAREHOUSE_STAFF';

export type MovementType = 'IN' | 'OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT';

export type TransferStatus = 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

export type OpnameStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductUnitConversion {
  unitName: string; // e.g. "karton", "dus", "bal", "pallet"
  multiplier: number; // e.g. 24 means 1 karton = 24 base unit
  barcode?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string; // Base unit e.g. "pcs", "roll", "box"
  unitCost: number; // HPP (Biaya Pokok per unit dasar dalam IDR)
  packagingUnits?: ProductUnitConversion[]; // Kemasan bertingkat
  minStockAlert: number;
  createdAt: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  warehouseId: string;
  batchNo: string;
  expiryDate: string; // YYYY-MM-DD
  quantityOnHand: number;
  initialQuantity: number;
  costPerUnit: number;
  receivedDate: string;
  // Joined fields
  productName?: string;
  productSku?: string;
  warehouseName?: string;
}

export interface BinLocationInfo {
  code: string; // e.g. RAK-A1-01
  aisle: string; // Lorong A
  rack: string; // Rak 1
  tier: string; // Tingkat 1
  warehouseId: string;
  capacityUnits: number;
  currentUnits: number;
  status: 'NORMAL' | 'LOW' | 'FULL' | 'EMPTY';
}

export interface InventoryLevel {
  id: string;
  warehouseId: string;
  productId: string;
  binLocation: string;
  quantityOnHand: number;
  updatedAt: string;
  // Join fields for UI convenience
  product?: Product;
  warehouse?: Warehouse;
  batches?: ProductBatch[];
}

export interface StockMovement {
  id: string;
  warehouseId: string;
  productId: string;
  type: MovementType;
  quantityChange: number; // in base units
  inputUnit?: string; // e.g. "karton"
  inputQty?: number; // e.g. 5
  unitCost?: number; // HPP per base unit (Rp)
  totalCost?: number; // Total valuation change (Rp)
  batchNo?: string;
  referenceNo?: string;
  notes?: string;
  createdBy?: string;
  createdAt: string;
  // Join fields
  productName?: string;
  productSku?: string;
  warehouseName?: string;
}

export interface StockTransferItem {
  id: string;
  transferId: string;
  productId: string;
  quantity: number;
  batchNo?: string;
  productName?: string;
  productSku?: string;
}

export interface StockTransfer {
  id: string;
  transferNo: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  status: TransferStatus;
  notes?: string;
  createdBy?: string;
  receivedBy?: string;
  createdAt: string;
  completedAt?: string;
  items: StockTransferItem[];
  fromWarehouseName?: string;
  toWarehouseName?: string;
}

export interface StockOpnameItem {
  id: string;
  opnameId: string;
  productId: string;
  productSku?: string;
  productName?: string;
  systemQty: number;
  physicalQty: number;
  difference: number;
}

export interface StockOpname {
  id: string;
  opnameNo: string;
  warehouseId: string;
  warehouseName?: string;
  status: OpnameStatus;
  notes?: string;
  createdBy?: string;
  approvedBy?: string;
  createdAt: string;
  approvedAt?: string;
  items: StockOpnameItem[];
}

export interface UserProfile {
  id: string;
  fullName: string;
  role: Role;
  email?: string;
  warehouseId?: string;
  warehouseName?: string;
  avatarInitials?: string;
}

export type FulfillmentStatus = 'PENDING_PICK' | 'PICKING' | 'PACKING' | 'READY_TO_SHIP' | 'SHIPPED';

export interface FulfillmentOrderItem {
  productId: string;
  sku: string;
  productName: string;
  binLocation: string;
  requestedQty: number;
  pickedQty: number;
  packedQty: number;
  barcode: string;
  unit: string;
  batchNo?: string;
}

export interface FulfillmentOrder {
  id: string;
  orderNumber: string;
  warehouseId: string;
  warehouseName?: string;
  destinationName: string;
  destinationAddress: string;
  carrierName: string;
  trackingNumber?: string;
  status: FulfillmentStatus;
  priority: 'NORMAL' | 'URGENT' | 'HIGH';
  createdAt: string;
  completedAt?: string;
  items: FulfillmentOrderItem[];
  notes?: string;
}
