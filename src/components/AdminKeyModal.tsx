import React, { useState } from 'react';
import { KeyRound, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { WorkshopConfig } from '../types';

interface AdminKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkshopConfig;
  onUpdateStatus: (status: 'ACTIVE' | 'LOCKED') => void;
}

export const AdminKeyModal: React.FC<AdminKeyModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateStatus,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim() === config.masterKey) {
      setFeedback({
        type: 'success',
        text: 'Aktivasi Berhasil! Kode Aktivasi cocok ("*#rycko#*"). Seluruh sheet dibuka (TampilkanSheet) dan status lisensi diubah menjadi ACTIVE di Sheet Config B2.',
      });
      onUpdateStatus('ACTIVE');
    } else {
      setFeedback({
        type: 'error',
        text: 'Kode Aktivasi SALAH / UNVALID! Di Excel VBA, semua sheet tetap tersembunyi (xlSheetVeryHidden) dan workbook otomatis tertutup (ThisWorkbook.Close SaveChanges:=False). Hubungi Rycko Computer / IT Solution.',
      });
    }
  };

  const handleLockForTesting = () => {
    onUpdateStatus('LOCKED');
    setFeedback({
      type: 'error',
      text: 'Status Lisensi sekarang di-LOCKED untuk simulasi pengujian pembukaan file (seluruh sheet disembunyikan).',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold">
            <KeyRound className="w-4 h-4 text-amber-400" />
            <span>Simulasi Workbook_Open (Verifikasi Lisensi Rycko)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="bg-slate-100 rounded-lg p-3 border border-slate-200">
            <div className="flex items-center justify-between mb-1 font-semibold text-slate-700">
              <span>Status Lisensi Saat Ini:</span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                  config.licenseStatus === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {config.licenseStatus}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Kode Aktivasi Wajib: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono font-bold text-amber-800">*#rycko#*</code>
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Developer: Rycko Computer / IT Solution
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Masukkan Kode Aktivasi Resmi (InputBox VBA):
              </label>
              <input
                type="text"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="*#rycko#*"
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-amber-500 focus:outline-none font-mono text-sm"
              />
            </div>

            {feedback && (
              <div
                className={`p-3 rounded-lg border flex items-start gap-2 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                    : 'bg-rose-50 border-rose-300 text-rose-800'
                }`}
              >
                {feedback.type === 'success' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleLockForTesting}
                className="text-rose-600 hover:text-rose-800 underline font-medium"
              >
                Setel Status ke LOCKED
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow"
                >
                  Uji Verifikasi
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
