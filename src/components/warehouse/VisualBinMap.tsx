'use client';

import React from 'react';
import { useInventory } from '@/lib/store/inventory-store';
import { LayoutGrid, Layers, MapPin, CheckCircle, AlertTriangle } from 'lucide-react';

export default function VisualBinMap() {
  const { binLocations, selectedBin, setSelectedBin, selectedWarehouseId, getWarehouseById } =
    useInventory();

  const activeWarehouse = getWarehouseById(selectedWarehouseId);
  const warehouseBins = binLocations.filter((b) => b.warehouseId === selectedWarehouseId);

  // Group by aisle
  const aisles = Array.from(new Set(warehouseBins.map((b) => b.aisle)));

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-4 sm:p-5 flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-slate-900 text-white shadow-2xs">
              <LayoutGrid className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Peta Spasial Rak & Bin Gudang (2D Digital Twin)
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">
                Visualisasi keterisian kapasitas rak fisik di {activeWarehouse?.name}
              </p>
            </div>
          </div>

          {selectedBin && (
            <button
              onClick={() => setSelectedBin(null)}
              className="text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition self-start sm:self-auto"
            >
              Reset Filter Rak ({selectedBin}) &times;
            </button>
          )}
        </div>

        {/* Spatial Grid representation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {aisles.map((aisleName) => {
            const aisleBins = warehouseBins.filter((b) => b.aisle === aisleName);
            return (
              <div
                key={aisleName}
                className="bg-slate-50/70 p-3 rounded-lg border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="truncate">{aisleName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {aisleBins.length} Rak
                  </span>
                </div>

                <div className="space-y-2">
                  {aisleBins.map((bin) => {
                    const isSelected = selectedBin === bin.code;
                    const percent = Math.min(
                      100,
                      Math.round((bin.currentUnits / bin.capacityUnits) * 100)
                    );

                    let statusBadge = (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                        Normal
                      </span>
                    );
                    let barColor = 'bg-emerald-500';

                    if (bin.status === 'LOW') {
                      statusBadge = (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                          Menipis
                        </span>
                      );
                      barColor = 'bg-amber-500';
                    }

                    return (
                      <div
                        key={bin.code}
                        onClick={() => setSelectedBin(isSelected ? null : bin.code)}
                        className={`p-2.5 rounded-lg transition cursor-pointer border ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-mono font-bold tracking-tight">{bin.code}</span>
                          {!isSelected && statusBadge}
                          {isSelected && (
                            <span className="text-[10px] font-bold text-white bg-slate-800 px-1.5 py-0.2 rounded">
                              Aktif Filter
                            </span>
                          )}
                        </div>

                        <div
                          className={`text-[11px] mb-2 truncate ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {bin.rack} • {bin.tier}
                        </div>

                        {/* Capacity meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono font-semibold">
                            <span className={isSelected ? 'text-slate-300' : 'text-slate-400'}>
                              {bin.currentUnits} / {bin.capacityUnits}
                            </span>
                            <span className={isSelected ? 'text-white' : 'text-slate-700'}>
                              {percent}%
                            </span>
                          </div>
                          <div
                            className={`w-full h-1.5 rounded-full overflow-hidden ${
                              isSelected ? 'bg-slate-800' : 'bg-slate-100'
                            }`}
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                              style={{ width: `${percent}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <span>Klik kotak rak untuk memfilter inventaris secara instan.</span>
        <span className="font-mono font-semibold text-slate-600">
          {selectedBin ? `Filter aktif: ${selectedBin}` : 'Semua Rak Ditampilkan'}
        </span>
      </div>
    </div>
  );
}
