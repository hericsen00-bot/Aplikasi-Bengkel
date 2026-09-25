import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  PackagePlus, 
  PackageCheck, 
  Plus, 
  TrendingUp, 
  Info,
  Sparkles
} from 'lucide-react';
import { Item, Pembelian } from '../types';
import { formatRupiah } from '../utils/formatters';

interface UserFormPembelianProps {
  isOpen: boolean;
  onClose: () => void;
  items?: Item[];
  onSavePembelian: (newPb: Pembelian, newItem?: Item) => void;
  initialKodeBarang?: string;
  defaultKodeBarang?: string;
}

export const UserFormPembelian: React.FC<UserFormPembelianProps> = ({
  isOpen,
  onClose,
  items = [],
  onSavePembelian,
  initialKodeBarang,
  defaultKodeBarang,
}) => {
  const [mode, setMode] = useState<'restok' | 'tambah_baru'>('restok');

  // Mode: Restok Barang Terdaftar
  const [selectedKode, setSelectedKode] = useState<string>('');
  const [qty, setQty] = useState<string>('10');
  const [hargaModalInput, setHargaModalInput] = useState<string>('');

  // Mode: Tambah Sparepart Baru
  const [newKodeBarang, setNewKodeBarang] = useState<string>('');
  const [newNamaBarang, setNewNamaBarang] = useState<string>('');
  const [newJenisKendaraan, setNewJenisKendaraan] = useState<string>('Matic');
  const [newQty, setNewQty] = useState<string>('10');
  const [newHargaModal, setNewHargaModal] = useState<string>('');
  const [newHargaJual, setNewHargaJual] = useState<string>('');
  const [newMinimalStok, setNewMinimalStok] = useState<string>('3');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeDefaultCode = defaultKodeBarang || initialKodeBarang;

  const currentItem = useMemo(() => {
    return (items || []).find((it) => it.kodeBarang === selectedKode) || null;
  }, [items, selectedKode]);

  // Helper to generate next available code BRG-XXX
  const generateNextCode = () => {
    const highestNum = (items || []).reduce((max, item) => {
      if (!item?.kodeBarang) return max;
      const match = item.kodeBarang.match(/BRG-(\d+)/i);
      if (match) {
        const n = parseInt(match[1], 10);
        return n > max ? n : max;
      }
      return max;
    }, 0);
    return `BRG-${String(highestNum + 1).padStart(3, '0')}`;
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      // If items exist, default to restok mode; if no items exist, default to tambah_baru
      if (items.length === 0) {
        setMode('tambah_baru');
      } else {
        setMode('restok');
      }

      const code = activeDefaultCode || (items.length > 0 ? items[0].kodeBarang : '');
      setSelectedKode(code);
      setQty('10');

      // Initialize new item fields
      const nextCode = generateNextCode();
      setNewKodeBarang(nextCode);
      setNewNamaBarang('');
      setNewJenisKendaraan('Matic');
      setNewQty('10');
      setNewHargaModal('');
      setNewHargaJual('');
      setNewMinimalStok('3');
    }
  }, [isOpen, activeDefaultCode, items]);

  useEffect(() => {
    if (currentItem) {
      setHargaModalInput(String(currentItem.hargaModal));
    } else {
      setHargaModalInput('0');
    }
  }, [currentItem]);

  if (!isOpen) return null;

  // Numbers for 'restok' mode
  const qtyNumber = parseInt(qty, 10) || 0;
  const modalNumber = parseInt(hargaModalInput.replace(/[^0-9]/g, ''), 10) || 0;
  const totalHargaRestok = qtyNumber * modalNumber;

  // Numbers for 'tambah_baru' mode
  const newQtyNumber = parseInt(newQty, 10) || 0;
  const newModalNumber = parseInt(newHargaModal.replace(/[^0-9]/g, ''), 10) || 0;
  const newJualNumber = parseInt(newHargaJual.replace(/[^0-9]/g, ''), 10) || 0;
  const newMinStokNumber = parseInt(newMinimalStok, 10) || 0;
  const totalHargaBaru = newQtyNumber * newModalNumber;
  const profitPerUnit = newJualNumber - newModalNumber;
  const marginPercentage = newModalNumber > 0 ? Math.round((profitPerUnit / newModalNumber) * 100) : 0;

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const dateNow = new Date().toISOString().split('T')[0];
    const randId = Math.floor(100 + Math.random() * 900);

    if (mode === 'restok') {
      if (!currentItem) {
        setErrorMsg('Silakan pilih sparepart yang dibeli!');
        return;
      }
      if (qtyNumber <= 0) {
        setErrorMsg('Jumlah Qty restok harus lebih besar dari 0!');
        return;
      }
      if (modalNumber <= 0) {
        setErrorMsg('Harga modal per unit harus lebih besar dari 0!');
        return;
      }

      const newPb: Pembelian = {
        noTransaksi: `PB-${dateNow.replace(/-/g, '')}-${randId}`,
        tanggal: dateNow,
        kodeBarang: currentItem.kodeBarang,
        namaBarang: currentItem.namaBarang,
        jenisKendaraan: currentItem.jenisKendaraan,
        qty: qtyNumber,
        hargaModal: modalNumber,
        totalHarga: totalHargaRestok,
      };

      onSavePembelian(newPb);
      onClose();
    } else {
      // Mode: Tambah Sparepart Baru
      const cleanKode = newKodeBarang.trim().toUpperCase();
      if (!cleanKode) {
        setErrorMsg('Kode Barang tidak boleh kosong!');
        return;
      }

      // Check unique code
      const isExist = items.some(
        (it) => it.kodeBarang.toLowerCase() === cleanKode.toLowerCase()
      );
      if (isExist) {
        setErrorMsg(`Kode Barang [${cleanKode}] sudah terdaftar di database! Gunakan kode lain.`);
        return;
      }

      if (!newNamaBarang.trim()) {
        setErrorMsg('Nama Sparepart wajib diisi!');
        return;
      }
      if (newQtyNumber <= 0) {
        setErrorMsg('Jumlah Qty stok awal pembelian harus lebih dari 0!');
        return;
      }
      if (newModalNumber <= 0) {
        setErrorMsg('Harga Beli / Modal satuan harus lebih besar dari 0!');
        return;
      }
      if (newJualNumber <= 0) {
        setErrorMsg('Harga Jual satuan ke konsumen harus lebih besar dari 0!');
        return;
      }
      if (newJualNumber < newModalNumber) {
        if (!window.confirm('Peringatan: Harga jual lebih rendah daripada harga beli (akan rugi). Tetap lanjutkan?')) {
          return;
        }
      }

      const newItem: Item = {
        kodeBarang: cleanKode,
        namaBarang: newNamaBarang.trim(),
        jenisKendaraan: newJenisKendaraan.trim() || 'Universal',
        hargaModal: newModalNumber,
        hargaJual: newJualNumber,
        stokSaatIni: newQtyNumber,
        minimalStok: newMinStokNumber > 0 ? newMinStokNumber : 3,
      };

      const newPb: Pembelian = {
        noTransaksi: `PB-${dateNow.replace(/-/g, '')}-${randId}`,
        tanggal: dateNow,
        kodeBarang: cleanKode,
        namaBarang: newNamaBarang.trim(),
        jenisKendaraan: newJenisKendaraan.trim() || 'Universal',
        qty: newQtyNumber,
        hargaModal: newModalNumber,
        totalHarga: totalHargaBaru,
      };

      onSavePembelian(newPb, newItem);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white px-4 py-3 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-200" />
            <div>
              <h2 className="font-bold text-sm tracking-wide">
                Input Pembelian &amp; Stok Sparepart
              </h2>
              <p className="text-[11px] text-emerald-100">
                UserForm_Pembelian • Otomatis Sinkron ke Gudang &amp; Akuntansi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tab Switcher */}
        <div className="bg-slate-100 px-4 pt-3 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setMode('restok');
                setErrorMsg(null);
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                mode === 'restok'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Restok Barang Ada</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('tambah_baru');
                setErrorMsg(null);
                if (!newKodeBarang) {
                  setNewKodeBarang(generateNextCode());
                }
              }}
              className={`flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                mode === 'tambah_baru'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PackagePlus className="w-3.5 h-3.5 text-emerald-200" />
              <span>+ Sparepart Baru</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSimpan} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ===================== MODE 1: RESTOK BARANG ADA ===================== */}
          {mode === 'restok' && (
            <div className="space-y-4">
              {/* Pilih Barang */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Pilih Kode Barang / Sparepart <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('tambah_baru');
                      setNewKodeBarang(generateNextCode());
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-0.5 cursor-pointer hover:underline"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Belum ada? Buat baru</span>
                  </button>
                </div>
                
                {items.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 text-xs rounded-lg flex items-center justify-between">
                    <span>Belum ada sparepart di database.</span>
                    <button
                      type="button"
                      onClick={() => setMode('tambah_baru')}
                      className="px-2 py-1 bg-emerald-700 text-white font-bold rounded text-[11px]"
                    >
                      Daftarkan Sekarang
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedKode}
                    onChange={(e) => setSelectedKode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {items.map((it) => (
                      <option key={it.kodeBarang} value={it.kodeBarang}>
                        [{it.kodeBarang}] {it.namaBarang} ({it.jenisKendaraan}) — Sisa: {it.stokSaatIni} pcs
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Read Only Details */}
              {currentItem && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Barang:</span>
                    <span className="font-bold text-slate-800">{currentItem.namaBarang}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jenis Kendaraan:</span>
                    <span className="font-semibold text-slate-700">{currentItem.jenisKendaraan}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stok Saat Ini:</span>
                    <span className="font-bold text-slate-800">{currentItem.stokSaatIni} pcs</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Harga Jual Konsumen:</span>
                    <span className="font-semibold text-emerald-700 font-mono">{formatRupiah(currentItem.hargaJual)}</span>
                  </div>
                </div>
              )}

              {/* Qty & Harga Modal Beli */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Beli (Qty Masuk) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                      pcs
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Beli Satuan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={hargaModalInput}
                    onChange={(e) => setHargaModalInput(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-semibold"
                  />
                </div>
              </div>

              {/* Total Pembelian */}
              <div className="bg-emerald-50 p-3.5 rounded-lg border border-emerald-200 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900">Total Biaya Pembelian:</span>
                <span className="text-base font-extrabold text-emerald-700 font-mono">
                  {formatRupiah(totalHargaRestok)}
                </span>
              </div>
            </div>
          )}

          {/* ===================== MODE 2: TAMBAH SPAREPART BARU ===================== */}
          {mode === 'tambah_baru' && (
            <div className="space-y-3.5">
              {/* Info Banner */}
              <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Sparepart baru akan otomatis didaftarkan ke <strong>Database_Barang</strong> dan transaksi pembelian ini dicatat pada sheet <strong>Pembelian</strong>.
                </p>
              </div>

              {/* Kode Barang & Jenis Kendaraan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kode Barang <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newKodeBarang}
                    onChange={(e) => setNewKodeBarang(e.target.value.toUpperCase())}
                    placeholder="BRG-006"
                    className="w-full px-3 py-2 text-sm font-mono font-bold uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jenis Kendaraan
                  </label>
                  <input
                    type="text"
                    value={newJenisKendaraan}
                    onChange={(e) => setNewJenisKendaraan(e.target.value)}
                    placeholder="Matic / Bebek / Sport"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {/* Quick Pills */}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Matic', 'Bebek', 'Sport', 'Universal'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewJenisKendaraan(cat)}
                        className={`px-1.5 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                          newJenisKendaraan === cat
                            ? 'bg-emerald-100 border-emerald-400 text-emerald-800 font-bold'
                            : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Nama Sparepart */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Sparepart / Barang <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={newNamaBarang}
                  onChange={(e) => setNewNamaBarang(e.target.value)}
                  placeholder="Contoh: Kampas Rem Depan Vario 160"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              {/* Qty Masuk & Minimal Stok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jumlah Beli (Stok Awal) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={newQty}
                      onChange={(e) => setNewQty(e.target.value)}
                      placeholder="10"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                      pcs
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Batas Minimal Stok (Alert)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      value={newMinimalStok}
                      onChange={(e) => setNewMinimalStok(e.target.value)}
                      placeholder="3"
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-medium pointer-events-none">
                      pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* Harga Modal & Harga Jual Konsumen */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Beli / Modal (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newHargaModal}
                    onChange={(e) => setNewHargaModal(e.target.value)}
                    placeholder="Contoh: 35000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-semibold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Harga Jual Konsumen (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newHargaJual}
                    onChange={(e) => setNewHargaJual(e.target.value)}
                    placeholder="Contoh: 50000"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-semibold text-emerald-700"
                  />
                </div>
              </div>

              {/* Real-time Profit Margin Card */}
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1.5">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Total Biaya Pembelian ({newQtyNumber} pcs):</span>
                  <span className="font-mono font-bold text-slate-800">{formatRupiah(totalHargaBaru)}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Estimasi Margin Laba / pcs:</span>
                  <span className={`font-mono font-bold ${profitPerUnit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatRupiah(profitPerUnit)} ({marginPercentage}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              Rycko System • Bengkel
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {mode === 'restok' ? 'Simpan & Tambah Stok' : 'Daftarkan & Beli Sparepart'}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
