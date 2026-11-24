'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useInventory } from '@/lib/store/inventory-store';
import { formatNumber, formatDate, formatCurrency } from '@/lib/utils';
import VisualBinMap from '@/components/warehouse/VisualBinMap';
import BatchExpiryRadar from '@/components/fefo/BatchExpiryRadar';
import {
  Boxes,
  Banknote,
  AlertTriangle,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  PackageCheck,
  ArrowRightLeft,
  ArrowDownToLine,
  FileSpreadsheet,
  Package,
  Truck,
  ArrowRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function DashboardPage() {
  const {
    products,
    inventoryLevels,
    movements,
    transfers,
    opnames,
    fulfillmentOrders,
    selectedWarehouseId,
    getWarehouseById,
    getExpiringBatches,
  } = useInventory();

  const [activeVisualTab, setActiveVisualTab] = useState<'binMap' | 'fefo'>('binMap');

  const activeWarehouse = getWarehouseById(selectedWarehouseId);

  // Filtered inventory for selected warehouse
  const currentInventoryData = useMemo(() => {
    return products.map((product) => {
      const invRecord = inventoryLevels.find(
        (inv) => inv.warehouseId === selectedWarehouseId && inv.productId === product.id
      );
      const quantityOnHand = invRecord ? invRecord.quantityOnHand : 0;
      const isLowStock = quantityOnHand > 0 && quantityOnHand <= product.minStockAlert;
      const isOutOfStock = quantityOnHand === 0;
      const totalCost = (product.unitCost || 0) * quantityOnHand;

      return {
        product,
        quantityOnHand,
        isLowStock,
        isOutOfStock,
        totalCost,
      };
    });
  }, [products, inventoryLevels, selectedWarehouseId]);

  const totalUnitsInStock = useMemo(() => {
    return currentInventoryData.reduce((acc, item) => acc + item.quantityOnHand, 0);
  }, [currentInventoryData]);

  const totalValuation = useMemo(() => {
    return currentInventoryData.reduce((acc, item) => acc + item.totalCost, 0);
  }, [currentInventoryData]);

  const lowStockCount = useMemo(() => {
    return currentInventoryData.filter((i) => i.isLowStock || i.isOutOfStock).length;
  }, [currentInventoryData]);

  const expiringBatches = useMemo(() => {
    return getExpiringBatches(selectedWarehouseId, 90);
  }, [selectedWarehouseId, getExpiringBatches]);

  // Today's Movements
  const warehouseMovements = useMemo(() => {
    return movements.filter((m) => m.warehouseId === selectedWarehouseId);
  }, [movements, selectedWarehouseId]);

  const todayMovements = useMemo(() => {
    const getJakartaDate = (d: Date) => {
      try {
        return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
      } catch {
        return d.toISOString().slice(0, 10);
      }
    };
    const todayStr = getJakartaDate(new Date());
    return warehouseMovements.filter(
      (m) => getJakartaDate(new Date(m.createdAt)) === todayStr
    );
  }, [warehouseMovements]);

  const todayInboundCount = todayMovements
    .filter((m) => m.type === 'IN' || m.type === 'TRANSFER_IN')
    .reduce((acc, m) => acc + Math.abs(m.quantityChange), 0);

  const todayOutboundCount = todayMovements
    .filter((m) => m.type === 'OUT' || m.type === 'TRANSFER_OUT')
    .reduce((acc, m) => acc + Math.abs(m.quantityChange), 0);

  // Active tasks counts
  const pendingFulfillmentOrders = fulfillmentOrders.filter(
    (o) => o.warehouseId === selectedWarehouseId && o.status !== 'SHIPPED'
  );

  const activeTransfers = transfers.filter(
    (t) =>
      t.status === 'IN_TRANSIT' &&
      (t.fromWarehouseId === selectedWarehouseId || t.toWarehouseId === selectedWarehouseId)
  );

  const pendingOpnames = opnames.filter(
    (o) => o.warehouseId === selectedWarehouseId && o.status === 'PENDING_APPROVAL'
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* 1. Page Header (Seamless & Clean) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pusat Kendali Eksekutif
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan aset fisik, denyut pergerakan stok, dan antrean operasional di{' '}
            <span className="font-semibold text-slate-700">{activeWarehouse?.name}</span>.
          </p>
        </div>

        {/* Quick Module Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium">
          <Link
            href="/inventory"
            className="h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
          >
            <Package className="w-3.5 h-3.5 text-slate-500" />
            Master Stok
          </Link>
          <Link
            href="/fulfillment"
            className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition shadow-2xs"
          >
            <PackageCheck className="w-3.5 h-3.5" />
            Pemenuhan ({pendingFulfillmentOrders.length})
          </Link>
          <Link
            href="/inbound"
            className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition shadow-2xs"
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            Penerimaan PO
          </Link>
        </div>
      </div>

      {/* 2. Unified Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white rounded-xl border border-slate-200 shadow-2xs">
        {/* Metric 1 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Valuasi Aset Fisik (HPP)
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalValuation)}
            </div>
            <span className="text-[11px] text-slate-500">
              {formatNumber(totalUnitsInStock)} unit ({products.length} SKU)
            </span>
          </div>
          <Banknote className="w-5 h-5 text-emerald-600" />
        </div>

        {/* Metric 2 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Peringatan Stok & FEFO
            </span>
            <div
              className={`text-xl font-bold mt-0.5 ${
                lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {lowStockCount}{' '}
              <span className="text-xs font-normal text-slate-400">SKU menipis</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {expiringBatches.length} batch mendekati kadaluwarsa
            </span>
          </div>
          <AlertTriangle
            className={`w-5 h-5 ${lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}
          />
        </div>

        {/* Metric 3 */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Mutasi Hari Ini
            </span>
            <div className="flex items-center gap-3 mt-0.5 text-xs font-semibold">
              <span className="text-emerald-700">+{todayInboundCount} masuk</span>
              <span className="text-rose-700">-{todayOutboundCount} keluar</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {todayMovements.length} transaksi tercatat
            </span>
          </div>
          <Layers className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      {/* 3. Middle Section: Digital Twin Map & Operational Task Queue */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Span 8: Visual Spatial Twin or FEFO Radar */}
        <div className="xl:col-span-8 space-y-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
              <button
                onClick={() => setActiveVisualTab('binMap')}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeVisualTab === 'binMap'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Peta Spasial Rak 2D
              </button>
              <button
                onClick={() => setActiveVisualTab('fefo')}
                className={`px-3 py-1.5 rounded-md transition ${
                  activeVisualTab === 'fefo'
                    ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Radar Batch & FEFO ({expiringBatches.length})
              </button>
            </div>

            <Link
              href="/inventory"
              className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1 self-start sm:self-auto"
            >
              Katalog SKU &rarr;
            </Link>
          </div>

          {activeVisualTab === 'binMap' ? <VisualBinMap /> : <BatchExpiryRadar />}
        </div>

        {/* Right Span 4: Operational Task Center */}
        <div className="xl:col-span-4 bg-white rounded-xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                Antrean Tugas Gudang
              </h3>
              <span className="text-[10px] font-bold text-slate-400">LIVE</span>
            </div>

            <div className="space-y-2.5 mt-3">
              {/* Task 1 */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <PackageCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Pemenuhan Pesanan
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                    {pendingFulfillmentOrders.length} Pending
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Pesanan keluar memerlukan picking lorong dan scan-to-pack.
                </p>
                <Link
                  href="/fulfillment"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline pt-0.5"
                >
                  Buka Meja Packing &rarr;
                </Link>
              </div>

              {/* Task 2 */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-amber-600" />
                    Transfer Cabang
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {activeTransfers.length} Transit
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Surat Jalan transfer barang antar-gudang sedang berjalan.
                </p>
                <Link
                  href="/transfers"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:underline pt-0.5"
                >
                  Konfirmasi Penerimaan &rarr;
                </Link>
              </div>

              {/* Task 3 */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-slate-600" />
                    Stock Opname
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                    {pendingOpnames.length} Approval
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Penyesuaian selisih fisik menunggu verifikasi tanda tangan Lead.
                </p>
                <Link
                  href="/transfers"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:underline pt-0.5"
                >
                  Buka Berita Acara &rarr;
                </Link>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Operasional Logistik</span>
            <span className="font-semibold text-emerald-600">✓ Sistem Normal</span>
          </div>
        </div>
      </div>

      {/* 4. Recent Activity Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Aktivitas Mutasi Terkini
            </h3>
            <p className="text-[11px] text-slate-400">
              5 transaksi mutasi stok terakhir di {activeWarehouse?.name}.
            </p>
          </div>
          <Link
            href="/ledger"
            className="text-xs font-medium text-indigo-600 hover:underline flex items-center gap-1"
          >
            Lihat Buku Besar &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-3">Barang & SKU</th>
                <th className="py-2.5 px-3 text-center">Tipe</th>
                <th className="py-2.5 px-3 text-right">Perubahan</th>
                <th className="py-2.5 px-3">No. Dokumen</th>
                <th className="py-2.5 px-4">Petugas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouseMovements.slice(0, 5).map((mov) => {
                const isPos = mov.quantityChange > 0;
                return (
                  <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {formatDate(mov.createdAt)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-medium text-slate-900 block text-xs">
                        {mov.productName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {mov.productSku}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.2 rounded text-[10px] font-bold ${
                          mov.type === 'IN' || mov.type === 'TRANSFER_IN'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {mov.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      <span className={isPos ? 'text-emerald-600' : 'text-rose-600'}>
                        {isPos ? `+${mov.quantityChange}` : mov.quantityChange}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 text-[11px]">
                      {mov.referenceNo || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 text-xs">
                      {mov.createdBy || 'Sistem'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
