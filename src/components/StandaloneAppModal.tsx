import React, { useState } from 'react';
import { 
  Monitor, 
  Download, 
  X, 
  CheckCircle2, 
  ExternalLink, 
  Layers, 
  Sparkles, 
  HardDrive, 
  WifiOff, 
  Terminal, 
  Copy, 
  Check, 
  Laptop,
  Smartphone
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface StandaloneAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  workshopName: string;
}

export const StandaloneAppModal: React.FC<StandaloneAppModalProps> = ({
  isOpen,
  onClose,
  workshopName,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'pwa' | 'local'>('pwa');

  if (!isOpen) return null;

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleCopyLocalCode = () => {
    const script = `# Langkah Menjalankan Standalone di Komputer (Windows/Mac/Linux)
# 1. Download kode ZIP dari menu AI Studio (Export to ZIP / GitHub)
# 2. Buka terminal/cmd di folder hasil ekstrak, lalu jalankan:
npm install
npm run dev

# Aplikasi langsung berjalan di: http://localhost:3000
# Bisa diakses tanpa koneksi internet!`;
    navigator.clipboard.writeText(script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Jadikan Aplikasi Standalone di Komputer</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Desktop &amp; Offline
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Gunakan aplikasi layaknya software komputer tanpa membuka browser terus-menerus
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selectors */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'pwa'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Metode 1: Install Langsung (PWA Desktop - Paling Cepat)</span>
          </button>

          <button
            onClick={() => setActiveTab('local')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'local'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Metode 2: Jalankan Source Code Lokal (Node.js)</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {activeTab === 'pwa' ? (
            <div className="space-y-5">
              {/* Highlights & Benefits */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                  <div className="text-blue-700 font-bold text-xs flex items-center gap-1.5">
                    <Monitor className="w-4 h-4" />
                    <span>Jendela Mandiri</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Buka dari Desktop / Start Menu tanpa bilah URL browser.
                  </p>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                  <div className="text-emerald-700 font-bold text-xs flex items-center gap-1.5">
                    <WifiOff className="w-4 h-4" />
                    <span>Bisa Offline Penuh</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Semua data &amp; aset tersimpan aman di komputer Anda.
                  </p>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                  <div className="text-purple-700 font-bold text-xs flex items-center gap-1.5">
                    <HardDrive className="w-4 h-4" />
                    <span>Ikon di Taskbar</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Pin di taskbar Windows / Mac Dock untuk akses kasir seketika.
                  </p>
                </div>
              </div>

              {/* Status & Primary Install Action */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-300">
                    Status Aplikasi Standalone:
                  </div>
                  {isInstalled ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Sudah Terinstal Standalone
                    </span>
                  ) : isInstallable ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                      <Sparkles className="w-3.5 h-3.5" />
                      Siap Diinstal ke Komputer
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-300">
                      Buka di Tab Baru untuk Install
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {isInstallable ? (
                    <button
                      onClick={install}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Install Aplikasi Sekarang (1-Klik)</span>
                    </button>
                  ) : null}

                  <button
                    onClick={handleOpenInNewTab}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 text-blue-400" />
                    <span>Buka di Tab Browser Baru (Chrome / Edge)</span>
                  </button>
                </div>
              </div>

              {/* Step by Step Guide for Desktop */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Panduan Mudah Install di Komputer (Google Chrome / Microsoft Edge):
                </h4>

                <div className="space-y-2.5 text-xs text-slate-600">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      1
                    </span>
                    <div>
                      <strong className="text-slate-800 block mb-0.5">Buka di Tab Browser (Bukan di dalam Frame):</strong>
                      Klik tombol <em>&quot;Buka di Tab Browser Baru&quot;</em> di atas agar aplikasi terbuka di halaman penuh Chrome / Edge.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      2
                    </span>
                    <div>
                      <strong className="text-slate-800 block mb-0.5">Klik Ikon &quot;Install&quot; di Address Bar:</strong>
                      Di pojok kanan bilah alamat (address bar browser), klik ikon <strong>Monitor dengan tanda panah ke bawah (Install App)</strong>, atau buka Menu Titik Tiga ⋮ &rarr; <strong>Simpan dan Bagikan (Save &amp; Share)</strong> &rarr; <strong>Instal Sistem Pembukuan Bengkel</strong>.
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                      3
                    </span>
                    <div>
                      <strong className="text-slate-800 block mb-0.5">Selesai! Aplikasi Muncul di Desktop &amp; Taskbar:</strong>
                      Klik <strong>&quot;Install&quot;</strong> pada jendela pop-up. Aplikasi akan otomatis membuka jendela mandiri terpisah dengan ikon desktop dan siap dipakai harian.
                    </div>
                  </div>
                </div>
              </div>

              {/* Mobile Device Note */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-snug">
                  <strong>Bisa juga untuk HP / Tablet:</strong> Jika dibuka di smartphone Android (Chrome) atau iPhone (Safari &rarr; Tambah ke Layar Utama), aplikasi ini juga dapat diinstal menjadi aplikasi native di ponsel.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900 text-slate-200 rounded-xl space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    Perintah Menjalankan Secara Offline Lokal
                  </span>
                  <button
                    onClick={handleCopyLocalCode}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded transition cursor-pointer"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Tersalin' : 'Salin Perintah'}</span>
                  </button>
                </div>

                <pre className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-emerald-400 overflow-x-auto">
{`# 1. Masuk ke folder proyek yang sudah di-export / di-download
npm install

# 2. Jalankan aplikasi lokal di komputer Anda:
npm run dev

# 3. Atau buat build produksi mandiri:
npm run build && npm run preview`}
                </pre>
              </div>

              <div className="space-y-2 text-xs text-slate-600">
                <h4 className="font-bold text-slate-800">Cara Download Source Code Penuh:</h4>
                <p>
                  1. Pada pojok kanan atas Google AI Studio, klik tombol <strong>Settings (Ikon Roda Gigi)</strong> atau tombol <strong>Export</strong>.
                </p>
                <p>
                  2. Pilih <strong>&quot;Export as ZIP&quot;</strong> atau <strong>&quot;Push to GitHub&quot;</strong> untuk mengunduh seluruh proyek ke laptop/PC Anda.
                </p>
                <p>
                  3. Ekstrak file ZIP di komputer Anda, lalu buka terminal/command prompt dan ketik perintah di atas.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
