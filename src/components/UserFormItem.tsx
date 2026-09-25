import React, { useState, useEffect } from 'react';
import { X, Package, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Item } from '../types';

interface UserFormItemProps {
  isOpen: boolean;
  onClose: () => void;
  existingItem?: Item | null;
  itemToEdit?: Item | null;
  allItems?: Item[];
  items?: Item[];
  existingCodes?: string[];
  onSaveItem: (item: Item, isEdit?: boolean) => void;
}

export const UserFormItem: React.FC<UserFormItemProps> = ({
  isOpen,
  onClose,
  existingItem,
  itemToEdit,
  allItems,
  items,
  existingCodes,
  onSaveItem,
}) => {
  const [kodeBarang, setKodeBarang] = useState('');
  const [namaBarang, setNamaBarang] = useState('');
  const [jenisKendaraan, setJenisKendaraan] = useState('');
  const [hargaModal, setHargaModal] = useState('');
  const [hargaJual, setHargaJual] = useState('');
  const [stokSaatIni, setStokSaatIni] = useState('');
  const [minimalStok, setMinimalStok] = useState('3');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeItem = existingItem ?? itemToEdit ?? null;
  const itemList = allItems ?? items ?? [];

  useEffect(() => {
    if (isOpen) {
      if (activeItem) {
        setKodeBarang(activeItem.kodeBarang);
        setNamaBarang(activeItem.namaBarang);
        setJenisKendaraan(activeItem.jenisKendaraan);
        setHargaModal(String(activeItem.hargaModal));
        setHargaJual(String(activeItem.hargaJual));
        setStokSaatIni(String(activeItem.stokSaatIni));
        setMinimalStok(String(activeItem.minimalStok));
      } else {
        // Auto-generate next code: BRG-001, BRG-002, etc.
        const sourceList = itemList.length > 0 
          ? itemList 
          : (existingCodes || []).map((code) => ({ kodeBarang: code } as Item));
        
        const highestNum = sourceList.reduce((max, item) => {
          if (!item?.kodeBarang) return max;
          const match = item.kodeBarang.match(/BRG-(\d+)/i);
          if (match) {
            const n = parseInt(match[1], 10);
            return n > max ? n : max;
          }
          return max;
        }, 0);
        const nextCode = `BRG-${String(highestNum + 1).padStart(3, '0')}`;
        setKodeBarang(nextCode);
        setNamaBarang('');
        setJenisKendaraan('');
        setHargaModal('');
        setHargaJual('');
        setStokSaatIni('10');
        setMinimalStok('3');
      }
      setErrorMsg(null);
    }
  }, [isOpen, activeItem, itemList, existingCodes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanKode = kodeBarang.trim().toUpperCase();
    const cleanNama = namaBarang.trim();
    const cleanKendaraan = jenisKendaraan.trim();
    const modalNum = parseInt(hargaModal.replace(/[^0-9]/g, ''), 10);
    const jualNum = parseInt(hargaJual.replace(/[^0-9]/g, ''), 10);
    const stokNum = parseInt(stokSaatIni.replace(/[^0-9]/g, ''), 10);
    const minStokNum = parseInt(minimalStok.replace(/[^0-9]/g, ''), 10);

    if (!cleanKode) {
      setErrorMsg('Kode Barang wajib diisi!');
      return;
    }
    if (!cleanNama) {
      setErrorMsg('Nama Sparepart / Barang wajib diisi!');
      return;
    }
    if (!cleanKendaraan) {
      setErrorMsg('Jenis Kendaraan / Kompatibilitas wajib diisi!');
      return;
    }

    if (isNaN(modalNum) || modalNum < 0) {
      setErrorMsg('Harga modal / beli harus berupa angka yang valid!');
      return;
    }
    if (isNaN(jualNum) || jualNum <= 0) {
      setErrorMsg('Harga jual harus lebih besar dari 0!');
      return;
    }
    if (isNaN(stokNum) || stokNum < 0) {
      setErrorMsg('Stok barang harus berupa angka yang valid!');
      return;
    }
    if (isNaN(minStokNum) || minStokNum < 0) {
      setErrorMsg('Minimal stok harus berupa angka yang valid!');
      return;
    }

    // Check duplicate code if adding new
    if (!activeItem) {
      const isExistInItems = itemList.some(
        (it) => it.kodeBarang.toLowerCase() === cleanKode.toLowerCase()
      );
      const isExistInCodes = (existingCodes || []).some(
        (code) => code.toLowerCase() === cleanKode.toLowerCase()
      );
      if (isExistInItems || isExistInCodes) {
        setErrorMsg(`Kode Barang [${cleanKode}] sudah terdaftar di database! Gunakan kode lain.`);
        return;
      }
    }

    const newItem: Item = {
      kodeBarang: cleanKode,
      namaBarang: cleanNama,
      jenisKendaraan: cleanKendaraan,
      hargaModal: modalNum,
      hargaJual: jualNum,
      stokSaatIni: stokNum,
      minimalStok: minStokNum,
    };

    onSaveItem(newItem, Boolean(activeItem));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-slate-300 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* VBA Window Bar */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-200" />
            <div>
              <h2 className="font-bold text-sm tracking-wide">
                {activeItem ? 'Edit Data Sparepart' : 'Tambah Sparepart Baru'}
              </h2>
              <p className="text-[11px] text-blue-100">
                Rycko System • Database_Barang Master
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-300 text-rose-800 text-xs rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Kode Barang */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kode Barang <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={kodeBarang}
                onChange={(e) => setKodeBarang(e.target.value.toUpperCase())}
                placeholder="Contoh: BRG-011"
                disabled={Boolean(existingItem)}
                className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold ${
                  existingItem ? 'bg-slate-100 text-slate-600 cursor-not-allowed' : 'bg-white border-slate-300'
                }`}
              />
              <span className="text-[10px] text-slate-500">ID unik sparepart di sheet Database_Barang</span>
            </div>

            {/* Jenis Kendaraan */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Jenis Kendaraan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={jenisKendaraan}
                onChange={(e) => setJenisKendaraan(e.target.value)}
                placeholder="Contoh: Honda Vario 125/150"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[10px] text-slate-500">Model motor / mobil yang cocok</span>
            </div>
          </div>

          {/* Nama Barang */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nama Barang / Sparepart <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={namaBarang}
              onChange={(e) => setNamaBarang(e.target.value)}
              placeholder="Contoh: Kampas Rem Depan Honda Beat ESP"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* Harga Modal & Harga Jual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Modal / Beli (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={hargaModal}
                onChange={(e) => setHargaModal(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-medium"
              />
              <span className="text-[10px] text-slate-500">Dasar perhitungan HPP saat terjual</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Harga Jual Satuan (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={hargaJual}
                onChange={(e) => setHargaJual(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 text-sm border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono font-bold text-emerald-900 bg-emerald-50/40"
              />
              <span className="text-[10px] text-slate-500">Harga eceran resmi ke konsumen</span>
            </div>
          </div>

          {/* Stok Saat Ini & Minimal Stok */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stok Fisik Saat Ini (Unit/Pcs) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={stokSaatIni}
                onChange={(e) => setStokSaatIni(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
              />
              <span className="text-[10px] text-slate-500">Jumlah ketersediaan di rak bengkel</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Minimal Stok Reorder (Pcs) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={minimalStok}
                onChange={(e) => setMinimalStok(e.target.value)}
                placeholder="3"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <span className="text-[10px] text-slate-500">Batas memicu alarm &amp; reminder restok</span>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-3">
            <span className="text-[11px] text-slate-500 font-medium">
              Developer: Rycko Computer / IT Solution
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
                className="px-4 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-sm transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{activeItem ? 'Simpan Perubahan' : 'Tambah Sparepart'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
