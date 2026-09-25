import React from 'react';
import { 
  Wrench, 
  FileCode2, 
  Printer, 
  BookOpen, 
  ShieldCheck, 
  ShieldAlert, 
  Sparkles,
  Layers,
  Download,
  Database,
  Globe,
  Monitor
} from 'lucide-react';
import { WorkshopConfig } from '../types';

interface HeaderProps {
  activeTab: 'simulator' | 'vbacode' | 'report' | 'guide';
  setActiveTab: (tab: 'simulator' | 'vbacode' | 'report' | 'guide') => void;
  config: WorkshopConfig;
  onOpenAdminKey: () => void;
  onDownloadAllVba: () => void;
  onOpenStandaloneModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  config,
  onOpenAdminKey,
  onDownloadAllVba,
  onOpenStandaloneModal,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs border-b border-slate-800/80">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Aplikasi Bengkel Web-Base • Rycko System
          </span>
          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700 text-[11px]">
            <Database className="w-3 h-3 text-emerald-400" />
            Auto-Sync LocalStorage Aktif
          </span>
          <span className="hidden sm:inline text-slate-500">|</span>
          <span className="hidden sm:inline text-slate-300 font-mono">
            {config.namaBengkel} ({config.kota})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenAdminKey}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              config.licenseStatus === 'ACTIVE'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/50 hover:bg-emerald-900'
                : 'bg-rose-950 text-rose-300 border border-rose-700/50 hover:bg-rose-900 animate-bounce'
            }`}
            title="Klik untuk simulasi tes verifikasi lisensi Workbook_Open / Akses Admin"
          >
            {config.licenseStatus === 'ACTIVE' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Lisensi: <strong>ACTIVE</strong></span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>Lisensi: <strong>LOCKED</strong> (Uji Key)</span>
              </>
            )}
          </button>

          <button
            onClick={onOpenStandaloneModal}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-2.5 py-1 rounded text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Jadikan aplikasi standalone di komputer / Install PWA Desktop"
          >
            <Monitor className="w-3.5 h-3.5 text-blue-200" />
            <span className="hidden sm:inline">Install Standalone</span>
            <span className="sm:hidden">Install</span>
          </button>

          <button
            onClick={onDownloadAllVba}
            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer"
            title="Download bundle kode makro VBA jika ingin dibuka di Excel"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Download VBA Excel</span>
            <span className="md:hidden">VBA</span>
          </button>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-900/30">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Sistem Pembukuan Bengkel
              </h1>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                Web Base Edition
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Database Stok • Kasir &amp; Jasa Servis • Beban Operasional • Bagi Hasil Pemilik &amp; Pengelola
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'simulator'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Globe className="w-4 h-4 text-emerald-200" />
            <span>Aplikasi Bengkel (Web-Base)</span>
          </button>

          <button
            onClick={() => setActiveTab('report')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              activeTab === 'report'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Laporan &amp; Cetak PDF</span>
          </button>

          <button
            onClick={() => setActiveTab('vbacode')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'vbacode'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Modul VBA Excel</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Panduan &amp; Manual</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
