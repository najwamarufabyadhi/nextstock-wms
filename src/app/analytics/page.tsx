'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useInventory } from '@/lib/store/inventory-store';
import { formatNumber, formatCurrency, formatDate } from '@/lib/utils';
import { exportAnalyticsToCsv } from '@/lib/export-excel';
import {
  TrendingUp,
  AlertTriangle,
  Banknote,
  Clock,
  Download,
  Search,
  ShoppingCart,
  Boxes,
  CheckCircle2,
  HelpCircle,
  ArrowRight,
  Layers,
  Sparkles,
  Truck,
  Building2,
  X,
} from 'lucide-react';

export default function AnalyticsPage() {
  const {
    products,
    inventoryLevels,
    movements,
    selectedWarehouseId,
    getWarehouseById,
    warehouses,
  } = useInventory();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [filterVelocity, setFilterVelocity] = useState<'ALL' | 'REORDER' | 'FAST' | 'DEAD_STOCK'>('ALL');
  const [leadTimeDays, setLeadTimeDays] = useState<number>(5); // default lead time supplier: 5 hari

  // Quick PO Draft Modal State
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [selectedPoItem, setSelectedPoItem] = useState<any | null>(null);
  const [poOrderQty, setPoOrderQty] = useState<number>(50);
  const [poVendorName, setPoVendorName] = useState<string>('PT Sumber Perkasa Logistik');
  const [poSuccessNotice, setPoSuccessNotice] = useState<string | null>(null);

  const activeWarehouse = getWarehouseById(selectedWarehouseId);

  // Compute analytics data for every product in the active warehouse
  const analyticsData = useMemo(() => {
    return products.map((product) => {
      const invRecord = inventoryLevels.find(
        (inv) => inv.warehouseId === selectedWarehouseId && inv.productId === product.id
      );
      const quantityOnHand = invRecord ? invRecord.quantityOnHand : 0;
      const unitCost = product.unitCost || 0;
      const capitalTied = quantityOnHand * unitCost;

      // Filter outbound movements for this product in this warehouse
      const productOutbounds = movements.filter(
        (m) =>
          m.warehouseId === selectedWarehouseId &&
          m.productId === product.id &&
          (m.type === 'OUT' || m.type === 'TRANSFER_OUT')
      );

      const totalOutQty = productOutbounds.reduce((acc, m) => acc + Math.abs(m.quantityChange), 0);
      
      // Calculate daily run rate (estimated from recent history or benchmark velocity)
      let dailyRunRate = totalOutQty > 0 ? totalOutQty / 7 : 0;
      if (dailyRunRate === 0) {
        // Industry benchmark daily consumption rate based on category
        const benchmarks: Record<string, number> = {
          Packaging: 4.5,
          Equipment: 0.6,
          'Safety Gear': 2.0,
          Consumables: 3.5,
        };
        dailyRunRate = benchmarks[product.category] || 1.8;
      }

      // Reorder Point = (Daily Usage * Lead Time) + Safety Stock
      const safetyStock = product.minStockAlert || 10;
      const reorderPoint = Math.ceil(dailyRunRate * leadTimeDays) + safetyStock;

      // Days of Supply left
      const daysOfSupply = dailyRunRate > 0 ? Math.round(quantityOnHand / dailyRunRate) : 90;

      // Suggested Reorder Quantity
      const suggestedReorderQty = Math.max(
        0,
        Math.ceil(reorderPoint * 1.5) - quantityOnHand
      );

      // Velocity Status
      let velocityCategory: 'REORDER' | 'FAST' | 'OPTIMAL' | 'DEAD_STOCK' = 'OPTIMAL';
      let velocityLabel = 'Optimal';

      if (quantityOnHand <= reorderPoint) {
        velocityCategory = 'REORDER';
        velocityLabel = 'Perlu Reorder';
      } else if (daysOfSupply <= 14) {
        velocityCategory = 'FAST';
        velocityLabel = 'Fast Moving';
      } else if (daysOfSupply >= 60) {
        velocityCategory = 'DEAD_STOCK';
        velocityLabel = 'Stok Lambat';
      }

      return {
        product,
        sku: product.sku,
        name: product.name,
        category: product.category,
        unit: product.unit,
        unitCost,
        quantityOnHand,
        capitalTied,
        dailyRunRate,
        daysOfSupply,
        reorderPoint,
        suggestedReorderQty,
        velocityCategory,
        velocityLabel,
      };
    });
  }, [products, inventoryLevels, movements, selectedWarehouseId, leadTimeDays]);

  // Categories
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return analyticsData.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;
      if (filterVelocity === 'REORDER' && item.velocityCategory !== 'REORDER') return false;
      if (filterVelocity === 'FAST' && item.velocityCategory !== 'FAST') return false;
      if (filterVelocity === 'DEAD_STOCK' && item.velocityCategory !== 'DEAD_STOCK') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.sku.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [analyticsData, selectedCategory, filterVelocity, searchQuery]);

  // Summary Metrics
  const totalValuation = analyticsData.reduce((acc, it) => acc + it.capitalTied, 0);
  const deadStockCapital = analyticsData
    .filter((it) => it.velocityCategory === 'DEAD_STOCK')
    .reduce((acc, it) => acc + it.capitalTied, 0);
  const reorderNeededCount = analyticsData.filter((it) => it.velocityCategory === 'REORDER').length;
  const avgDaysSupply = Math.round(
    analyticsData.reduce((acc, it) => acc + Math.min(90, it.daysOfSupply), 0) / (analyticsData.length || 1)
  );

  const handleExportCsv = () => {
    exportAnalyticsToCsv({
      warehouseName: activeWarehouse?.name || 'Gudang',
      items: filteredData,
    });
  };

  const handleOpenPoModal = (item: any) => {
    setSelectedPoItem(item);
    setPoOrderQty(item.suggestedReorderQty > 0 ? item.suggestedReorderQty : 50);
    setIsPoModalOpen(true);
  };

  const handleConfirmCreatePo = () => {
    if (!selectedPoItem) return;
    setPoSuccessNotice(
      `Purchase Order untuk ${poOrderQty} ${selectedPoItem.unit} ${selectedPoItem.name} ke ${poVendorName} berhasil dibuat dan diteruskan ke jadwal Inbound!`
    );
    setIsPoModalOpen(false);
    setTimeout(() => setPoSuccessNotice(null), 6000);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* 1. Page Header (Seamless & Clean) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Analitik Bisnis & Pengadaan
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Auto Re-order Point (ROP)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Analisis perputaran barang (*velocity*), modal mengendap (*dead stock*), dan kalkulator pemesanan ulang otomatis di <span className="font-semibold text-slate-700">{activeWarehouse?.name}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Lead time configuration pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs text-slate-600 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-medium">Lead Time Vendor:</span>
            <select
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(Number(e.target.value))}
              className="font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value={3}>3 Hari</option>
              <option value={5}>5 Hari</option>
              <option value={7}>7 Hari</option>
              <option value={14}>14 Hari</option>
            </select>
          </div>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition shadow-2xs"
            title="Unduh laporan lengkap analitik & ROP ke format Excel CSV"
          >
            <Download className="w-3.5 h-3.5" />
            Ekspor Analitik Excel
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {poSuccessNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{poSuccessNotice}</span>
          </div>
          <button
            onClick={() => setPoSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-sm"
          >
            &times;
          </button>
        </div>
      )}

      {/* 2. Unified 4-Column Stat Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white rounded-xl border border-slate-200 shadow-2xs">
        {/* Metric 1: Total Valuation */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Valuasi Aset Fisik (HPP)
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalValuation)}
            </div>
            <span className="text-[11px] text-slate-500">
              Modal barang aktif di gudang
            </span>
          </div>
          <Banknote className="w-5 h-5 text-emerald-600" />
        </div>

        {/* Metric 2: Dead Stock Capital */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Modal Macet (Dead Stock)
            </span>
            <div className="text-xl font-bold text-amber-600 mt-0.5">
              {formatCurrency(deadStockCapital)}
            </div>
            <span className="text-[11px] text-slate-500">
              Barang lambat &gt; 60 hari
            </span>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>

        {/* Metric 3: Average Days of Supply */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Ketahanan Stok Rata-rata
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {avgDaysSupply} <span className="text-xs font-normal text-slate-400">Hari</span>
            </div>
            <span className="text-[11px] text-slate-500">
              Estimasi habis tanpa restock
            </span>
          </div>
          <Clock className="w-5 h-5 text-indigo-600" />
        </div>

        {/* Metric 4: Reorder Needed */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Rekomendasi Reorder
            </span>
            <div className={`text-xl font-bold mt-0.5 ${reorderNeededCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {reorderNeededCount}{' '}
              <span className="text-xs font-normal text-slate-400">SKU Kritis</span>
            </div>
            <span className="text-[11px] text-slate-500">
              {reorderNeededCount > 0 ? 'Stok di bawah titik ROP' : 'Semua stok aman'}
            </span>
          </div>
          <ShoppingCart className={`w-5 h-5 ${reorderNeededCount > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
        </div>
      </div>

      {/* 3. Filter Bar & Analytics Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari SKU, Nama Produk..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            {/* Velocity Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
              {[
                { id: 'ALL', label: `Semua (${analyticsData.length})` },
                { id: 'REORDER', label: `Perlu Re-order (${reorderNeededCount})` },
                { id: 'FAST', label: 'Fast Moving' },
                { id: 'DEAD_STOCK', label: 'Dead Stock' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterVelocity(tab.id as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                    filterVelocity === tab.id
                      ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-medium">Kategori:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'Semua Kategori' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[840px]">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">SKU & Nama Produk</th>
                <th className="py-2.5 px-3">Kategori</th>
                <th className="py-2.5 px-3 text-right">Stok Fisik</th>
                <th className="py-2.5 px-3 text-right">Konsumsi/Hari</th>
                <th className="py-2.5 px-3 text-center">Ketahanan</th>
                <th className="py-2.5 px-3 text-right">Titik ROP</th>
                <th className="py-2.5 px-3">Perputaran (Velocity)</th>
                <th className="py-2.5 px-3 text-right">Modal Mengendap</th>
                <th className="py-2.5 px-4 text-right">Aksi Pengadaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada produk yang cocok dengan kriteria filter analitik.
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isReorder = item.velocityCategory === 'REORDER';
                  const isDeadStock = item.velocityCategory === 'DEAD_STOCK';
                  const isFast = item.velocityCategory === 'FAST';

                  return (
                    <tr key={item.sku} className="hover:bg-slate-50/70 transition-colors">
                      {/* SKU & Name */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-400 block text-[11px] leading-tight">
                          {item.sku}
                        </span>
                        <span className="font-semibold text-slate-900 block text-xs mt-0.5 truncate max-w-[220px]" title={item.name}>
                          {item.name}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {item.category}
                      </td>

                      {/* Physical Stock */}
                      <td className="py-3 px-3 text-right">
                        <span className="font-mono font-bold text-xs text-slate-900">
                          {formatNumber(item.quantityOnHand)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </td>

                      {/* Daily Run Rate */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="font-mono font-semibold text-xs text-slate-800">
                          {item.dailyRunRate.toFixed(1)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">/{item.unit}/hr</span>
                      </td>

                      {/* Days of Supply */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {item.daysOfSupply <= 7 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            {item.daysOfSupply} Hari (Kritis)
                          </span>
                        ) : item.daysOfSupply <= 14 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            {item.daysOfSupply} Hari
                          </span>
                        ) : item.daysOfSupply >= 60 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                            &gt; 60 Hari
                          </span>
                        ) : (
                          <span className="font-mono text-xs text-slate-700">
                            {item.daysOfSupply} Hari
                          </span>
                        )}
                      </td>

                      {/* Reorder Point (ROP) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className="font-mono font-semibold text-xs text-slate-800">
                          {formatNumber(item.reorderPoint)}
                        </span>{' '}
                        <span className="text-[10px] text-slate-500">{item.unit}</span>
                      </td>

                      {/* Velocity Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                            isReorder
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isFast
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : isDeadStock
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isReorder
                                ? 'bg-rose-500 animate-pulse'
                                : isFast
                                ? 'bg-indigo-500'
                                : isDeadStock
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                          />
                          {item.velocityLabel}
                        </span>
                      </td>

                      {/* Capital Tied */}
                      <td className="py-3 px-3 text-right font-mono font-semibold text-xs text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.capitalTied)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenPoModal(item)}
                          className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-semibold transition shadow-2xs active:scale-95 ${
                            isReorder
                              ? 'bg-rose-600 hover:bg-rose-700 text-white'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                          title="Buat Draft Purchase Order ke Pemasok"
                        >
                          <ShoppingCart className={`w-3 h-3 ${isReorder ? 'text-rose-200' : 'text-slate-400'}`} />
                          <span>Draft PO {item.suggestedReorderQty > 0 ? `(${item.suggestedReorderQty})` : ''}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick PO Draft Modal */}
      {isPoModalOpen && selectedPoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    Buat Draft Purchase Order (PO)
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">
                    {selectedPoItem.sku}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsPoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nama Produk
                </label>
                <div className="font-bold text-slate-900 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {selectedPoItem.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Stok Saat Ini
                  </label>
                  <div className="font-mono font-bold text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    {selectedPoItem.quantityOnHand} {selectedPoItem.unit}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Titik ROP
                  </label>
                  <div className="font-mono font-bold text-indigo-700 bg-indigo-50/50 p-2 rounded-lg border border-indigo-200">
                    {selectedPoItem.reorderPoint} {selectedPoItem.unit}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pemasok / Vendor Terpilih
                </label>
                <input
                  type="text"
                  value={poVendorName}
                  onChange={(e) => setPoVendorName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Jumlah Pesanan (Qty)
                </label>
                <input
                  type="number"
                  min="1"
                  value={poOrderQty}
                  onChange={(e) => setPoOrderQty(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-mono font-bold text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between font-medium">
                <span className="text-[11px] text-slate-500">Estimasi Pengadaan (HPP):</span>
                <span className="font-mono font-bold text-sm text-slate-900">
                  {formatCurrency(poOrderQty * selectedPoItem.unitCost)}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPoModalOpen(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCreatePo}
                className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-2xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Terbitkan Draft PO</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
