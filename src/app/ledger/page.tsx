'use client';

import React, { useState, useMemo } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { formatDate, formatCurrency } from '@/lib/utils';
import { exportMovementsToCsv } from '@/lib/export-excel';
import {
  FileSpreadsheet,
  Search,
  Download,
  ShieldCheck,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  SlidersHorizontal,
  Calendar,
} from 'lucide-react';

export default function LedgerPage() {
  const { movements, warehouses, selectedWarehouseId, getWarehouseById } = useInventory();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>(selectedWarehouseId);
  const [searchQuery, setSearchQuery] = useState('');

  const activeWarehouse = getWarehouseById(warehouseFilter);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      if (warehouseFilter !== 'ALL' && mov.warehouseId !== warehouseFilter) {
        return false;
      }
      if (typeFilter !== 'ALL' && mov.type !== typeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchSku = mov.productSku?.toLowerCase().includes(query) || false;
        const matchName = mov.productName?.toLowerCase().includes(query) || false;
        const matchRef = mov.referenceNo?.toLowerCase().includes(query) || false;
        const matchUser = mov.createdBy?.toLowerCase().includes(query) || false;
        const matchNotes = mov.notes?.toLowerCase().includes(query) || false;
        return matchSku || matchName || matchRef || matchUser || matchNotes;
      }
      return true;
    });
  }, [movements, warehouseFilter, typeFilter, searchQuery]);

  const handleExportCsv = () => {
    exportMovementsToCsv({
      warehouseName: warehouseFilter === 'ALL' ? 'Semua Gudang (HQ)' : activeWarehouse?.name || 'Gudang',
      movements: filteredMovements,
    });
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto" suppressHydrationWarning>
      {/* 1. Page Header (Seamless & Clean) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Buku Besar Mutasi Stok
            </h1>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Jejak audit kronologis anti-tamper untuk valuasi HPP dan referensi dokumen legal di seluruh gudang.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg transition shadow-2xs self-start sm:self-auto"
          title="Unduh seluruh baris audit ke dalam file CSV / Excel UTF-8 BOM"
        >
          <Download className="w-3.5 h-3.5" />
          Ekspor Jurnal Excel
        </button>
      </div>

      {/* 2. Filter & Data Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari SKU, nama, referensi PO/DO, petugas..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 transition"
              />
            </div>

            {/* Warehouse Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Gudang:</span>
              <select
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">Semua Gudang (Konsolidasi)</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            {[
              { id: 'ALL', label: 'Semua Mutasi' },
              { id: 'IN', label: 'Inbound (Masuk)' },
              { id: 'OUT', label: 'Outbound (Keluar)' },
              { id: 'TRANSFER_IN', label: 'Transfer Masuk' },
              { id: 'TRANSFER_OUT', label: 'Transfer Keluar' },
              { id: 'ADJUSTMENT', label: 'Opname' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition ${
                  typeFilter === t.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Ledger Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[760px]">
            <thead className="bg-slate-50/80 text-slate-500 text-[11px] uppercase tracking-wider border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-3">Gudang</th>
                <th className="py-2.5 px-3">SKU & Barang</th>
                <th className="py-2.5 px-3 text-center">Tipe</th>
                <th className="py-2.5 px-3 text-right">Perubahan</th>
                <th className="py-2.5 px-3 text-right">Dampak HPP</th>
                <th className="py-2.5 px-3">No. Dokumen</th>
                <th className="py-2.5 px-3">Petugas</th>
                <th className="py-2.5 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Tidak ada transaksi mutasi yang cocok dengan kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => {
                  const isPositive = mov.quantityChange > 0;
                  const totalCostVal = Math.abs(mov.totalCost || (mov.unitCost || 0) * mov.quantityChange);

                  return (
                    <tr key={mov.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDate(mov.createdAt)}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                        {mov.warehouseName || 'Gudang Pusat'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono text-slate-400 block text-[11px]">
                          {mov.productSku}
                        </span>
                        <span className="font-semibold text-slate-900 block truncate max-w-[180px]">
                          {mov.productName}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            mov.type === 'IN' || mov.type === 'TRANSFER_IN'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : mov.type === 'OUT' || mov.type === 'TRANSFER_OUT'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {mov.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`font-mono font-semibold text-xs ${
                            isPositive ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {isPositive ? `+${mov.quantityChange}` : mov.quantityChange}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-slate-800">
                        {isPositive ? '+' : '-'}{formatCurrency(totalCostVal)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 font-medium">
                        {mov.referenceNo || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 text-xs">
                        {mov.createdBy || 'Sistem'}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 text-xs max-w-[200px] truncate" title={mov.notes}>
                        {mov.notes || '-'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
