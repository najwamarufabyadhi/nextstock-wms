'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { X, Warehouse as WarehouseIcon, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddWarehouseModal({ isOpen, onClose }: AddWarehouseModalProps) {
  const { addWarehouse, warehouses } = useInventory();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (warehouses.some((w) => w.code.toLowerCase() === code.trim().toLowerCase())) {
      setErrorMsg(`Kode gudang "${code}" sudah digunakan.`);
      return;
    }

    addWarehouse({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      address: address.trim(),
      isActive: true,
    });

    setSuccessMsg('Cabang Gudang baru berhasil ditambahkan!');
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
              <WarehouseIcon className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Tambah Cabang Gudang</h2>
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
                Kode Gudang
              </label>
              <input
                type="text"
                placeholder="WH-SMG-04"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-semibold uppercase text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nama Gudang / Cabang
              </label>
              <input
                type="text"
                placeholder="Gudang Semarang"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-900"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Alamat Lengkap
            </label>
            <textarea
              rows={2}
              placeholder="Jalan, Kawasan Industri, Kota..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm font-medium text-slate-900 resize-none"
            />
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
              Simpan Gudang
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
