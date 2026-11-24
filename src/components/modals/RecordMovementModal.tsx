'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { formatCurrency } from '@/lib/utils';
import { X, ArrowDownLeft, ArrowUpRight, AlertCircle, CheckCircle2, Layers, DollarSign } from 'lucide-react';

interface RecordMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProductId?: string;
  defaultBatchNo?: string;
  defaultType?: 'IN' | 'OUT';
}

export default function RecordMovementModal({
  isOpen,
  onClose,
  defaultProductId,
  defaultBatchNo,
  defaultType,
}: RecordMovementModalProps) {
  const { products, warehouses, selectedWarehouseId, getStockLevel, recordMovement } =
    useInventory();

  const [type, setType] = useState<'IN' | 'OUT'>(defaultType || 'IN');
  const [warehouseId, setWarehouseId] = useState(selectedWarehouseId || warehouses[0]?.id || '');
  const [productId, setProductId] = useState(defaultProductId || products[0]?.id || '');
  const [batchNo, setBatchNo] = useState(defaultBatchNo || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sync props on change
  useEffect(() => {
    if (defaultProductId) setProductId(defaultProductId);
    if (defaultBatchNo) setBatchNo(defaultBatchNo);
    if (defaultType) setType(defaultType);
  }, [defaultProductId, defaultBatchNo, defaultType]);

  const selectedProduct = products.find((p) => p.id === productId);
  const currentStock = getStockLevel(warehouseId, productId);

  // Packaging UoM Options
  const packagingOptions = useMemo(() => {
    if (!selectedProduct) return [{ label: 'Unit Dasar', multiplier: 1, unitName: 'unit' }];
    return [
      {
        label: `${selectedProduct.unit} (Satuan Dasar 1x)`,
        multiplier: 1,
        unitName: selectedProduct.unit,
      },
      ...(selectedProduct.packagingUnits || []).map((u) => ({
        label: `${u.unitName} (Isi ${u.multiplier} ${selectedProduct.unit})`,
        multiplier: u.multiplier,
        unitName: u.unitName,
      })),
    ];
  }, [selectedProduct]);

  // Reset selected unit if product changes
  useEffect(() => {
    setSelectedUnitIndex(0);
  }, [productId]);

  if (!isOpen) return null;

  const currentOption = packagingOptions[selectedUnitIndex] || packagingOptions[0];
  const totalBaseQty = quantity * currentOption.multiplier;
  const estimatedHpp = totalBaseQty * (selectedProduct?.unitCost || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!referenceNo.trim()) {
      setErrorMsg('Nomor referensi (PO / DO / Inv) wajib diisi.');
      return;
    }

    if (quantity <= 0) {
      setErrorMsg('Kuantitas harus lebih dari 0.');
      return;
    }

    if (type === 'OUT' && currentStock < totalBaseQty) {
      setErrorMsg(
        `Stok tidak mencukupi! Tersedia hanya ${currentStock} ${selectedProduct?.unit}. Permintaan keluar: ${totalBaseQty} ${selectedProduct?.unit} (${quantity} ${currentOption.unitName}).`
      );
      return;
    }

    const res = recordMovement({
      warehouseId,
      productId,
      type,
      quantity: totalBaseQty,
      referenceNo,
      notes,
      batchNo: batchNo.trim() || undefined,
      inputUnit: currentOption.unitName,
      inputQty: quantity,
    });

    if (res.success) {
      setSuccessMsg(`Berhasil mencatat mutasi ${type === 'IN' ? 'Barang Masuk' : 'Barang Keluar'}!`);
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1000);
    } else {
      setErrorMsg(res.message || 'Gagal memproses transaksi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl border border-slate-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Catat Mutasi Stok & Kemasan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mendukung konversi otomatis multi-satuan kemasan & estimasi HPP
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle Pills */}
        <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100/80 rounded-2xl my-4">
          <button
            type="button"
            onClick={() => {
              setType('IN');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
              type === 'IN'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Barang Masuk (Inbound)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('OUT');
              setErrorMsg('');
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition ${
              type === 'OUT'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Barang Keluar (Outbound)
          </button>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/60 rounded-2xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60 rounded-2xl">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Lokasi Gudang
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 font-medium"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Produk / Master SKU
              </label>
              <span className="text-xs text-slate-500">
                Stok Fisik: <strong className="text-slate-900 font-bold">{currentStock}</strong> {selectedProduct?.unit}
              </span>
            </div>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 font-medium"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* MULTI-UOM PACKAGING UNIT PICKER */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Satuan Kemasan (UoM)
              </label>
              <select
                value={selectedUnitIndex}
                onChange={(e) => setSelectedUnitIndex(Number(e.target.value))}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-3 py-2.5 text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900"
              >
                {packagingOptions.map((opt, idx) => (
                  <option key={idx} value={idx}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Jumlah ({currentOption.unitName})
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 font-semibold"
                required
              />
            </div>
          </div>

          {/* LIVE AUTO-CONVERSION & HPP PREVIEW PILL */}
          <div className="space-y-2">
            {currentOption.multiplier > 1 && (
              <div className="p-3 bg-blue-50 border border-blue-200/60 rounded-2xl text-xs text-blue-900 font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  Konversi Kemasan Otomatis:
                </span>
                <span>
                  {quantity} {currentOption.unitName} ={' '}
                  <strong className="text-sm font-extrabold text-blue-950">
                    {totalBaseQty} {selectedProduct?.unit}
                  </strong>
                </span>
              </div>
            )}

            <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-2xl text-xs text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                Estimasi Dampak HPP Aset:
              </span>
              <span className="font-extrabold text-slate-900 text-sm">
                {formatCurrency(estimatedHpp)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                No. Referensi
              </label>
              <input
                type="text"
                placeholder={type === 'IN' ? 'PO-2026-001' : 'DO-2026-999'}
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                No. Batch / Lot (FEFO)
              </label>
              <input
                type="text"
                placeholder="Contoh: LOT-2025-F19"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Catatan Operasional (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Keterangan pengiriman, vendor, alasan pengeluaran..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:ring-2 focus:ring-slate-900 resize-none"
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
              Simpan Mutasi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
