import React, { useState, useEffect } from 'react';
import { X, Receipt, CheckCircle2, AlertCircle } from 'lucide-react';
import { Pengeluaran } from '../types';
import { formatRupiah } from '../utils/formatters';

interface UserFormPengeluaranProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePengeluaran: (newExpense: Pengeluaran) => void;
}

export const UserFormPengeluaran: React.FC<UserFormPengeluaranProps> = ({
  isOpen,
  onClose,
  onSavePengeluaran,
}) => {
  const [kategori, setKategori] = useState<Pengeluaran['kategori']>('Operasional');
  const [keterangan, setKeterangan] = useState<string>('');
  const [jumlah, setJumlah] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKategori('Operasional');
      setKeterangan('');
      setJumlah('');
      setErrorMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keterangan.trim()) {
      setErrorMsg('Keterangan pengeluaran wajib diisi!');
      return;
    }

    const val = parseFloat(jumlah);
    if (isNaN(val) || val <= 0) {
      setErrorMsg('Jumlah pengeluaran harus berupa angka lebih dari 0!');
      return;
    }

    const dateNow = new Date();
    const formattedDate = dateNow.toISOString().split('T')[0];
    const randId = Math.floor(100 + Math.random() * 900);
    const noTransaksi = `PG-${formattedDate.replace(/-/g, '')}-${randId}`;

    const newExpense: Pengeluaran = {
      noTransaksi,
      tanggal: formattedDate,
      kategori,
      keterangan: keterangan.trim(),
      jumlahPengeluaran: val,
    };

    onSavePengeluaran(newExpense);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Title Bar */}
        <div className="bg-gradient-to-r from-purple-700 to-indigo-800 text-white px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Receipt className="w-4 h-4 text-purple-200" />
            <span>UserForm_Pengeluaran (Beban Operasional)</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSimpan} className="p-5 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-300 text-rose-800 text-xs px-3 py-2 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <fieldset className="border border-slate-300 rounded-lg p-3.5 bg-white space-y-3 text-xs">
            <legend className="text-xs font-bold text-slate-700 px-2">
              Input Biaya / Beban Operasional
            </legend>

            {/* Kategori */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Kategori Pengeluaran (cmbKategori) <span className="text-rose-500">*</span>
              </label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value as Pengeluaran['kategori'])}
                className="w-full px-3 py-2 border border-slate-300 rounded bg-purple-50/50 font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              >
                <option value="Operasional">Operasional (Alat cuci, majun, oli bekas, dll)</option>
                <option value="Gaji">Gaji / Uang Makan Mekanik</option>
                <option value="Sewa">Sewa Tempat / Kios Bengkel</option>
                <option value="Listrik/Air">Listrik PLN / Air PDAM</option>
                <option value="Sparepart/Alat">Pembelian Alat Kunci / Special Tools</option>
                <option value="Lainnya">Lainnya (Beban tak terduga)</option>
              </select>
            </div>

            {/* Keterangan */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Keterangan Detail (txtKeterangan) <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={2}
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Contoh: Beli Kunci T 8mm & 10mm Tekiro baru"
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50"
              />
            </div>

            {/* Jumlah Pengeluaran */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Jumlah Pengeluaran (txtJumlah) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">Rp</span>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={jumlah}
                  onChange={(e) => setJumlah(e.target.value)}
                  placeholder="50000"
                  className="w-full pl-10 pr-3 py-2 border border-purple-300 rounded bg-white font-bold text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                />
              </div>
              {parseFloat(jumlah) > 0 && (
                <span className="text-[10px] text-purple-700 font-semibold mt-1 inline-block">
                  Terbilang: {formatRupiah(parseFloat(jumlah))}
                </span>
              )}
            </div>
          </fieldset>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:bg-purple-800 rounded-lg shadow transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan (btnSimpan)</span>
            </button>
          </div>
          {/* Developer & System Owner Footer Branding */}
          <div className="text-center py-1.5 -mx-5 -mb-5 mt-2 bg-slate-200/80 border-t border-slate-300 text-[10px] text-slate-600 font-medium">
            Developer &amp; System Owner: Rycko Computer / IT Solution
          </div>
        </form>
      </div>
    </div>
  );
};
