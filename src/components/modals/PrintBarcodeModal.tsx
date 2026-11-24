'use client';

import React, { useState } from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { SvgBarcode, SvgQrCode } from '@/lib/barcode-svg';
import { X, Printer, Check, Copy } from 'lucide-react';
import { Product } from '@/types';

interface PrintBarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

export default function PrintBarcodeModal({
  isOpen,
  onClose,
  product,
}: PrintBarcodeModalProps) {
  const { products, selectedWarehouseId, getWarehouseById, inventoryLevels, batches } =
    useInventory();

  const [selectedProductId, setSelectedProductId] = useState<string>(
    product?.id || products[0]?.id || ''
  );
  const [labelSize, setLabelSize] = useState<'A6' | 'COMPACT'>('COMPACT');
  const [includeQr, setIncludeQr] = useState(true);
  const [selectedBatchNo, setSelectedBatchNo] = useState<string>('LOT-2026-DEFAULT');

  if (!isOpen) return null;

  const currentProduct =
    products.find((p) => p.id === (product?.id || selectedProductId)) || products[0];

  const activeWarehouse = getWarehouseById(selectedWarehouseId);
  const invRecord = inventoryLevels.find(
    (inv) => inv.warehouseId === selectedWarehouseId && inv.productId === currentProduct?.id
  );
  const binLocation = invRecord?.binLocation || 'RAK-A1-01';

  const productBatches = batches.filter(
    (b) => b.productId === currentProduct?.id && b.warehouseId === selectedWarehouseId
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in print:p-0 print:bg-white">
      <div className="bg-white rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl border border-slate-100 print:shadow-none print:border-none print:p-0">
        {/* Modal Controls (Hidden in Print Mode) */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-2xl bg-slate-100 text-slate-800">
              <Printer className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Cetak Label Barcode Termal</h2>
              <p className="text-xs text-slate-500">
                Format standar stiker industri untuk kardus, rak, dan pallet
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Configuration Toolbar (Print: Hidden) */}
        <div className="grid grid-cols-2 gap-3 my-4 print:hidden">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Pilih Produk
            </label>
            <select
              value={currentProduct.id}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-[#F4F5F7] border-0 rounded-2xl px-3 py-2 text-xs font-semibold text-slate-900"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ukuran Label
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLabelSize('COMPACT')}
                className={`py-2 rounded-xl text-xs font-semibold transition ${
                  labelSize === 'COMPACT'
                    ? 'bg-[#0B101E] text-white shadow-sm'
                    : 'bg-[#F4F5F7] text-slate-700 hover:bg-slate-200'
                }`}
              >
                50x30 mm (Rak)
              </button>
              <button
                type="button"
                onClick={() => setLabelSize('A6')}
                className={`py-2 rounded-xl text-xs font-semibold transition ${
                  labelSize === 'A6'
                    ? 'bg-[#0B101E] text-white shadow-sm'
                    : 'bg-[#F4F5F7] text-slate-700 hover:bg-slate-200'
                }`}
              >
                100x150 mm (Kardus)
              </button>
            </div>
          </div>
        </div>

        {/* Printable Thermal Label Sheet Preview */}
        <div className="bg-slate-100 p-6 rounded-2xl flex items-center justify-center my-3 print:bg-white print:p-0">
          <div
            id="thermal-label-area"
            className={`bg-white border-2 border-slate-900 p-5 rounded-xl shadow-md text-slate-950 flex flex-col justify-between print:border-black print:shadow-none ${
              labelSize === 'COMPACT' ? 'w-80 h-52' : 'w-96 h-80'
            }`}
          >
            {/* Top row: Brand & Warehouse */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2">
              <span className="font-extrabold text-sm tracking-tight">NEXSTOCK WMS</span>
              <span className="font-mono text-xs font-bold uppercase">{activeWarehouse?.code}</span>
            </div>

            {/* Middle: Name & SKU */}
            <div className="my-2">
              <h4 className="font-black text-sm leading-snug line-clamp-2">
                {currentProduct.name}
              </h4>
              <div className="flex items-center justify-between text-xs font-mono font-bold mt-1 text-slate-700">
                <span>SKU: {currentProduct.sku}</span>
                <span>RAK: {binLocation}</span>
              </div>
            </div>

            {/* Barcode Vector & QR */}
            <div className="flex items-center justify-between gap-3 bg-white py-1">
              <div className="flex-1">
                <SvgBarcode value={currentProduct.sku} height={46} showText={true} />
              </div>
              {includeQr && (
                <div className="shrink-0">
                  <SvgQrCode value={`https://nexstock.wms/item/${currentProduct.sku}`} size={56} />
                </div>
              )}
            </div>

            {/* Footer: Date & Batch */}
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 border-t-2 border-slate-900 pt-1.5">
              <span>BATCH: {productBatches[0]?.batchNo || selectedBatchNo}</span>
              <span>{new Date().toISOString().split('T')[0]}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (Print: Hidden) */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-100 transition"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-6 py-2.5 rounded-full text-sm font-semibold bg-[#0B101E] text-white hover:bg-slate-800 transition active:scale-95 shadow-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Label (Print)
          </button>
        </div>
      </div>
    </div>
  );
}
