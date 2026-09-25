import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  ShoppingCart, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Package, 
  Wrench, 
  Plus, 
  Minus, 
  Receipt,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Item, Penjualan } from '../types';
import { formatRupiah } from '../utils/formatters';

interface UserFormPenjualanProps {
  isOpen: boolean;
  onClose: () => void;
  items?: Item[];
  onSavePenjualan: (newSale: Penjualan, updatedItem: Item) => void;
}

export const UserFormPenjualan: React.FC<UserFormPenjualanProps> = ({
  isOpen,
  onClose,
  items = [],
  onSavePenjualan,
}) => {
  const [selectedKode, setSelectedKode] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [qty, setQty] = useState<string>('1');
  const [hargaJasa, setHargaJasa] = useState<string>('0');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Selected item lookup
  const currentItem = useMemo(() => {
    return (items || []).find((it) => it.kodeBarang === selectedKode) || null;
  }, [items, selectedKode]);

  // Filtered item list for easy search
  const filteredItemList = useMemo(() => {
    if (!searchFilter.trim()) return items;
    const q = searchFilter.toLowerCase();
    return items.filter(
      (it) =>
        it.kodeBarang.toLowerCase().includes(q) ||
        it.namaBarang.toLowerCase().includes(q) ||
        it.jenisKendaraan.toLowerCase().includes(q)
    );
  }, [items, searchFilter]);

  // Numeric conversions
  const qtyNumber = useMemo(() => {
    const val = parseInt(qty, 10);
    return isNaN(val) ? 0 : val;
  }, [qty]);

  const jasaNumber = useMemo(() => {
    const cleanStr = String(hargaJasa).replace(/[^0-9]/g, '');
    const val = parseInt(cleanStr, 10);
    return isNaN(val) ? 0 : val;
  }, [hargaJasa]);

  // Calculations
  const totalPart = useMemo(() => {
    if (!currentItem || qtyNumber <= 0) return 0;
    return currentItem.hargaJual * qtyNumber;
  }, [currentItem, qtyNumber]);

  const totalPenjualan = useMemo(() => {
    return totalPart + jasaNumber;
  }, [totalPart, jasaNumber]);

  const totalHPP = useMemo(() => {
    if (!currentItem || qtyNumber <= 0) return 0;
    return currentItem.hargaModal * qtyNumber;
  }, [currentItem, qtyNumber]);

  const estimasiLabaKotor = useMemo(() => {
    return totalPenjualan - totalHPP;
  }, [totalPenjualan, totalHPP]);

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      if (items.length > 0 && !selectedKode) {
        setSelectedKode(items[0].kodeBarang);
      }
      setQty('1');
      setHargaJasa('0');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, items, selectedKode]);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedKode(items.length > 0 ? items[0].kodeBarang : '');
    setSearchFilter('');
    setQty('1');
    setHargaJasa('0');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleQtyAdjust = (delta: number) => {
    const currentVal = parseInt(qty, 10) || 0;
    const maxVal = currentItem ? currentItem.stokSaatIni : 999;
    const nextVal = Math.max(1, Math.min(maxVal, currentVal + delta));
    setQty(nextVal.toString());
  };

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!currentItem) {
      setErrorMsg('Silakan pilih sparepart terlebih dahulu!');
      return;
    }

    if (qtyNumber <= 0) {
      setErrorMsg('Jumlah (Qty) harus minimal 1 unit!');
      return;
    }

    if (qtyNumber > currentItem.stokSaatIni) {
      setErrorMsg(
        `Stok tidak mencukupi! Stok [${currentItem.namaBarang}] hanya tersisa ${currentItem.stokSaatIni} pcs.`
      );
      return;
    }

    // Real-time date
    const dateNow = new Date();
    const formattedDate = dateNow.toISOString().split('T')[0];
    const randId = Math.floor(100 + Math.random() * 900);
    const noTransaksi = `PJ-${formattedDate.replace(/-/g, '')}-${randId}`;

    const newSale: Penjualan = {
      noTransaksi,
      tanggal: formattedDate,
      kodeBarang: currentItem.kodeBarang,
      namaBarang: currentItem.namaBarang,
      jenisKendaraan: currentItem.jenisKendaraan,
      qty: qtyNumber,
      hargaJual: currentItem.hargaJual,
      totalPart,
      hargaJasa: jasaNumber,
      totalPenjualan,
      totalHPP,
      labaKotor: estimasiLabaKotor,
    };

    // Update Stock
    const sisaStok = currentItem.stokSaatIni - qtyNumber;
    const updatedItem: Item = {
      ...currentItem,
      stokSaatIni: sisaStok,
    };

    onSavePenjualan(newSale, updatedItem);

    const reorderWarning =
      sisaStok <= currentItem.minimalStok
        ? ` ⚠️ Perhatian: Sisa stok ${sisaStok} pcs (<= batas min ${currentItem.minimalStok} pcs).`
        : '';

    setSuccessMsg(
      `✓ Transaksi ${noTransaksi} berhasil disimpan! Total Tagihan: ${formatRupiah(totalPenjualan)}.${reorderWarning}`
    );

    // Reset Qty & Jasa for next sale
    setQty('1');
    setHargaJasa('0');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-slate-100 rounded-2xl shadow-2xl border border-slate-300 w-full max-w-5xl xl:max-w-6xl overflow-hidden flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Landscape Header with Prominent Close Button */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-emerald-300 shadow-inner">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base text-white tracking-wide">
                  Input Penjualan &amp; Kasir Jasa Servis
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400 text-emerald-950 uppercase">
                  POS Landscape
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/90 hidden sm:block">
                Pencatatan kasir suku cadang, ongkos jasa mekanik, dan pengurangan stok otomatis
              </p>
            </div>
          </div>

          {/* Dedicated Easy-to-Hit Close Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105"
              title="Tutup Jendela Kasir (Esc)"
            >
              <X className="w-4 h-4" />
              <span>Tutup (Esc)</span>
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSimpan} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Notifications */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-900 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-xs animate-shake">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
          )}

          {/* 3-COLUMN LANDSCAPE GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            {/* ============================================================== */}
            {/* KOLOM 1: DATA SPAREPART & STOK GUDANG (lg:col-span-5) */}
            {/* ============================================================== */}
            <div className="lg:col-span-5 bg-white border border-slate-300 rounded-xl p-4 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800 uppercase tracking-wider">
                  <Package className="w-4 h-4 text-emerald-600" />
                  <span>1. Pilih Suku Cadang</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {items.length} Sparepart Terdaftar
                </span>
              </div>

              {/* Pencarian & Dropdown Sparepart */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pilih Sparepart (txtKodeBarang) <span className="text-rose-500">*</span>:
                </label>
                <select
                  value={selectedKode}
                  onChange={(e) => setSelectedKode(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-emerald-500/60 rounded-lg bg-emerald-50/40 font-mono font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
                >
                  <option value="">-- Pilih Kode / Nama Sparepart --</option>
                  {filteredItemList.map((it) => (
                    <option key={it.kodeBarang} value={it.kodeBarang}>
                      {it.kodeBarang} — {it.namaBarang} (Stok: {it.stokSaatIni})
                    </option>
                  ))}
                </select>
              </div>

              {/* Card Detail Barang Terpilih */}
              {currentItem ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900 text-sm">{currentItem.namaBarang}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{currentItem.jenisKendaraan}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-slate-700 bg-white border border-slate-300 text-[10px]">
                      {currentItem.kodeBarang}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Harga Jual Satuan:</span>
                      <strong className="text-slate-900 font-mono text-sm">
                        {formatRupiah(currentItem.hargaJual)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Stok Tersedia:</span>
                      <div className="flex items-center gap-1.5">
                        <strong className={`font-mono text-sm ${
                          currentItem.stokSaatIni <= currentItem.minimalStok
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                        }`}>
                          {currentItem.stokSaatIni} pcs
                        </strong>
                        {currentItem.stokSaatIni <= currentItem.minimalStok && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                            Minim!
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-400">
                  Pilih salah satu sparepart dari daftar di atas
                </div>
              )}

              {/* Input Qty dengan Tombol Cepat */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Jumlah Dibeli (Qty Part):
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQtyAdjust(-1)}
                    disabled={qtyNumber <= 1}
                    className="w-10 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={currentItem ? currentItem.stokSaatIni : 999}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="w-full text-center py-2 text-lg font-black font-mono border-2 border-emerald-400 rounded-lg bg-white text-emerald-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={() => handleQtyAdjust(1)}
                    disabled={!currentItem || qtyNumber >= currentItem.stokSaatIni}
                    className="w-10 h-10 rounded-lg bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-bold flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-500">
                  <span>Subtotal Part:</span>
                  <span className="font-mono font-bold text-slate-800 text-xs">
                    {formatRupiah(totalPart)}
                  </span>
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* KOLOM 2: BIAYA JASA SERVIS & TARIF CEPAT (lg:col-span-4) */}
            {/* ============================================================== */}
            <div className="lg:col-span-4 bg-amber-50/50 border border-amber-300 rounded-xl p-4 shadow-xs space-y-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 uppercase tracking-wider">
                    <Wrench className="w-4 h-4 text-amber-700" />
                    <span>2. Biaya Jasa Servis</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    100% Margin Laba
                  </span>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Tarif Biaya Jasa Servis / Pasang (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={hargaJasa}
                      onChange={(e) => setHargaJasa(e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 border-2 border-amber-400 rounded-lg bg-white font-mono font-black text-amber-950 text-base focus:ring-2 focus:ring-amber-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-1">
                    Isi 0 jika transaksi hanya membeli suku cadang tanpa jasa pasang
                  </span>
                </div>

                {/* Quick Presets Jasa Bengkel */}
                <div className="mt-3 space-y-1.5">
                  <div className="text-[11px] font-bold text-amber-900">
                    Pilihan Cepat Jasa Bengkel:
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Tanpa Jasa', val: 0 },
                      { label: 'Ganti Oli (15rb)', val: 15000 },
                      { label: 'Ganti Ban (25rb)', val: 25000 },
                      { label: 'Servis Ringan (35rb)', val: 35000 },
                      { label: 'Servis CVT (45rb)', val: 45000 },
                      { label: 'Tune Up (50rb)', val: 50000 },
                    ].map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setHargaJasa(preset.val.toString())}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all text-left flex items-center justify-between cursor-pointer ${
                          jasaNumber === preset.val
                            ? 'bg-amber-600 text-white border-amber-700 shadow-xs font-bold'
                            : 'bg-white text-slate-700 border-amber-200 hover:bg-amber-100/70'
                        }`}
                      >
                        <span className="truncate">{preset.label}</span>
                        <span className="font-mono text-[10px] opacity-80">
                          {preset.val > 0 ? `${preset.val / 1000}k` : '0'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-amber-100/70 rounded-lg text-[11px] text-amber-900 border border-amber-300">
                💡 <strong>Kaidah Akuntansi:</strong> Pendapatan jasa tidak memotong persediaan fisik dan menghasilkan margin keuntungan penuh.
              </div>
            </div>

            {/* ============================================================== */}
            {/* KOLOM 3: LAYAR KASIR POS & REKAP PEMBAYARAN (lg:col-span-3) */}
            {/* ============================================================== */}
            <div className="lg:col-span-3 bg-slate-900 text-white rounded-xl p-4 shadow-md flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-amber-400 uppercase tracking-wider">
                    <Receipt className="w-4 h-4" />
                    <span>3. Kasir &amp; Bayar</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    LIVE CALC
                  </span>
                </div>

                {/* POS Totals Card */}
                <div className="space-y-2 text-xs pt-3">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal Part:</span>
                    <span className="font-mono font-semibold">{formatRupiah(totalPart)}</span>
                  </div>

                  <div className="flex justify-between text-slate-300">
                    <span>Biaya Jasa:</span>
                    <span className="font-mono font-semibold text-amber-300">+{formatRupiah(jasaNumber)}</span>
                  </div>

                  <div className="border-t border-slate-700 pt-2 pb-1">
                    <span className="text-[10px] text-slate-400 block uppercase tracking-wider">
                      TOTAL PEMBAYARAN KASIR:
                    </span>
                    <div className="text-2xl xl:text-3xl font-black font-mono text-emerald-400 tracking-tight mt-0.5">
                      {formatRupiah(totalPenjualan)}
                    </div>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                    <span>Est. Laba Kotor:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {formatRupiah(estimasiLabaKotor)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons in POS Panel */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={!currentItem || currentItem.stokSaatIni <= 0}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Transaksi (Enter)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-lg transition text-center cursor-pointer"
                  >
                    Reset
                  </button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="py-1.5 px-2 bg-rose-900/80 hover:bg-rose-800 text-rose-200 text-[11px] font-semibold rounded-lg transition text-center cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Brand Banner */}
        <div className="bg-slate-200/90 border-t border-slate-300 px-5 py-2 text-[10px] text-slate-600 flex items-center justify-between shrink-0">
          <span>
            💡 <strong>Shortcut:</strong> Tekan tombol <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold">Esc</kbd> untuk menutup jendela kasir dengan cepat.
          </span>
          <span className="font-medium hidden sm:inline">
            Developer &amp; System Owner: Rycko Computer / IT Solution
          </span>
        </div>
      </div>
    </div>
  );
};
