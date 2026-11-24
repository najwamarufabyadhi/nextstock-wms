'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import {
  Warehouse,
  Product,
  InventoryLevel,
  StockMovement,
  StockTransfer,
  StockOpname,
  UserProfile,
  ProductBatch,
  BinLocationInfo,
  FulfillmentOrder,
  FulfillmentOrderItem,
  FulfillmentStatus,
} from '@/types';
import {
  initialWarehouses,
  initialProducts,
  initialInventoryLevels,
  initialMovements,
  initialTransfers,
  initialOpnames,
  currentUserProfile,
  mockUsers,
  initialBatches,
  initialBinLocations,
  initialFulfillmentOrders,
} from '@/lib/mock-data';

export interface FefoAllocation {
  batch: ProductBatch;
  takeQty: number;
  daysLeft: number;
}

interface InventoryContextType {
  warehouses: Warehouse[];
  products: Product[];
  inventoryLevels: InventoryLevel[];
  movements: StockMovement[];
  transfers: StockTransfer[];
  opnames: StockOpname[];
  batches: ProductBatch[];
  binLocations: BinLocationInfo[];
  allUsers: UserProfile[];
  currentUser: UserProfile;
  switchUser: (userId: string) => void;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  canApproveOpname: boolean;
  canManageWarehouses: boolean;
  canAddProducts: boolean;
  selectedWarehouseId: string;
  setSelectedWarehouseId: (id: string) => void;
  selectedBin: string | null;
  setSelectedBin: (bin: string | null) => void;

  // Stored Procedure RPC Implementations
  recordMovement: (params: {
    warehouseId: string;
    productId: string;
    type: 'IN' | 'OUT';
    quantity: number;
    referenceNo: string;
    notes?: string;
    batchNo?: string;
    inputUnit?: string;
    inputQty?: number;
  }) => { success: boolean; message?: string };

  createTransfer: (params: {
    fromWarehouseId: string;
    toWarehouseId: string;
    items: { productId: string; quantity: number; batchNo?: string }[];
    notes?: string;
  }) => { success: boolean; message?: string };

  completeTransfer: (transferId: string) => { success: boolean; message?: string };
  cancelTransfer: (transferId: string, reason?: string) => { success: boolean; message?: string };

  submitOpname: (params: {
    warehouseId: string;
    notes?: string;
    items: { productId: string; physicalQty: number }[];
  }) => { success: boolean; message?: string };

  approveOpname: (opnameId: string) => { success: boolean; message?: string };

  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  addWarehouse: (warehouse: Omit<Warehouse, 'id' | 'createdAt'>) => void;
  addBatch: (batch: Omit<ProductBatch, 'id'>) => void;

  // Helper selectors & FEFO Engine
  getWarehouseById: (id: string) => Warehouse | undefined;
  getProductById: (id: string) => Product | undefined;
  getStockLevel: (warehouseId: string, productId: string) => number;
  getBatchesForProduct: (productId: string, warehouseId: string) => ProductBatch[];
  getExpiringBatches: (
    warehouseId: string,
    daysThreshold?: number
  ) => (ProductBatch & { daysLeft: number; riskLevel: 'DANGER' | 'WARNING' | 'SAFE' })[];
  getFefoRecommendation: (
    productId: string,
    warehouseId: string,
    requestedQty: number
  ) => {
    allocations: FefoAllocation[];
    totalAvailable: number;
    canFulfill: boolean;
  };

  // Order Fulfillment (Picking & Scan-to-Pack Verification)
  fulfillmentOrders: FulfillmentOrder[];
  updateFulfillmentItemPick: (orderId: string, productId: string, delta: number) => void;
  confirmOrderPicked: (orderId: string) => void;
  scanToPackItem: (orderId: string, barcodeOrSku: string) => {
    success: boolean;
    message: string;
    orderCompleted?: boolean;
    itemMatched?: FulfillmentOrderItem;
  };
  completeFulfillmentOrder: (
    orderId: string,
    carrierName?: string,
    trackingNumber?: string
  ) => { success: boolean; message: string };
  createFulfillmentOrder: (order: Omit<FulfillmentOrder, 'id' | 'createdAt'>) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

const STORAGE_KEY = 'nexstock_wms_state_v2';

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>(initialWarehouses);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [inventoryLevels, setInventoryLevels] = useState<InventoryLevel[]>(initialInventoryLevels);
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements);
  const [transfers, setTransfers] = useState<StockTransfer[]>(initialTransfers);
  const [opnames, setOpnames] = useState<StockOpname[]>(initialOpnames);
  const [batches, setBatches] = useState<ProductBatch[]>(initialBatches);
  const [binLocations, setBinLocations] = useState<BinLocationInfo[]>(initialBinLocations);
  const [fulfillmentOrders, setFulfillmentOrders] = useState<FulfillmentOrder[]>(initialFulfillmentOrders);
  const [allUsers] = useState<UserProfile[]>(mockUsers);
  const [currentUser, setCurrentUser] = useState<UserProfile>(currentUserProfile);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('a0000000-0000-0000-0000-000000000001');
  const [selectedBin, setSelectedBin] = useState<string | null>(null);

  const AUTH_STORAGE_KEY = 'nexstock_wms_auth_session';
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);

  // Check auth session on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const authSession = localStorage.getItem(AUTH_STORAGE_KEY);
      if (authSession) {
        try {
          const parsed = JSON.parse(authSession);
          if (parsed.user) {
            setCurrentUser(parsed.user);
            setIsAuthenticated(true);
            if (parsed.user.warehouseId) {
              setSelectedWarehouseId(parsed.user.warehouseId);
            }
          }
        } catch (e) {
          console.error('Failed to parse auth session', e);
        }
      }
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    // 1. Try Supabase Auth first if configured
    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const matchedUser = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
          if (matchedUser) {
            await supabase.auth.signUp({
              email,
              password,
              options: {
                data: {
                  full_name: matchedUser.fullName,
                  role: matchedUser.role,
                  warehouse_id: matchedUser.warehouseId,
                },
              },
            });
          }
        }
      } catch (err) {
        console.warn('Supabase auth network notice:', err);
      }
    }

    // 2. Find matching profile in system
    const matchedUser = allUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!matchedUser) {
      return {
        success: false,
        message: 'Akun dengan email ini tidak terdaftar di sistem WMS.',
      };
    }

    setCurrentUser(matchedUser);
    setIsAuthenticated(true);
    if (matchedUser.warehouseId) {
      setSelectedWarehouseId(matchedUser.warehouseId);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: matchedUser }));
    }

    return { success: true };
  };

  const logout = async (): Promise<void> => {
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut notice:', e);
      }
    }
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  };

  const canApproveOpname = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'WAREHOUSE_LEAD';
  const canManageWarehouses = currentUser.role === 'SUPER_ADMIN';
  const canAddProducts = currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'WAREHOUSE_LEAD';

  const switchUser = (userId: string) => {
    const found = allUsers.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      if (found.warehouseId) {
        setSelectedWarehouseId(found.warehouseId);
      }
    }
  };

  // Load from localStorage if present with auto-migration from legacy wh-1
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Detect legacy mock format (wh-1, prod-1) and clear to upgrade to unified UUIDs
          const isLegacy =
            parsed.selectedWarehouseId === 'wh-1' ||
            parsed.warehouses?.some((w: any) => w.id === 'wh-1') ||
            parsed.products?.some((p: any) => p.id === 'prod-1');

          if (isLegacy) {
            localStorage.removeItem(STORAGE_KEY);
            setSelectedWarehouseId('a0000000-0000-0000-0000-000000000001');
          } else {
            if (parsed.warehouses) setWarehouses(parsed.warehouses);
            if (parsed.products) setProducts(parsed.products);
            if (parsed.inventoryLevels) setInventoryLevels(parsed.inventoryLevels);
            if (parsed.movements) setMovements(parsed.movements);
            if (parsed.transfers) setTransfers(parsed.transfers);
            if (parsed.opnames) setOpnames(parsed.opnames);
            if (parsed.batches) setBatches(parsed.batches);
            if (parsed.fulfillmentOrders) setFulfillmentOrders(parsed.fulfillmentOrders);
            if (parsed.selectedWarehouseId) setSelectedWarehouseId(parsed.selectedWarehouseId);
          }
        } catch (e) {
          console.error('Failed to parse cached inventory state', e);
        }
      }
    }
  }, []);

  // Sync from Supabase live database if configured
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    async function fetchFromSupabase() {
      try {
        const client = supabase;
        if (!client) return;

        const [
          { data: whData, error: whErr },
          { data: prodData, error: prodErr },
          { data: invData, error: invErr },
          { data: movData, error: movErr },
          { data: batchData, error: batchErr },
        ] = await Promise.all([
          client.from('warehouses').select('*'),
          client.from('products').select('*'),
          client.from('inventory_levels').select('*'),
          client.from('stock_movements').select('*').order('created_at', { ascending: false }).limit(100),
          client.from('stock_batches').select('*'),
        ]);

        if (whErr || prodErr) {
          console.warn('Supabase read notice (will use cached/seed data until privileges granted):', whErr || prodErr);
          return;
        }

        if (whData && whData.length > 0) {
          const mappedWarehouses = whData.map((w: any) => ({
            id: w.id,
            code: w.code,
            name: w.name,
            address: w.address,
            isActive: w.is_active,
            createdAt: w.created_at,
          }));
          setWarehouses(mappedWarehouses);

          // Ensure selected warehouse is valid
          setSelectedWarehouseId((prev) => {
            if (!prev || prev === 'wh-1' || !mappedWarehouses.some((w: any) => w.id === prev)) {
              return mappedWarehouses[0].id;
            }
            return prev;
          });
        }

        if (prodData && prodData.length > 0) {
          setProducts(
            prodData.map((p: any) => ({
              id: p.id,
              sku: p.sku,
              name: p.name,
              category: p.category,
              unit: p.unit,
              unitCost: Number(p.unit_cost) || 0,
              packagingUnits: p.packaging_units || [],
              minStockAlert: p.min_stock_alert || 10,
              createdAt: p.created_at,
            }))
          );
        }

        if (invData && invData.length > 0) {
          setInventoryLevels(
            invData.map((inv: any) => ({
              id: inv.id,
              warehouseId: inv.warehouse_id,
              productId: inv.product_id,
              binLocation: inv.bin_location || 'RAK-A1-01',
              quantityOnHand: inv.quantity_on_hand,
              updatedAt: inv.updated_at,
            }))
          );
        }

        if (movData && movData.length > 0) {
          setMovements(
            movData.map((m: any) => ({
              id: m.id,
              warehouseId: m.warehouse_id,
              productId: m.product_id,
              type: m.type,
              quantityChange: m.quantity_change,
              inputUnit: m.input_unit,
              inputQty: m.input_qty,
              unitCost: Number(m.unit_cost) || 0,
              totalCost: Number(m.total_cost) || 0,
              batchNo: m.batch_no,
              referenceNo: m.reference_no,
              notes: m.notes,
              createdBy: m.created_by,
              createdAt: m.created_at,
            }))
          );
        }

        if (batchData && batchData.length > 0) {
          setBatches(
            batchData.map((b: any) => ({
              id: b.id,
              productId: b.product_id,
              warehouseId: b.warehouse_id,
              batchNo: b.batch_no,
              expiryDate: b.expiry_date,
              quantityOnHand: b.quantity_on_hand,
              initialQuantity: b.initial_quantity,
              costPerUnit: Number(b.cost_per_unit) || 0,
              receivedDate: b.received_date,
            }))
          );
        }
      } catch (err) {
        console.warn('Supabase sync notice:', err);
      }
    }

    fetchFromSupabase();
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const state = {
        warehouses,
        products,
        inventoryLevels,
        movements,
        transfers,
        opnames,
        batches,
        fulfillmentOrders,
        selectedWarehouseId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [warehouses, products, inventoryLevels, movements, transfers, opnames, batches, selectedWarehouseId, fulfillmentOrders]);

  const getWarehouseById = (id: string) => warehouses.find((w) => w.id === id);
  const getProductById = (id: string) => products.find((p) => p.id === id);

  const getStockLevel = (warehouseId: string, productId: string) => {
    const record = inventoryLevels.find(
      (inv) => inv.warehouseId === warehouseId && inv.productId === productId
    );
    return record ? record.quantityOnHand : 0;
  };

  const getBatchesForProduct = (productId: string, warehouseId: string) => {
    return batches.filter(
      (b) => b.productId === productId && b.warehouseId === warehouseId && b.quantityOnHand > 0
    );
  };

  // Expiry calculation helper
  const getExpiringBatches = (warehouseId: string, daysThreshold = 90) => {
    const now = Date.now();
    const DAY_MS = 86400000;

    return batches
      .filter((b) => b.warehouseId === warehouseId && b.quantityOnHand > 0)
      .map((b) => {
        const expiryTime = new Date(b.expiryDate).getTime();
        const diffMs = expiryTime - now;
        const daysLeft = Math.ceil(diffMs / DAY_MS);

        let riskLevel: 'DANGER' | 'WARNING' | 'SAFE' = 'SAFE';
        if (daysLeft <= 30) riskLevel = 'DANGER';
        else if (daysLeft <= daysThreshold) riskLevel = 'WARNING';

        return { ...b, daysLeft, riskLevel };
      })
      .filter((b) => b.daysLeft <= daysThreshold)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  };

  // Intelligent FEFO Pick Engine
  const getFefoRecommendation = (productId: string, warehouseId: string, requestedQty: number) => {
    const activeBatches = getBatchesForProduct(productId, warehouseId).sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );

    const allocations: FefoAllocation[] = [];
    let remainingNeeded = requestedQty;
    const now = Date.now();
    const DAY_MS = 86400000;

    for (const batch of activeBatches) {
      if (remainingNeeded <= 0) break;
      const takeQty = Math.min(batch.quantityOnHand, remainingNeeded);
      const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - now) / DAY_MS);

      allocations.push({
        batch,
        takeQty,
        daysLeft,
      });

      remainingNeeded -= takeQty;
    }

    const totalAvailable = activeBatches.reduce((acc, b) => acc + b.quantityOnHand, 0);

    return {
      allocations,
      totalAvailable,
      canFulfill: remainingNeeded <= 0,
    };
  };

  // 1. Atomic Record Movement (Inbound / Outbound with Batch FEFO support)
  const recordMovement = ({
    warehouseId,
    productId,
    type,
    quantity,
    referenceNo,
    notes,
    batchNo,
    inputUnit,
    inputQty,
  }: {
    warehouseId: string;
    productId: string;
    type: 'IN' | 'OUT';
    quantity: number;
    referenceNo: string;
    notes?: string;
    batchNo?: string;
    inputUnit?: string;
    inputQty?: number;
  }) => {
    if (quantity <= 0) {
      return { success: false, message: 'Kuantitas mutasi harus lebih besar dari 0' };
    }

    const currentStock = getStockLevel(warehouseId, productId);
    if (type === 'OUT' && currentStock < quantity) {
      return {
        success: false,
        message: `Stok tidak mencukupi! Tersedia: ${currentStock}, diminta keluar: ${quantity}`,
      };
    }

    const qtyChange = type === 'OUT' ? -quantity : quantity;
    const newStock = currentStock + qtyChange;
    const product = getProductById(productId);
    const warehouse = getWarehouseById(warehouseId);

    // Update inventory level
    setInventoryLevels((prev) => {
      const existing = prev.find(
        (i) => i.warehouseId === warehouseId && i.productId === productId
      );
      if (existing) {
        return prev.map((item) =>
          item.warehouseId === warehouseId && item.productId === productId
            ? { ...item, quantityOnHand: newStock, updatedAt: new Date().toISOString() }
            : item
        );
      } else {
        return [
          ...prev,
          {
            id: `inv-${Date.now()}`,
            warehouseId,
            productId,
            binLocation: 'A-01-01',
            quantityOnHand: newStock,
            updatedAt: new Date().toISOString(),
          },
        ];
      }
    });

    // Update batch quantity if batch provided or auto-deduct via FEFO
    if (type === 'OUT') {
      if (batchNo) {
        setBatches((prev) =>
          prev.map((b) =>
            b.batchNo === batchNo && b.warehouseId === warehouseId
              ? { ...b, quantityOnHand: Math.max(0, b.quantityOnHand - quantity) }
              : b
          )
        );
      } else {
        // Auto FEFO deduct
        const fefo = getFefoRecommendation(productId, warehouseId, quantity);
        if (fefo.allocations.length > 0) {
          setBatches((prev) =>
            prev.map((b) => {
              const matched = fefo.allocations.find((a) => a.batch.id === b.id);
              if (matched) {
                return { ...b, quantityOnHand: Math.max(0, b.quantityOnHand - matched.takeQty) };
              }
              return b;
            })
          );
        }
      }
    } else if (type === 'IN' && batchNo) {
      // Inbound with batch
      setBatches((prev) => {
        const existingIdx = prev.findIndex(
          (b) => b.batchNo === batchNo && b.warehouseId === warehouseId
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantityOnHand: updated[existingIdx].quantityOnHand + quantity,
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: `batch-${Date.now()}`,
              productId,
              warehouseId,
              batchNo,
              expiryDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
              quantityOnHand: quantity,
              initialQuantity: quantity,
              costPerUnit: 50000,
              receivedDate: new Date().toISOString().split('T')[0],
              productName: product?.name,
              productSku: product?.sku,
              warehouseName: warehouse?.name,
            },
          ];
        }
      });
    }

    // Add immutable ledger entry
    const unitCost = product?.unitCost || 0;
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      warehouseId,
      productId,
      type,
      quantityChange: qtyChange,
      inputUnit: inputUnit || product?.unit,
      inputQty: inputQty || Math.abs(qtyChange),
      unitCost,
      totalCost: Math.abs(qtyChange) * unitCost,
      batchNo,
      referenceNo,
      notes,
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
      productName: product?.name,
      productSku: product?.sku,
      warehouseName: warehouse?.name,
    };

    setMovements((prev) => [newMovement, ...prev]);

    // Asynchronously sync to Supabase if configured
    if (isSupabaseConfigured() && supabase) {
      const client = supabase;
      (async () => {
        try {
          const { error } = await client.rpc('fn_record_stock_movement', {
            p_warehouse_id: warehouseId,
            p_product_id: productId,
            p_type: type,
            p_quantity: quantity,
            p_reference_no: referenceNo,
            p_notes: notes || '',
            p_unit_cost: unitCost,
            p_batch_no: batchNo || null,
          });
          if (error) {
            console.warn('Supabase RPC sync notice:', error.message);
          }
        } catch (err: any) {
          console.warn('Supabase RPC network notice:', err?.message || err);
        }
      })();
    }

    return { success: true };
  };

  // 2. Atomic Create Transfer (State: IN_TRANSIT)
  const createTransfer = ({
    fromWarehouseId,
    toWarehouseId,
    items,
    notes,
  }: {
    fromWarehouseId: string;
    toWarehouseId: string;
    items: { productId: string; quantity: number; batchNo?: string }[];
    notes?: string;
  }) => {
    if (fromWarehouseId === toWarehouseId) {
      return { success: false, message: 'Gudang asal dan tujuan tidak boleh sama.' };
    }
    if (!items || items.length === 0) {
      return { success: false, message: 'Minimal pilih satu barang untuk ditransfer.' };
    }

    for (const item of items) {
      if (item.quantity <= 0) {
        return { success: false, message: 'Kuantitas transfer harus > 0' };
      }
      const stock = getStockLevel(fromWarehouseId, item.productId);
      if (stock < item.quantity) {
        const prod = getProductById(item.productId);
        return {
          success: false,
          message: `Stok ${prod?.name || item.productId} tidak mencukupi di gudang pengirim!`,
        };
      }
    }

    const transferNo = `TRF-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const fromWh = getWarehouseById(fromWarehouseId);
    const toWh = getWarehouseById(toWarehouseId);

    // Deduct stock in source warehouse & create ledger TRANSFER_OUT
    setInventoryLevels((prev) =>
      prev.map((inv) => {
        if (inv.warehouseId !== fromWarehouseId) return inv;
        const target = items.find((i) => i.productId === inv.productId);
        if (!target) return inv;
        return {
          ...inv,
          quantityOnHand: inv.quantityOnHand - target.quantity,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    const newMovements: StockMovement[] = items.map((item) => {
      const prod = getProductById(item.productId);
      return {
        id: `mov-${Date.now()}-${Math.random()}`,
        warehouseId: fromWarehouseId,
        productId: item.productId,
        type: 'TRANSFER_OUT',
        quantityChange: -item.quantity,
        batchNo: item.batchNo,
        referenceNo: transferNo,
        notes: `Transfer transit menuju ${toWh?.name}`,
        createdBy: currentUser.fullName,
        createdAt: new Date().toISOString(),
        productName: prod?.name,
        productSku: prod?.sku,
        warehouseName: fromWh?.name,
      };
    });

    setMovements((prev) => [...newMovements, ...prev]);

    // Create transfer document
    const newTransfer: StockTransfer = {
      id: `trf-${Date.now()}`,
      transferNo,
      fromWarehouseId,
      toWarehouseId,
      status: 'IN_TRANSIT',
      notes,
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
      items: items.map((i) => {
        const prod = getProductById(i.productId);
        return {
          id: `item-${Date.now()}-${Math.random()}`,
          transferId: `trf-${Date.now()}`,
          productId: i.productId,
          quantity: i.quantity,
          batchNo: i.batchNo,
          productName: prod?.name,
          productSku: prod?.sku,
        };
      }),
      fromWarehouseName: fromWh?.name,
      toWarehouseName: toWh?.name,
    };

    setTransfers((prev) => [newTransfer, ...prev]);

    return { success: true };
  };

  // 3. Complete Transfer
  const completeTransfer = (transferId: string) => {
    const trf = transfers.find((t) => t.id === transferId);
    if (!trf) return { success: false, message: 'Transfer tidak ditemukan' };
    if (trf.status !== 'IN_TRANSIT') {
      return { success: false, message: `Status saat ini: ${trf.status}, tidak dapat diselesaikan.` };
    }

    const toWh = getWarehouseById(trf.toWarehouseId);

    setInventoryLevels((prev) => {
      let updated = [...prev];
      trf.items.forEach((item) => {
        const existingIdx = updated.findIndex(
          (inv) => inv.warehouseId === trf.toWarehouseId && inv.productId === item.productId
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantityOnHand: updated[existingIdx].quantityOnHand + item.quantity,
            updatedAt: new Date().toISOString(),
          };
        } else {
          updated.push({
            id: `inv-${Date.now()}-${Math.random()}`,
            warehouseId: trf.toWarehouseId,
            productId: item.productId,
            binLocation: 'INBOUND-BAY',
            quantityOnHand: item.quantity,
            updatedAt: new Date().toISOString(),
          });
        }
      });
      return updated;
    });

    const newMovements: StockMovement[] = trf.items.map((item) => ({
      id: `mov-${Date.now()}-${Math.random()}`,
      warehouseId: trf.toWarehouseId,
      productId: item.productId,
      type: 'TRANSFER_IN',
      quantityChange: item.quantity,
      batchNo: item.batchNo,
      referenceNo: trf.transferNo,
      notes: `Penerimaan transfer dari ${trf.fromWarehouseName}`,
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
      productName: item.productName,
      productSku: item.productSku,
      warehouseName: toWh?.name,
    }));

    setMovements((prev) => [...newMovements, ...prev]);

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'COMPLETED',
              receivedBy: currentUser.fullName,
              completedAt: new Date().toISOString(),
            }
          : t
      )
    );

    return { success: true };
  };

  // 4. Cancel Transfer
  const cancelTransfer = (transferId: string, reason?: string) => {
    const trf = transfers.find((t) => t.id === transferId);
    if (!trf) return { success: false, message: 'Transfer tidak ditemukan' };
    if (trf.status !== 'IN_TRANSIT') {
      return { success: false, message: 'Hanya transfer status IN_TRANSIT yang dapat dibatalkan.' };
    }

    setInventoryLevels((prev) =>
      prev.map((inv) => {
        if (inv.warehouseId !== trf.fromWarehouseId) return inv;
        const item = trf.items.find((i) => i.productId === inv.productId);
        if (!item) return inv;
        return {
          ...inv,
          quantityOnHand: inv.quantityOnHand + item.quantity,
          updatedAt: new Date().toISOString(),
        };
      })
    );

    const newMovements: StockMovement[] = trf.items.map((item) => ({
      id: `mov-${Date.now()}-${Math.random()}`,
      warehouseId: trf.fromWarehouseId,
      productId: item.productId,
      type: 'ADJUSTMENT',
      quantityChange: item.quantity,
      batchNo: item.batchNo,
      referenceNo: `${trf.transferNo}-REV`,
      notes: `Pembatalan transfer: ${reason || 'Dibatalkan oleh operator'}`,
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
      productName: item.productName,
      productSku: item.productSku,
      warehouseName: trf.fromWarehouseName,
    }));

    setMovements((prev) => [...newMovements, ...prev]);

    setTransfers((prev) =>
      prev.map((t) =>
        t.id === transferId
          ? {
              ...t,
              status: 'CANCELLED',
              completedAt: new Date().toISOString(),
            }
          : t
      )
    );

    return { success: true };
  };

  // 5. Submit Stock Opname
  const submitOpname = ({
    warehouseId,
    notes,
    items,
  }: {
    warehouseId: string;
    notes?: string;
    items: { productId: string; physicalQty: number }[];
  }) => {
    const wh = getWarehouseById(warehouseId);
    const opnameNo = `SO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const opnameItems = items.map((i) => {
      const prod = getProductById(i.productId);
      const systemQty = getStockLevel(warehouseId, i.productId);
      return {
        id: `so-item-${Date.now()}-${Math.random()}`,
        opnameId: `opn-${Date.now()}`,
        productId: i.productId,
        productSku: prod?.sku,
        productName: prod?.name,
        systemQty,
        physicalQty: i.physicalQty,
        difference: i.physicalQty - systemQty,
      };
    });

    const newOpname: StockOpname = {
      id: `opn-${Date.now()}`,
      opnameNo,
      warehouseId,
      warehouseName: wh?.name,
      status: 'PENDING_APPROVAL',
      notes,
      createdBy: currentUser.fullName,
      createdAt: new Date().toISOString(),
      items: opnameItems,
    };

    setOpnames((prev) => [newOpname, ...prev]);
    return { success: true };
  };

  // 6. Approve Stock Opname
  const approveOpname = (opnameId: string) => {
    if (!canApproveOpname) {
      return {
        success: false,
        message: 'Akses ditolak: Hanya Warehouse Lead atau Super Admin yang berhak menyetujui Stock Opname.',
      };
    }

    const opn = opnames.find((o) => o.id === opnameId);
    if (!opn) return { success: false, message: 'Stock Opname tidak ditemukan' };
    if (opn.status !== 'PENDING_APPROVAL') {
      return { success: false, message: 'Status dokumen bukan PENDING_APPROVAL' };
    }

    const wh = getWarehouseById(opn.warehouseId);

    setInventoryLevels((prev) => {
      let updated = [...prev];
      opn.items.forEach((item) => {
        const existingIdx = updated.findIndex(
          (inv) => inv.warehouseId === opn.warehouseId && inv.productId === item.productId
        );
        if (existingIdx >= 0) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantityOnHand: item.physicalQty,
            updatedAt: new Date().toISOString(),
          };
        } else {
          updated.push({
            id: `inv-${Date.now()}-${Math.random()}`,
            warehouseId: opn.warehouseId,
            productId: item.productId,
            binLocation: 'A-01-01',
            quantityOnHand: item.physicalQty,
            updatedAt: new Date().toISOString(),
          });
        }
      });
      return updated;
    });

    const newMovements: StockMovement[] = opn.items
      .filter((i) => i.difference !== 0)
      .map((item) => ({
        id: `mov-${Date.now()}-${Math.random()}`,
        warehouseId: opn.warehouseId,
        productId: item.productId,
        type: 'ADJUSTMENT',
        quantityChange: item.difference,
        referenceNo: opn.opnameNo,
        notes: `Penyesuaian Opname (Fisik: ${item.physicalQty}, Sistem: ${item.systemQty})`,
        createdBy: currentUser.fullName,
        createdAt: new Date().toISOString(),
        productName: item.productName,
        productSku: item.productSku,
        warehouseName: wh?.name,
      }));

    setMovements((prev) => [...newMovements, ...prev]);

    setOpnames((prev) =>
      prev.map((o) =>
        o.id === opnameId
          ? {
              ...o,
              status: 'APPROVED',
              approvedBy: currentUser.fullName,
              approvedAt: new Date().toISOString(),
            }
          : o
      )
    );

    return { success: true };
  };

  const addProduct = (productData: Omit<Product, 'id' | 'createdAt'>) => {
    const newProduct: Product = {
      ...productData,
      id: `prod-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [newProduct, ...prev]);

    const newLevels: InventoryLevel[] = warehouses.map((w) => ({
      id: `inv-${Date.now()}-${w.id}`,
      warehouseId: w.id,
      productId: newProduct.id,
      binLocation: 'GENERAL-BAY',
      quantityOnHand: 0,
      updatedAt: new Date().toISOString(),
    }));

    setInventoryLevels((prev) => [...prev, ...newLevels]);
  };

  const addWarehouse = (whData: Omit<Warehouse, 'id' | 'createdAt'>) => {
    const newWh: Warehouse = {
      ...whData,
      id: `wh-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setWarehouses((prev) => [...prev, newWh]);

    const newLevels: InventoryLevel[] = products.map((p) => ({
      id: `inv-${Date.now()}-${p.id}`,
      warehouseId: newWh.id,
      productId: p.id,
      binLocation: 'A-01-01',
      quantityOnHand: 0,
      updatedAt: new Date().toISOString(),
    }));

    setInventoryLevels((prev) => [...prev, ...newLevels]);
  };

  const addBatch = (batchData: Omit<ProductBatch, 'id'>) => {
    const newBatch: ProductBatch = {
      ...batchData,
      id: `batch-${Date.now()}`,
    };
    setBatches((prev) => [newBatch, ...prev]);
  };

  // Order Fulfillment (Picking & Scan-to-Pack Verification) Implementation
  const updateFulfillmentItemPick = (orderId: string, productId: string, delta: number) => {
    setFulfillmentOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const newItems = order.items.map((item) => {
          if (item.productId !== productId) return item;
          const nextPicked = Math.max(0, Math.min(item.requestedQty, item.pickedQty + delta));
          return { ...item, pickedQty: nextPicked };
        });
        const hasStarted = newItems.some((it) => it.pickedQty > 0);
        const nextStatus = order.status === 'PENDING_PICK' && hasStarted ? 'PICKING' : order.status;
        return { ...order, items: newItems, status: nextStatus };
      })
    );
  };

  const confirmOrderPicked = (orderId: string) => {
    setFulfillmentOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const updatedItems = order.items.map((it) => ({
          ...it,
          pickedQty: Math.max(it.pickedQty, it.requestedQty),
        }));
        return {
          ...order,
          items: updatedItems,
          status: 'PACKING' as const,
        };
      })
    );
  };

  const scanToPackItem = (
    orderId: string,
    barcodeOrSku: string
  ): {
    success: boolean;
    message: string;
    orderCompleted?: boolean;
    itemMatched?: FulfillmentOrderItem;
  } => {
    const cleanScan = barcodeOrSku.trim().toUpperCase();
    const order = fulfillmentOrders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, message: 'Pesanan tidak ditemukan!' };
    }

    const item = order.items.find((it) => {
      if (it.barcode.toUpperCase() === cleanScan || it.sku.toUpperCase() === cleanScan) return true;
      const matchedProd = products.find((p) => p.id === it.productId);
      return matchedProd?.packagingUnits?.some((u) => u.barcode && u.barcode.toUpperCase() === cleanScan);
    });

    if (!item) {
      return {
        success: false,
        message: `Barcode/SKU "${barcodeOrSku}" BUKAN bagian dari pesanan ${order.orderNumber}!`,
      };
    }

    if (item.packedQty >= item.requestedQty) {
      return {
        success: false,
        message: `Semua ${item.requestedQty} ${item.unit} ${item.productName} sudah selesai dipak!`,
        itemMatched: item,
      };
    }

    let isAllPacked = false;
    const updatedItem: FulfillmentOrderItem = { ...item, packedQty: item.packedQty + 1 };

    setFulfillmentOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const newItems = ord.items.map((it) => {
          if (it.productId === item.productId) {
            return updatedItem;
          }
          return it;
        });

        isAllPacked = newItems.every((it) => it.packedQty >= it.requestedQty);
        return {
          ...ord,
          items: newItems,
          status: isAllPacked ? ('READY_TO_SHIP' as const) : ('PACKING' as const),
        };
      })
    );

    return {
      success: true,
      message: `Terverifikasi: 1 ${item.unit} ${item.productName} (${updatedItem.packedQty}/${item.requestedQty})`,
      orderCompleted: isAllPacked,
      itemMatched: updatedItem,
    };
  };

  const completeFulfillmentOrder = (
    orderId: string,
    carrierName?: string,
    trackingNumber?: string
  ): { success: boolean; message: string } => {
    const order = fulfillmentOrders.find((o) => o.id === orderId);
    if (!order) {
      return { success: false, message: 'Pesanan tidak ditemukan!' };
    }

    const targetWhId = order.warehouseId || selectedWarehouseId;
    const nowIso = new Date().toISOString();
    const finalCarrier = carrierName || order.carrierName || 'Internal Fleet';
    const finalResi = trackingNumber || order.trackingNumber || `EXP-${Date.now().toString().slice(-6)}`;

    // Generate Ledger movement per item
    const newMovements: StockMovement[] = order.items.map((it) => {
      const prod = products.find((p) => p.id === it.productId);
      const unitCost = prod?.unitCost || 0;
      return {
        id: `mov-fulfill-${Date.now()}-${it.productId}`,
        warehouseId: targetWhId,
        productId: it.productId,
        type: 'OUT' as const,
        quantityChange: -it.requestedQty,
        unitCost,
        totalCost: unitCost * it.requestedQty,
        referenceNo: `${order.orderNumber} (${finalResi})`,
        notes: `Pengiriman pesanan ke ${order.destinationName} via ${finalCarrier}`,
        createdBy: currentUser.fullName,
        createdAt: nowIso,
        productName: it.productName,
        productSku: it.sku,
        warehouseName: getWarehouseById(targetWhId)?.name || 'Gudang Pusat',
      };
    });

    setMovements((prev) => [...newMovements, ...prev]);

    // Decrement inventory levels
    setInventoryLevels((prev) =>
      prev.map((inv) => {
        if (inv.warehouseId !== targetWhId) return inv;
        const matchedItem = order.items.find((it) => it.productId === inv.productId);
        if (!matchedItem) return inv;
        return {
          ...inv,
          quantityOnHand: Math.max(0, inv.quantityOnHand - matchedItem.requestedQty),
          updatedAt: nowIso,
        };
      })
    );

    // Update order status to SHIPPED
    setFulfillmentOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: 'SHIPPED' as const,
              carrierName: finalCarrier,
              trackingNumber: finalResi,
              completedAt: nowIso,
            }
          : ord
      )
    );

    return {
      success: true,
      message: `Pesanan ${order.orderNumber} berhasil dikirim via ${finalCarrier} (Resi: ${finalResi}). Stok telah dikurangi.`,
    };
  };

  const createFulfillmentOrder = (orderData: Omit<FulfillmentOrder, 'id' | 'createdAt'>) => {
    const newOrder: FulfillmentOrder = {
      ...orderData,
      id: `ord-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setFulfillmentOrders((prev) => [newOrder, ...prev]);
  };

  return (
    <InventoryContext.Provider
      value={{
        warehouses,
        products,
        inventoryLevels,
        movements,
        transfers,
        opnames,
        batches,
        binLocations,
        allUsers,
        currentUser,
        switchUser,
        isAuthenticated,
        login,
        logout,
        canApproveOpname,
        canManageWarehouses,
        canAddProducts,
        selectedWarehouseId,
        setSelectedWarehouseId,
        selectedBin,
        setSelectedBin,
        recordMovement,
        createTransfer,
        completeTransfer,
        cancelTransfer,
        submitOpname,
        approveOpname,
        addProduct,
        addWarehouse,
        addBatch,
        getWarehouseById,
        getProductById,
        getStockLevel,
        getBatchesForProduct,
        getExpiringBatches,
        getFefoRecommendation,
        fulfillmentOrders,
        updateFulfillmentItemPick,
        confirmOrderPicked,
        scanToPackItem,
        completeFulfillmentOrder,
        createFulfillmentOrder,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}
