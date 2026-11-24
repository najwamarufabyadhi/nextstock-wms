'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { X, PackagePlus, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddProductModal({ isOpen, onClose }: AddProductModalProps) {
  const { addProduct, products } = useInventory();

  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Packaging');
  const [unit, setUnit] = useState('pcs');
  const [unitCost, setUnitCost] = useState<number>(10000);
  const [minStockAlert, setMinStockAlert] = useState<number>(10);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (products.some((p) => p.sku.toLowerCase() === sku.trim().toLowerCase())) {
      setErrorMsg(`SKU "${sku}" sudah terdaftar! SKU harus unik.`);
      return;
    }

    addProduct({
      sku: sku.trim().toUpperCase(),
      name: name.trim(),
      category: category.trim(),
      unit: unit.trim().toLowerCase(),
      unitCost,
      minStockAlert,
    });

    setSuccessMsg('Master SKU produk berhasil didaftarkan!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-full bg-slate-100 text-slate-800">
              <PackagePlus className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Tambah Master SKU</h2>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kode SKU (Unik)
              </label>
              <input
                type="text"
                placeholder="SKU-LOG-009"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-semibold uppercase text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Kategori
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-900"
              >
                <option value="Packaging">Packaging</option>
                <option value="Equipment">Equipment</option>
                <option value="Safety Gear">Safety Gear</option>
                <option value="Consumables">Consumables</option>
                <option value="Raw Material">Raw Material</option>
                <option value="Umum">Umum</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Produk / Barang
            </label>
            <input
              type="text"
              placeholder="Contoh: Lakban Bening 2 Inch 100 Yard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Satuan Dasar
              </label>
              <input
                type="text"
                placeholder="pcs / roll / box"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                HPP Satuan (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Min. Alert
              </label>
              <input
                type="number"
                min="1"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(Number(e.target.value))}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-900"
                required
              />
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
              Daftarkan SKU
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
