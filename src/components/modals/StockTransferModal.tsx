'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { X, ArrowRightLeft, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StockTransferModal({ isOpen, onClose }: StockTransferModalProps) {
  const { warehouses, products, selectedWarehouseId, getStockLevel, createTransfer } =
    useInventory();

  const [fromWarehouseId, setFromWarehouseId] = useState(
    selectedWarehouseId || warehouses[0]?.id || ''
  );
  const [toWarehouseId, setToWarehouseId] = useState(
    warehouses.find((w) => w.id !== selectedWarehouseId)?.id || warehouses[1]?.id || ''
  );
  const [items, setItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: products[0]?.id || '', quantity: 5 },
  ]);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleAddItem = () => {
    // Pick first product not yet in items
    const available = products.find((p) => !items.some((i) => i.productId === p.id));
    setItems([...items, { productId: available ? available.id : products[0]?.id || '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'productId' | 'quantity', val: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    setItems(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (fromWarehouseId === toWarehouseId) {
      setErrorMsg('Gudang asal dan tujuan tidak boleh sama.');
      return;
    }

    const res = createTransfer({
      fromWarehouseId,
      toWarehouseId,
      items,
      notes,
    });

    if (res.success) {
      setSuccessMsg('Surat Jalan Transfer berhasil diterbitkan! Status: IN_TRANSIT');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1200);
    } else {
      setErrorMsg(res.message || 'Gagal membuat transfer barang.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-blue-100 text-blue-600">
                <ArrowRightLeft className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-slate-900">Transfer Antar-Gudang</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Alur 2-langkah: Stok berkurang seketika di gudang asal (IN_TRANSIT) hingga diverifikasi penerima
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

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#F4F5F7] p-4 rounded-2xl">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Gudang Pengirim (Asal)
              </label>
              <select
                value={fromWarehouseId}
                onChange={(e) => setFromWarehouseId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium"
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
                Gudang Penerima (Tujuan)
              </label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 font-medium"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === fromWarehouseId}>
                    {w.name} {w.id === fromWarehouseId ? '(Asal)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Daftar Barang yang Ditransfer
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-semibold text-slate-900 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" /> Tambah Item
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => {
                const maxStock = getStockLevel(fromWarehouseId, item.productId);
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-[#F4F5F7] p-2.5 rounded-2xl border border-slate-200/50"
                  >
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                      >
                        {products.map((p) => {
                          const stock = getStockLevel(fromWarehouseId, p.id);
                          return (
                            <option key={p.id} value={p.id}>
                              [{p.sku}] {p.name} (Tersedia: {stock} {p.unit})
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="w-24">
                      <input
                        type="number"
                        min="1"
                        max={maxStock || 1}
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, 'quantity', Number(e.target.value))
                        }
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-center font-bold text-slate-900"
                        placeholder="Qty"
                        required
                      />
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Instruksi / Catatan Pengiriman
            </label>
            <textarea
              rows={2}
              placeholder="Contoh: Kirim via armada truk internal jam 14:00"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
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
              Terbitkan Transfer (Kirim)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
