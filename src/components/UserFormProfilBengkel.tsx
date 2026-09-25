import React, { useState, useEffect } from 'react';
import { X, Save, Building2, User, Percent, AlertCircle } from 'lucide-react';
import { WorkshopConfig } from '../types';

interface UserFormProfilBengkelProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkshopConfig;
  onSave: (updated: Partial<WorkshopConfig>) => void;
}

export const UserFormProfilBengkel: React.FC<UserFormProfilBengkelProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [namaBengkel, setNamaBengkel] = useState(config.namaBengkel);
  const [alamat, setAlamat] = useState(config.alamat);
  const [pengelola, setPengelola] = useState(config.namaPengelola);
  const [namaPemilik, setNamaPemilik] = useState(config.namaPemilik);
  const [pctPemilik, setPctPemilik] = useState(config.pctPemilik.toString());
  const [pctPengelola, setPctPengelola] = useState(config.pctPengelola.toString());
  const [kota, setKota] = useState(config.kota || 'Bekasi');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNamaBengkel(config.namaBengkel);
      setAlamat(config.alamat);
      setPengelola(config.namaPengelola);
      setNamaPemilik(config.namaPemilik);
      setPctPemilik(config.pctPemilik.toString());
      setPctPengelola(config.pctPengelola.toString());
      setKota(config.kota || 'Bekasi');
      setErrorMsg(null);
    }
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleSimpan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBengkel.trim()) {
      setErrorMsg('Nama Bengkel wajib diisi!');
      return;
    }
    if (!alamat.trim()) {
      setErrorMsg('Alamat Bengkel wajib diisi!');
      return;
    }
    if (!pengelola.trim()) {
      setErrorMsg('Nama Pengelola wajib diisi!');
      return;
    }

    const pPemilik = parseFloat(pctPemilik);
    const pPengelola = parseFloat(pctPengelola);

    if (isNaN(pPemilik) || isNaN(pPengelola)) {
      setErrorMsg('Persentase bagi hasil harus berupa angka!');
      return;
    }

    if (pPemilik + pPengelola !== 100) {
      if (!window.confirm(`Total persentase (${pPemilik}% + ${pPengelola}% = ${pPemilik + pPengelola}%) tidak sama dengan 100%. Tetap simpan?`)) {
        return;
      }
    }

    onSave({
      namaBengkel: namaBengkel.trim(),
      alamat: alamat.trim(),
      namaPengelola: pengelola.trim(),
      namaPemilik: namaPemilik.trim(),
      pctPemilik: pPemilik,
      pctPengelola: pPengelola,
      kota: kota.trim(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-100 rounded-xl shadow-2xl border border-slate-300 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Classic Excel UserForm Title Bar */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white px-4 py-2.5 flex items-center justify-between select-none">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Building2 className="w-4 h-4 text-blue-200" />
            <span>UserForm_ProfilBengkel (Pengaturan Identitas & Bagi Hasil)</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/20 p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSimpan} className="p-5 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              Data yang disimpan di sini akan langsung disinkronkan ke <strong>Sheet &quot;Config&quot;</strong> sel <strong>B4:B8</strong> dan otomatis dicetak pada header & footer laporan keuangan.
            </span>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3 py-2 rounded-lg font-medium">
              {errorMsg}
            </div>
          )}

          {/* Group 1: Identitas Bengkel */}
          <fieldset className="border border-slate-300 rounded-lg p-3 bg-white">
            <legend className="text-xs font-bold text-slate-700 px-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              Identitas Usaha Bengkel
            </legend>

            <div className="space-y-3 mt-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Usaha Bengkel (txtNamaBengkel) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={namaBengkel}
                  onChange={(e) => setNamaBengkel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 font-medium"
                  placeholder="Contoh: BENGKEL MAJU JAYA"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alamat Lengkap Bengkel (txtAlamat) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  placeholder="Contoh: Jl. Raya Industri No. 123, Bekasi"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kota Domisili (untuk TTD)
                  </label>
                  <input
                    type="text"
                    value={kota}
                    onChange={(e) => setKota(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                    placeholder="Contoh: Bekasi"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Pemilik Modal
                  </label>
                  <input
                    type="text"
                    value={namaPemilik}
                    onChange={(e) => setNamaPemilik(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                    placeholder="Contoh: Bp. Hendra Pemilik"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Pengelola / Penanggung Jawab (txtPengelola) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={pengelola}
                  onChange={(e) => setPengelola(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
                  placeholder="Contoh: Bp. Ahmad Pengelola"
                />
              </div>
            </div>
          </fieldset>

          {/* Group 2: Persentase Bagi Hasil */}
          <fieldset className="border border-slate-300 rounded-lg p-3 bg-white">
            <legend className="text-xs font-bold text-slate-700 px-2 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-emerald-600" />
              Skema Persentase Bagi Hasil Keuntungan
            </legend>

            <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Porsi Pemilik (%) (txtPctPemilik)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pctPemilik}
                    onChange={(e) => setPctPemilik(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50 font-bold text-emerald-700"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-semibold">%</span>
                </div>
                <span className="text-[10px] text-slate-500">Default: 60%</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Porsi Pengelola (%) (txtPctPengelola)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={pctPengelola}
                    onChange={(e) => setPctPengelola(e.target.value)}
                    className="w-full px-3 py-2 pr-8 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 font-bold text-blue-700"
                  />
                  <span className="absolute right-3 top-2 text-slate-400 font-semibold">%</span>
                </div>
                <span className="text-[10px] text-slate-500">Default: 40%</span>
              </div>
            </div>
          </fieldset>

          {/* Buttons */}
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
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Profil (btnSimpanProfil)</span>
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
