'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { X, ClipboardCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StockOpnameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StockOpnameModal({ isOpen, onClose }: StockOpnameModalProps) {
  const { warehouses, products, selectedWarehouseId, getStockLevel, submitOpname } =
    useInventory();

  const [warehouseId, setWarehouseId] = useState(
    selectedWarehouseId || warehouses[0]?.id || ''
  );
  const [notes, setNotes] = useState('');
  // Initialize counts for all products in warehouse
  const [counts, setCounts] = useState<{ [productId: string]: number }>(() => {
    const initial: { [id: string]: number } = {};
    products.forEach((p) => {
      initial[p.id] = getStockLevel(selectedWarehouseId || warehouses[0]?.id || '', p.id);
    });
    return initial;
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleWarehouseChange = (newWhId: string) => {
    setWarehouseId(newWhId);
    const updated: { [id: string]: number } = {};
    products.forEach((p) => {
      updated[p.id] = getStockLevel(newWhId, p.id);
    });
    setCounts(updated);
  };

  const handleCountChange = (productId: string, val: number) => {
    setCounts((prev) => ({
      ...prev,
      [productId]: Math.max(0, val),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const items = products.map((p) => ({
      productId: p.id,
      physicalQty: counts[p.id] ?? getStockLevel(warehouseId, p.id),
    }));

    const res = submitOpname({
      warehouseId,
      notes,
      items,
    });

    if (res.success) {
      setSuccessMsg('Hasil hitungan Stock Opname berhasil diajukan untuk approval!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.message || 'Gagal mengajukan Stock Opname.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-amber-100 text-amber-700">
                <ClipboardCheck className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Formulir Stock Opname</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Input hasil hitungan fisik di rak. Selisih akan diproses menjadi mutasi ADJUSTMENT setelah disetujui.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 my-4 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/60 rounded-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 my-4 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-2xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Pilih Gudang Target
              </label>
              <select
                value={warehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900 font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Keterangan Opname
              </label>
              <input
                type="text"
                placeholder="Contoh: Audit stok akhir bulan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Daftar SKU & Perhitungan Fisik
            </label>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              <div className="grid grid-cols-12 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-500">
                <span className="col-span-6">Nama Produk & SKU</span>
                <span className="col-span-2 text-center">Stok Sistem</span>
                <span className="col-span-2 text-center">Hitungan Fisik</span>
                <span className="col-span-2 text-right">Selisih</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {products.map((p) => {
                  const systemQty = getStockLevel(warehouseId, p.id);
                  const physQty = counts[p.id] ?? systemQty;
                  const diff = physQty - systemQty;

                  return (
                    <div key={p.id} className="grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50/50">
                      <div className="col-span-6 pr-2">
                        <div className="font-semibold text-xs text-slate-900 truncate">{p.name}</div>
                        <div className="text-[11px] text-slate-400">{p.sku} • {p.unit}</div>
                      </div>
                      <div className="col-span-2 text-center font-bold text-xs text-slate-600">
                        {systemQty}
                      </div>
                      <div className="col-span-2 text-center">
                        <input
                          type="number"
                          min="0"
                          value={physQty}
                          onChange={(e) => handleCountChange(p.id, Number(e.target.value))}
                          className="w-16 bg-[#F4F5F7] border border-slate-200 rounded-lg text-center text-xs py-1 font-bold text-slate-900"
                        />
                      </div>
                      <div className="col-span-2 text-right">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            diff === 0
                              ? 'bg-slate-100 text-slate-600'
                              : diff > 0
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full text-sm font-medium bg-[#0B101E] text-white hover:bg-slate-800 transition active:scale-95 shadow-sm"
            >
              Ajukan Dokumen Opname
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
