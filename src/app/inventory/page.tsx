'use client';

import React, { useState, useMemo } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { formatNumber, formatCurrency } from '@/lib/utils';
import { exportInventoryToCsv } from '@/lib/export-excel';
import VisualBinMap from '@/components/warehouse/VisualBinMap';
import PrintBarcodeModal from '@/components/modals/PrintBarcodeModal';
import RecordMovementModal from '@/components/modals/RecordMovementModal';
import { Product } from '@/types';
import {
  Package,
  Search,
  Download,
  Printer,
  Plus,
  Layers,
  LayoutGrid,
  AlertTriangle,
  Banknote,
  Boxes,
} from 'lucide-react';

export default function InventoryPage() {
  const {
    products,
    inventoryLevels,
    selectedWarehouseId,
    getWarehouseById,
    selectedBin,
    setSelectedBin,
  } = useInventory();

  const [activeTab, setActiveTab] = useState<'table' | 'binMap'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Modals
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printProduct, setPrintProduct] = useState<Product | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordProductId, setRecordProductId] = useState<string | undefined>();

  const activeWarehouse = getWarehouseById(selectedWarehouseId);

  // Categories
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Inventory rows mapped for selected warehouse
  const inventoryData = useMemo(() => {
    return products.map((product) => {
      const invRecord = inventoryLevels.find(
        (inv) => inv.warehouseId === selectedWarehouseId && inv.productId === product.id
      );
      const quantityOnHand = invRecord ? invRecord.quantityOnHand : 0;
      const binLocation = invRecord?.binLocation || 'A-01-01';
      const isLowStock = quantityOnHand > 0 && quantityOnHand <= product.minStockAlert;
      const isOutOfStock = quantityOnHand === 0;
      const totalCost = (product.unitCost || 0) * quantityOnHand;

      return {
        product,
        quantityOnHand,
        binLocation,
        isLowStock,
        isOutOfStock,
        totalCost,
      };
    });
  }, [products, inventoryLevels, selectedWarehouseId]);

  // Filtered rows
  const filteredData = useMemo(() => {
    return inventoryData.filter((item) => {
      if (selectedBin && item.binLocation !== selectedBin) return false;
      if (selectedCategory !== 'ALL' && item.product.category !== selectedCategory) return false;
      if (showLowStockOnly && !item.isLowStock && !item.isOutOfStock) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchSku = item.product.sku.toLowerCase().includes(query);
        const matchName = item.product.name.toLowerCase().includes(query);
        const matchBin = item.binLocation.toLowerCase().includes(query);
        return matchSku || matchName || matchBin;
      }
      return true;
    });
  }, [inventoryData, selectedBin, selectedCategory, showLowStockOnly, searchQuery]);

  // Summary Metrics
  const totalValuation = filteredData.reduce((acc, it) => acc + it.totalCost, 0);
  const totalUnits = filteredData.reduce((acc, it) => acc + it.quantityOnHand, 0);
  const lowStockCount = filteredData.filter((it) => it.isLowStock || it.isOutOfStock).length;

  const handleExportCsv = () => {
    exportInventoryToCsv({
      warehouseName: activeWarehouse?.name || 'Gudang',
      items: filteredData.map((it) => ({
        sku: it.product.sku,
        name: it.product.name,
        category: it.product.category,
        binLocation: it.binLocation,
        quantityOnHand: it.quantityOnHand,
        unit: it.product.unit,
        unitCost: it.product.unitCost || 0,
        totalValuation: it.totalCost,
        status: it.isOutOfStock ? 'Habis (0)' : it.isLowStock ? 'Menipis' : 'Aman',
      })),
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* 1. Page Header (Clean, Integrated, No Floating Bubble Box) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Inventaris & Lokasi Rak
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Katalog SKU fisik, hierarki konversi kemasan, dan pemetaan rak di <span className="font-semibold text-slate-700">{activeWarehouse?.name}</span>.
          </p>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeTab === 'table'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Tabel ({filteredData.length})
          </button>
          <button
            onClick={() => setActiveTab('binMap')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
              activeTab === 'binMap'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Peta Rak 2D {selectedBin ? `(${selectedBin})` : ''}
          </button>
        </div>
      </div>

      {/* 2. Unified Metric Strip (Seamless & Proportionate) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Fisik Barang
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatNumber(totalUnits)}{' '}
              <span className="text-xs font-normal text-slate-400">
                unit ({filteredData.length} SKU)
              </span>
            </div>
          </div>
          <Boxes className="w-5 h-5 text-slate-400" />
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Valuasi Aset HPP
            </span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalValuation)}
            </div>
          </div>
          <Banknote className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Peringatan Kritis
            </span>
            <div
              className={`text-xl font-bold mt-0.5 ${
                lowStockCount > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
            >
              {lowStockCount}{' '}
              <span className="text-xs font-normal text-slate-400">
                {lowStockCount > 0 ? 'SKU perlu restok' : 'Semua aman'}
              </span>
            </div>
          </div>
          <AlertTriangle
            className={`w-5 h-5 ${lowStockCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}
          />
        </div>
      </div>

      {/* 3. Main Content: Table or Visual Bin Map */}
      {activeTab === 'binMap' ? (
        <VisualBinMap />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Controls Bar: Search, Category, Filter, Export */}
          <div className="p-3.5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search input */}
              <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari SKU, Nama Barang, atau Rak..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {cat === 'ALL' ? 'Semua' : cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                className={`h-8 px-2.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 ${
                  showLowStockOnly
                    ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {showLowStockOnly ? 'Hanya Kritis' : 'Filter Kritis'}
              </button>

              <button
                onClick={handleExportCsv}
                className="h-8 px-3 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition"
                title="Unduh laporan Excel / CSV dengan encoding UTF-8 BOM"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                Ekspor Excel
              </button>
            </div>
          </div>

          {/* Professional Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-semibold tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">SKU & Nama Barang</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3 text-center">Lokasi Rak</th>
                  <th className="py-2.5 px-3">Kemasan Satuan</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Stok Fisik</th>
                  <th className="py-2.5 px-3 text-right">HPP</th>
                  <th className="py-2.5 px-3 text-right">Valuasi</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      Tidak ada barang yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredData.map(
                    ({ product, quantityOnHand, binLocation, isLowStock, isOutOfStock, totalCost }) => (
                      <tr key={product.id} className="hover:bg-slate-50/70 transition-colors">
                        {/* SKU & Name */}
                        <td className="py-3 px-4">
                          <span className="font-mono text-slate-400 block text-[11px] leading-tight">
                            {product.sku}
                          </span>
                          <span className="font-semibold text-slate-900 block text-xs mt-0.5">
                            {product.name}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3 text-slate-500 font-medium">
                          {product.category}
                        </td>

                        {/* Location */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => {
                              setSelectedBin(binLocation);
                              setActiveTab('binMap');
                            }}
                            className="font-mono text-xs font-semibold text-indigo-600 hover:underline"
                            title="Klik untuk buka di Peta Rak 2D"
                          >
                            {binLocation}
                          </button>
                        </td>

                        {/* Packaging Units (Clean typography without nested boxes) */}
                        <td className="py-3 px-3">
                          {product.packagingUnits && product.packagingUnits.length > 0 ? (
                            <div className="flex flex-col gap-0.5 text-[11px] text-slate-600">
                              {product.packagingUnits.map((u, i) => (
                                <span key={i} className="font-mono text-slate-500">
                                  1 {u.unitName} ({u.multiplier} {product.unit})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">1 {product.unit}</span>
                          )}
                        </td>

                        {/* Status: Minimalist Dot Indicator */}
                        <td className="py-3 px-3">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-rose-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0"></span>
                              Habis (0)
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                              Menipis (&le;{product.minStockAlert})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                              Aman
                            </span>
                          )}
                        </td>

                        {/* Physical Stock */}
                        <td className="py-3 px-3 text-right">
                          <span className="font-bold text-slate-900 text-xs">
                            {formatNumber(quantityOnHand)}
                          </span>{' '}
                          <span className="text-[11px] text-slate-400 font-normal">
                            {product.unit}
                          </span>
                        </td>

                        {/* HPP Unit Cost */}
                        <td className="py-3 px-3 text-right font-mono text-slate-600 text-xs">
                          {formatCurrency(product.unitCost || 0)}
                        </td>

                        {/* Total Valuation */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(totalCost)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setPrintProduct(product);
                                setIsPrintModalOpen(true);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                              title="Cetak Label Barcode Termal"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setRecordProductId(product.id);
                                setIsRecordModalOpen(true);
                              }}
                              className="h-7 px-2.5 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium transition"
                            >
                              + Mutasi
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Local Modals */}
      <PrintBarcodeModal
        isOpen={isPrintModalOpen}
        onClose={() => {
          setIsPrintModalOpen(false);
          setPrintProduct(null);
        }}
        product={printProduct}
      />

      <RecordMovementModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        defaultProductId={recordProductId}
      />
    </div>
  );
}
