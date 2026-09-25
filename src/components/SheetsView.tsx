import React, { useState, useMemo } from 'react';
import { 
  Database, 
  ShoppingCart, 
  ShoppingBag, 
  Receipt, 
  FileText, 
  SlidersHorizontal,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  Download,
  Trash2,
  RotateCcw,
  Monitor,
  Lock,
  Archive,
  FileSpreadsheet,
  Calendar,
  BookOpen,
  Scale,
  Landmark,
  ArrowRight,
  TrendingUp,
  CreditCard,
  Layers,
  UploadCloud,
  X
} from 'lucide-react';
import { Item, Pembelian, Penjualan, Pengeluaran, WorkshopConfig, ClosingPeriod } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { exportBengkelData } from '../utils/csvExporter';
import { generateGeneralLedger, generateBalanceSheet } from '../utils/accountingLedger';
import { exportItemsToExcel, downloadItemTemplateExcel } from '../utils/itemExcelManager';
import { ImportBarangModal } from './ImportBarangModal';

interface SheetsViewProps {
  items: Item[];
  pembelian: Pembelian[];
  penjualan: Penjualan[];
  pengeluaran: Pengeluaran[];
  config: WorkshopConfig;
  closingHistory?: ClosingPeriod[];
  onOpenPenjualan: () => void;
  onOpenPengeluaran: () => void;
  onOpenProfil: () => void;
  onOpenReportPrint: () => void;
  onRestockItem: (kodeBarang: string, addQty: number) => void;
  onOpenAddItem: () => void;
  onOpenEditItem: (item: Item) => void;
  onDeleteItem: (kodeBarang: string) => void;
  onOpenPembelian: (defaultKode?: string) => void;
  onDeletePenjualan: (noTransaksi: string, kodeBarang: string, qty: number) => void;
  onDeletePengeluaran: (noTransaksi: string) => void;
  onResetData: () => void;
  onOpenStandaloneModal?: () => void;
  onOpenMonthlyClosing?: () => void;
  onOpenClosingHistory?: () => void;
  closingHistoryCount?: number;
  onExportExcel?: () => void;
  onSyncCurrentMonth?: () => void;
  onBatchUpdateItems?: (newItems: Item[]) => void;
}

type SheetTab = 'Database_Barang' | 'Pembelian' | 'Penjualan' | 'Pengeluaran' | 'Buku_Besar' | 'Laporan_Keuangan' | 'Config';

function getNextMonthKey(currentKey: string): string {
  const parts = currentKey.split('-');
  let year = parseInt(parts[0], 10) || 2026;
  let month = parseInt(parts[1], 10) || 9;
  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatMonthLabel(monthKey: string): string {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = monthKey.split('-');
  const y = parts[0];
  const m = parseInt(parts[1], 10);
  if (m >= 1 && m <= 12) {
    return `${months[m - 1]} ${y}`;
  }
  return monthKey;
}

export const SheetsView: React.FC<SheetsViewProps> = ({
  items,
  pembelian,
  penjualan,
  pengeluaran,
  config,
  closingHistory = [],
  onOpenPenjualan,
  onOpenPengeluaran,
  onOpenProfil,
  onOpenReportPrint,
  onRestockItem,
  onOpenAddItem,
  onOpenEditItem,
  onDeleteItem,
  onOpenPembelian,
  onDeletePenjualan,
  onDeletePengeluaran,
  onResetData,
  onOpenStandaloneModal,
  onOpenMonthlyClosing,
  onOpenClosingHistory,
  closingHistoryCount = 0,
  onExportExcel,
  onSyncCurrentMonth,
  onBatchUpdateItems,
}) => {
  const [activeSheet, setActiveSheet] = useState<SheetTab>('Database_Barang');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReorderOnly, setFilterReorderOnly] = useState(false);
  const [restockModalItem, setRestockModalItem] = useState<Item | null>(null);
  const [restockQty, setRestockQty] = useState('10');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [syncToast, setSyncToast] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importToast, setImportToast] = useState<{ message: string; added: number; updated: number } | null>(null);

  // Accounting State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [activeGLAccount, setActiveGLAccount] = useState<string>('101');
  const [laporanSubTab, setLaporanSubTab] = useState<'labarugi' | 'neraca'>('labarugi');

  // Count reorder alerts
  const reorderCount = items.filter((it) => it.stokSaatIni <= it.minimalStok).length;

  // Real current month from system date
  const realCurrentMonth = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Determine active current month based on latest closing
  const latestClosing = closingHistory.length > 0 ? closingHistory[0] : null;
  const activeCurrentMonth = useMemo(() => {
    if (latestClosing) {
      return getNextMonthKey(latestClosing.tanggalAkhir.substring(0, 7));
    }
    return realCurrentMonth;
  }, [latestClosing, realCurrentMonth]);

  // Available closed periods list
  const availableClosedMonths = useMemo(() => {
    return closingHistory.map(c => ({
      id: c.id,
      monthKey: c.tanggalAkhir.substring(0, 7),
      label: c.periodeNama,
    }));
  }, [closingHistory]);

  // Is current view showing an archived closed period?
  const isViewingArchivedPeriod = selectedPeriod !== 'current' && selectedPeriod !== 'all';

  // Filtered Items (Database_Barang)
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const matchesSearch =
        it.kodeBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.namaBarang.toLowerCase().includes(searchTerm.toLowerCase()) ||
        it.jenisKendaraan.toLowerCase().includes(searchTerm.toLowerCase());
      const isReorder = it.stokSaatIni <= it.minimalStok;
      return matchesSearch && (!filterReorderOnly || isReorder);
    });
  }, [items, searchTerm, filterReorderOnly]);

  // Filtered Sales according to selectedPeriod
  const filteredSales = useMemo(() => {
    if (selectedPeriod === 'current') {
      // Automatic hide past months! Only show new month active transactions
      return penjualan.filter(s => !s.isClosed && s.tanggal.startsWith(activeCurrentMonth));
    } else if (selectedPeriod === 'all') {
      return penjualan;
    } else {
      // Historical month
      return penjualan.filter(s => s.tanggal.startsWith(selectedPeriod));
    }
  }, [penjualan, selectedPeriod, activeCurrentMonth]);

  // Filtered Purchases according to selectedPeriod
  const filteredPurchases = useMemo(() => {
    if (selectedPeriod === 'current') {
      return pembelian.filter(p => !p.isClosed && p.tanggal.startsWith(activeCurrentMonth));
    } else if (selectedPeriod === 'all') {
      return pembelian;
    } else {
      return pembelian.filter(p => p.tanggal.startsWith(selectedPeriod));
    }
  }, [pembelian, selectedPeriod, activeCurrentMonth]);

  // Filtered Expenses according to selectedPeriod
  const filteredExpenses = useMemo(() => {
    if (selectedPeriod === 'current') {
      return pengeluaran.filter(e => !e.isClosed && (e.tanggal.startsWith(activeCurrentMonth) || e.isOpeningBalance));
    } else if (selectedPeriod === 'all') {
      return pengeluaran;
    } else {
      return pengeluaran.filter(e => e.tanggal.startsWith(selectedPeriod));
    }
  }, [pengeluaran, selectedPeriod, activeCurrentMonth]);

  // General Ledger accounts generated dynamically for the selected period
  const glAccounts = useMemo(() => {
    return generateGeneralLedger({
      config,
      sales: filteredSales,
      expenses: filteredExpenses,
      purchases: filteredPurchases,
      items,
      closingHistory,
      selectedMonth: selectedPeriod === 'current' ? activeCurrentMonth : selectedPeriod,
    });
  }, [config, filteredSales, filteredExpenses, filteredPurchases, items, closingHistory, selectedPeriod, activeCurrentMonth]);

  const currentGL = glAccounts.find(a => a.kodeAkun === activeGLAccount) || glAccounts[0];

  // Balance Sheet (Neraca) generated dynamically
  const balanceSheetData = useMemo(() => {
    const periodLabel = selectedPeriod === 'current' 
      ? formatMonthLabel(activeCurrentMonth) 
      : selectedPeriod === 'all' 
        ? 'Semua Periode Kumulatif' 
        : formatMonthLabel(selectedPeriod);
    const today = new Date().toISOString().split('T')[0];
    return generateBalanceSheet(glAccounts, periodLabel, today);
  }, [glAccounts, selectedPeriod, activeCurrentMonth]);

  // Handlers
  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockModalItem) return;
    const qty = parseInt(restockQty, 10);
    if (!isNaN(qty) && qty > 0) {
      onRestockItem(restockModalItem.kodeBarang, qty);
      setRestockModalItem(null);
    }
  };

  const handleExportData = () => {
    exportBengkelData({
      items,
      penjualan: filteredSales,
      pengeluaran: filteredExpenses,
      config,
    });
    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
    }, 3500);
  };

  // Calculations for current active period
  const totalPart = filteredSales.reduce((a, b) => a + (b.totalPart ?? (b.qty * b.hargaJual)), 0);
  const totalJasa = filteredSales.reduce((a, b) => a + (b.hargaJasa ?? 0), 0);
  const totalPenjualan = filteredSales.reduce((a, b) => a + b.totalPenjualan, 0);
  const totalHPP = filteredSales.reduce((a, b) => a + b.totalHPP, 0);
  const labaKotor = totalPenjualan - totalHPP;
  const totalPengeluaran = filteredExpenses
    .filter(e => e.kategori !== 'Kas Awal / Modal Kasir' && !e.isOpeningBalance)
    .reduce((a, b) => a + b.jumlahPengeluaran, 0);
  const labaBersih = labaKotor - totalPengeluaran;

  const nominalPemilik = Math.max(0, labaBersih) * (config.pctPemilik / 100);
  const nominalPengelola = Math.max(0, labaBersih) * (config.pctPengelola / 100);

  return (
    <div className="space-y-4">
      {/* Quick Action Top Ribbon */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenPenjualan}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Buka Kasir Penjualan Sparepart & Jasa Servis"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>+ Kasir / Penjualan &amp; Jasa</span>
          </button>

          <button
            onClick={() => onOpenPembelian()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Catat Pembelian Stok Sparepart Baru"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ Pembelian / Restok</span>
          </button>

          <button
            onClick={onOpenPengeluaran}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Catat Biaya Beban Pengeluaran Operasional"
          >
            <Receipt className="w-4 h-4" />
            <span>+ Pengeluaran Operasional</span>
          </button>

          <button
            onClick={onOpenAddItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Tambah Master Data Sparepart Baru"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Sparepart</span>
          </button>

          <button
            onClick={onOpenProfil}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Pengaturan Profil Usaha & Rasio Bagi Hasil"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Profil &amp; Bagi Hasil</span>
          </button>

          <button
            onClick={onOpenReportPrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Pusat Laporan Keuangan, Filter Periode Tanggal/Bulan & Cetak PDF A4"
          >
            <FileText className="w-4 h-4" />
            <span>Laporan &amp; Cetak PDF</span>
          </button>

          {onOpenMonthlyClosing && (
            <button
              onClick={onOpenMonthlyClosing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Proses Tutup Buku Akhir Bulan, Jurnal Penutup, dan Pembentukan Saldo Awal Bulan Baru"
            >
              <Lock className="w-4 h-4 text-amber-200" />
              <span>Tutup Buku Akhir Bulan</span>
            </button>
          )}

          {onExportExcel && (
            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Download Laporan Format Microsoft Excel (.xlsx) Multi-Sheet Lengkap"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
              <span>Download Excel (.xlsx)</span>
            </button>
          )}

          {onOpenClosingHistory && (
            <button
              onClick={onOpenClosingHistory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Lihat arsip periode tutup buku sebelumnya"
            >
              <Archive className="w-4 h-4 text-purple-200" />
              <span>Arsip Tutup Buku</span>
              {closingHistoryCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-purple-900 text-purple-200 text-[10px] font-bold">
                  {closingHistoryCount}
                </span>
              )}
            </button>
          )}

          <button
            id="btn-export-data-csv"
            onClick={handleExportData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Download data inventaris stok barang, penjualan &amp; jasa, serta pengeluaran sebagai file CSV Excel"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Data (CSV)</span>
          </button>

          {onOpenStandaloneModal && (
            <button
              id="btn-open-standalone-install"
              onClick={onOpenStandaloneModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Jadikan aplikasi standalone di komputer / Install PWA Desktop"
            >
              <Monitor className="w-4 h-4 text-blue-200" />
              <span>Install Standalone</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {exportSuccess && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>CSV Berhasil Diunduh!</span>
            </div>
          )}

          {/* Stock Alert Badge */}
          {reorderCount > 0 && (
            <button
              onClick={() => {
                setActiveSheet('Database_Barang');
                setFilterReorderOnly(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-lg text-xs font-semibold hover:bg-amber-100 transition-colors animate-pulse cursor-pointer"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              <span>{reorderCount} Barang Perlu Restock!</span>
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE PERIOD FILTER BAR (Automatic Month Separation & Historical Viewing) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-4 py-2.5 rounded-xl border border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 font-bold text-amber-300">
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Periode Buku Transaksi:</span>
          </div>

          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer shadow-inner"
          >
            <option value="current">
              ⭐ Bulan Berjalan ({formatMonthLabel(activeCurrentMonth)}) [Otomatis Sembunyikan Bulan Lalu]
            </option>
            {availableClosedMonths.map(m => (
              <option key={m.id} value={m.monthKey}>
                🔒 {m.label} (Arsip Tutup Buku)
              </option>
            ))}
            <option value="all">
              📑 Semua Transaksi (Tampilkan Seluruh Riwayat)
            </option>
          </select>

          {selectedPeriod === 'current' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Buku Dimulai dari Saldo Awal (Bulan lalu otomatis diarsipkan)
            </span>
          ) : selectedPeriod === 'all' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px]">
              Menampilkan seluruh transaksi kumulatif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px]">
              <Lock className="w-3 h-3 text-amber-400" />
              Mode Baca Arsip Tutup Buku (Data Terkunci)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {syncToast && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 text-white font-bold text-[11px] shadow animate-pulse">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Transaksi Disinkronkan ke {formatMonthLabel(realCurrentMonth)}!</span>
            </span>
          )}

          {onSyncCurrentMonth && (
            <button
              onClick={() => {
                onSyncCurrentMonth();
                setSyncToast(true);
                setTimeout(() => setSyncToast(false), 3500);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs border border-teal-500/50"
              title={`Sinkronkan tanggal seluruh transaksi berjalan ke ${formatMonthLabel(realCurrentMonth)}`}
            >
              <RotateCcw className="w-3.5 h-3.5 text-teal-200" />
              <span>Sinkronkan ke Bulan Ini ({formatMonthLabel(realCurrentMonth)})</span>
            </button>
          )}

          {selectedPeriod !== 'current' && (
            <button
              onClick={() => setSelectedPeriod('current')}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded text-[11px] transition-colors cursor-pointer"
            >
              Kembali ke Bulan Berjalan
            </button>
          )}
        </div>
      </div>

      {/* Spreadsheet Container with Excel-like tabs */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Excel Formula & Sheet Bar */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-mono">
            <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-300">
              fx
            </span>
            <span className="text-slate-500 hidden sm:inline">
              Active Sheet: <strong>[{activeSheet}]</strong>
            </span>
            {isViewingArchivedPeriod && (
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded border border-amber-300">
                [ARSIP TERKUNCI]
              </span>
            )}
          </div>

          {activeSheet === 'Database_Barang' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari kode / nama barang..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 w-40 sm:w-48"
                />
              </div>
              <button
                onClick={() => setFilterReorderOnly(!filterReorderOnly)}
                className={`px-2.5 py-1 rounded text-xs font-medium border flex items-center gap-1 transition-colors cursor-pointer ${
                  filterReorderOnly
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3 h-3" />
                <span>Reorder Saja</span>
              </button>

              <div className="h-4 w-px bg-slate-300 mx-0.5 hidden sm:block" />

              {/* Format Template Excel */}
              <button
                onClick={() => downloadItemTemplateExcel()}
                title="Download Format Template Excel Resmi untuk Input / Update Database Barang"
                className="px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Format Template</span>
              </button>

              {/* Export Excel */}
              <button
                onClick={() => exportItemsToExcel(items, config.namaBengkel)}
                title="Download / Export Seluruh Database Barang ke File Excel (.xlsx)"
                className="px-2.5 py-1 rounded text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export Excel</span>
              </button>

              {/* Import & Update Excel */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                title="Import Data dari File Excel untuk Menambah atau Mengupdate Database Barang"
                className="px-2.5 py-1 rounded text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <UploadCloud className="w-3.5 h-3.5 text-indigo-600" />
                <span>Import &amp; Update Excel</span>
              </button>

              <button
                onClick={onOpenAddItem}
                className="px-2.5 py-1 rounded text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Sparepart Baru</span>
              </button>
            </div>
          )}

          {activeSheet === 'Pembelian' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenPembelian()}
                className="px-2.5 py-1 rounded text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>+ Catat Pembelian / Restok</span>
              </button>
            </div>
          )}

          {activeSheet === 'Penjualan' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPenjualan}
                className="px-2.5 py-1 rounded text-xs font-bold bg-rose-700 hover:bg-rose-800 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>+ Input Penjualan &amp; Jasa</span>
              </button>
            </div>
          )}

          {activeSheet === 'Pengeluaran' && (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenPengeluaran}
                className="px-2.5 py-1 rounded text-xs font-bold bg-purple-700 hover:bg-purple-800 text-white flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>+ Catat Pengeluaran Operasional</span>
              </button>
            </div>
          )}

          {activeSheet === 'Buku_Besar' && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {glAccounts.map(acc => (
                <button
                  key={acc.kodeAkun}
                  onClick={() => setActiveGLAccount(acc.kodeAkun)}
                  className={`px-2 py-1 rounded text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                    activeGLAccount === acc.kodeAkun
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {acc.kodeAkun} {acc.namaAkun.split('/')[0].trim()}
                </button>
              ))}
            </div>
          )}

          {activeSheet === 'Laporan_Keuangan' && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLaporanSubTab('labarugi')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  laporanSubTab === 'labarugi'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Laporan Laba Rugi (Nol di Bulan Baru)
              </button>
              <button
                onClick={() => setLaporanSubTab('neraca')}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                  laporanSubTab === 'neraca'
                    ? 'bg-indigo-700 text-white'
                    : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                Laporan Neraca (Saldo Berlanjut)
              </button>
            </div>
          )}
        </div>

        {/* Sheet Contents */}
        <div className="flex-1 overflow-auto">
          {/* 1. DATABASE BARANG (MASTER DATA & SALDO AWAL FISIK) */}
          {activeSheet === 'Database_Barang' && (
            <>
              {importToast && (
                <div className="m-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      <strong>Import Berhasil:</strong> {importToast.message} (
                      <span className="font-bold text-emerald-700">+{importToast.added} barang baru</span>,{' '}
                      <span className="font-bold text-blue-700">~{importToast.updated} diperbarui</span>)
                    </span>
                  </div>
                  <button
                    onClick={() => setImportToast(null)}
                    className="text-emerald-700 hover:text-emerald-950 p-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-800 text-white font-bold uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 border-r border-slate-700 w-12 text-center">No</th>
                  <th className="px-3 py-2.5 border-r border-slate-700">Kode_Barang</th>
                  <th className="px-3 py-2.5 border-r border-slate-700">Nama_Barang</th>
                  <th className="px-3 py-2.5 border-r border-slate-700">Peruntukan_Motor</th>
                  <th className="px-3 py-2.5 border-r border-slate-700 text-right">Harga_Modal</th>
                  <th className="px-3 py-2.5 border-r border-slate-700 text-right">Harga_Jual</th>
                  <th className="px-3 py-2.5 border-r border-slate-700 text-center">Stok_Fisik</th>
                  <th className="px-3 py-2.5 border-r border-slate-700 text-center">Min_Stok</th>
                  <th className="px-3 py-2.5 border-r border-slate-700 text-center">Status_Stok</th>
                  <th className="px-2.5 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {filteredItems.map((it, idx) => {
                  const isLow = it.stokSaatIni <= it.minimalStok;
                  return (
                    <tr
                      key={it.kodeBarang}
                      className={`hover:bg-slate-50 transition-colors ${
                        isLow ? 'bg-amber-50/60 font-semibold' : ''
                      }`}
                    >
                      <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-blue-700">
                        {it.kodeBarang}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-sans font-medium text-slate-800">
                        {it.namaBarang}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-600">
                        {it.jenisKendaraan}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-right text-slate-600">
                        {formatRupiah(it.hargaModal)}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-slate-900">
                        {formatRupiah(it.hargaJual)}
                      </td>
                      <td
                        className={`px-3 py-2 border-r border-slate-200 text-center font-bold text-sm ${
                          isLow ? 'text-amber-700 bg-amber-100/60' : 'text-slate-800'
                        }`}
                      >
                        {it.stokSaatIni}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-500">
                        {it.minimalStok}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-center font-sans">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            ⚠️ Reorder!
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                            Aman
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-center font-sans whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setRestockModalItem(it);
                              setRestockQty('10');
                            }}
                            title="Restock Cepat (Tambah Unit)"
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            + Restok
                          </button>
                          <button
                            onClick={() => onOpenEditItem(it)}
                            title="Edit Master Data"
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus barang ${it.namaBarang} (${it.kodeBarang})?`)) {
                                onDeleteItem(it.kodeBarang);
                              }
                            }}
                            title="Hapus Barang"
                            className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right">TOTAL INVENTARIS FISIK:</td>
                  <td className="px-3 py-2 text-center font-mono text-blue-800">
                    {filteredItems.reduce((a, b) => a + b.stokSaatIni, 0)} Unit
                  </td>
                  <td colSpan={3} className="px-3 py-2 font-mono text-emerald-800 text-right">
                    Nilai Aset: {formatRupiah(filteredItems.reduce((a, b) => a + (b.stokSaatIni * b.hargaModal), 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
            </>
          )}

          {/* 2. PEMBELIAN SHEET (RESTOK SPAREPART) */}
          {activeSheet === 'Pembelian' && (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-teal-900 text-white font-bold uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 border-r border-teal-800 w-12 text-center">No</th>
                  <th className="px-3 py-2.5 border-r border-teal-800">No_Transaksi</th>
                  <th className="px-3 py-2.5 border-r border-teal-800">Tanggal</th>
                  <th className="px-3 py-2.5 border-r border-teal-800">Kode_Barang</th>
                  <th className="px-3 py-2.5 border-r border-teal-800">Nama_Barang</th>
                  <th className="px-3 py-2.5 border-r border-teal-800">Peruntukan</th>
                  <th className="px-3 py-2.5 border-r border-teal-800 text-center">Qty_Masuk</th>
                  <th className="px-3 py-2.5 border-r border-teal-800 text-right">Harga_Modal</th>
                  <th className="px-3 py-2.5 text-right">Total_Harga</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {/* Saldo Awal Row */}
                <tr className="bg-teal-50/50 font-semibold border-b border-teal-100">
                  <td className="px-3 py-2 border-r border-slate-200 text-center text-teal-700">★</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-teal-800 font-bold">SALDO-AWAL</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-teal-700 font-mono">
                    {selectedPeriod === 'current' ? `${activeCurrentMonth}-01` : `${selectedPeriod}-01`}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 text-slate-400">-</td>
                  <td className="px-3 py-2 border-r border-slate-200 font-sans text-teal-900 font-bold">
                    Saldo Awal Pembelian Bulan Baru (Dimulai dari Rp 0)
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-500">Pindahan Tutup Buku</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-center text-teal-700">0</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-right text-slate-400">Rp 0</td>
                  <td className="px-3 py-2 text-right font-bold text-teal-800">Rp 0</td>
                </tr>

                {filteredPurchases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                      <div className="max-w-md mx-auto space-y-2">
                        <ShoppingBag className="w-8 h-8 text-teal-400 mx-auto opacity-60" />
                        <p className="font-bold text-slate-700">
                          Buku Pembelian Periode Ini Dimulai Dari Awal
                        </p>
                        <p className="text-xs text-slate-500">
                          Transaksi bulan lalu telah ditutup dan diarsipkan. Klik tombol <strong>&quot;+ Catat Pembelian / Restok&quot;</strong> untuk mencatat faktur pengadaan barang baru.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredPurchases.map((pb, idx) => (
                    <tr key={pb.noTransaksi} className="hover:bg-slate-50">
                      <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-teal-800">
                        {pb.noTransaksi}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600">
                        {pb.tanggal}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-blue-700 font-bold">
                        {pb.kodeBarang}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-800">
                        {pb.namaBarang}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-600">
                        {pb.jenisKendaraan}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-center font-bold text-teal-700 bg-teal-50/40">
                        +{pb.qty}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-right text-slate-600">
                        {formatRupiah(pb.hargaModal)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">
                        {formatRupiah(pb.totalHarga)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={6} className="px-3 py-2 text-right">TOTAL PEMBELIAN:</td>
                  <td className="px-3 py-2 text-center font-mono text-teal-800">
                    +{filteredPurchases.reduce((a, b) => a + b.qty, 0)} Unit
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-teal-900">
                    {formatRupiah(filteredPurchases.reduce((a, b) => a + b.totalHarga, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 3. BUKU JURNAL TRANSAKSI HARIAN / KASIR / PENJUALAN & JASA */}
          {activeSheet === 'Penjualan' && (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-rose-900 text-white font-bold uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 border-r border-rose-800 w-12 text-center">No</th>
                  <th className="px-3 py-2.5 border-r border-rose-800">No_Transaksi</th>
                  <th className="px-3 py-2.5 border-r border-rose-800">Tanggal</th>
                  <th className="px-3 py-2.5 border-r border-rose-800">Kode</th>
                  <th className="px-3 py-2.5 border-r border-rose-800">Nama_Barang</th>
                  <th className="px-2.5 py-2.5 border-r border-rose-800 text-center">Qty</th>
                  <th className="px-2.5 py-2.5 border-r border-rose-800 text-right">Harga_Part</th>
                  <th className="px-2.5 py-2.5 border-r border-rose-800 text-right">Total_Part</th>
                  <th className="px-2.5 py-2.5 border-r border-rose-800 text-right bg-rose-950/60">Jasa_Servis</th>
                  <th className="px-3 py-2.5 border-r border-rose-800 text-right">Total_Bayar</th>
                  <th className="px-2.5 py-2.5 border-r border-rose-800 text-right">Total_HPP</th>
                  <th className="px-3 py-2.5 border-r border-rose-800 text-right">Laba_Kotor</th>
                  <th className="px-2 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono">
                {/* Baris Saldo Awal (Pindahan dari Bulan Lalu) */}
                <tr className="bg-emerald-50/60 font-semibold border-b border-emerald-200">
                  <td className="px-3 py-2 border-r border-slate-200 text-center text-emerald-700">★</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-emerald-800 font-bold">SALDO-AWAL</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-emerald-700 font-mono">
                    {selectedPeriod === 'current' ? `${activeCurrentMonth}-01` : `${selectedPeriod}-01`}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 text-slate-400">-</td>
                  <td className="px-3 py-2 border-r border-slate-200 font-sans text-emerald-900 font-bold">
                    Saldo Awal Buku Jurnal Penjualan (Dimulai dari Rp 0)
                  </td>
                  <td className="px-2.5 py-2 border-r border-slate-200 text-center text-emerald-700">0</td>
                  <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-400">Rp 0</td>
                  <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-400">Rp 0</td>
                  <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-400">Rp 0</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-emerald-800">Rp 0</td>
                  <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-400">Rp 0</td>
                  <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-emerald-800">Rp 0</td>
                  <td className="px-2 py-2 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-sans font-bold">
                      Saldo Awal
                    </span>
                  </td>
                </tr>

                {filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-10 text-center text-slate-500 font-sans">
                      <div className="max-w-md mx-auto space-y-2">
                        <ShoppingCart className="w-8 h-8 text-rose-400 mx-auto opacity-60" />
                        <p className="font-bold text-slate-700 text-sm">
                          Buku Jurnal Penjualan Bulan Ini ({formatMonthLabel(selectedPeriod === 'current' ? activeCurrentMonth : selectedPeriod)}) Siap Digunakan
                        </p>
                        <p className="text-xs text-slate-500">
                          Transaksi bulan lalu sudah dikunci &amp; diarsipkan. Buku harian dimulai dari awal (kosong). Klik tombol <strong>&quot;+ Input Penjualan &amp; Jasa&quot;</strong> untuk mencatat transaksi pelanggan pertama.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((pj, idx) => {
                    const partTotal = pj.totalPart ?? (pj.qty * pj.hargaJual);
                    const jasaVal = pj.hargaJasa ?? 0;
                    return (
                      <tr key={pj.noTransaksi} className="hover:bg-slate-50">
                        <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 font-bold text-rose-800">
                          {pj.noTransaksi}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 text-slate-600">
                          {pj.tanggal}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 text-blue-700 font-bold">
                          {pj.kodeBarang}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-800">
                          {pj.namaBarang}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200 text-center font-bold text-slate-700">
                          {pj.qty}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-600">
                          {formatRupiah(pj.hargaJual)}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200 text-right font-semibold text-slate-800 bg-slate-50/60">
                          {formatRupiah(partTotal)}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200 text-right font-bold bg-amber-50/60">
                          {jasaVal > 0 ? (
                            <span className="text-amber-800">+{formatRupiah(jasaVal)}</span>
                          ) : (
                            <span className="text-slate-400 font-normal">Rp 0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 text-right font-extrabold text-slate-900 bg-emerald-50/20">
                          {formatRupiah(pj.totalPenjualan)}
                        </td>
                        <td className="px-2.5 py-2 border-r border-slate-200 text-right text-slate-500">
                          {formatRupiah(pj.totalHPP)}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-200 text-right font-extrabold text-emerald-700 bg-emerald-50/60">
                          {formatRupiah(pj.labaKotor)}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap font-sans">
                          {pj.isClosed ? (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold border border-slate-200">
                              🔒 Terkunci
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                if (window.confirm(`Batalkan transaksi ${pj.noTransaksi}? Stok barang (${pj.qty} pcs) akan dikembalikan ke inventaris.`)) {
                                  onDeletePenjualan(pj.noTransaksi, pj.kodeBarang, pj.qty);
                                }
                              }}
                              title="Batalkan transaksi dan kembalikan stok"
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Hapus</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={7} className="px-3 py-2 text-right">TOTAL:</td>
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-600">
                    {formatRupiah(filteredSales.reduce((a, b) => a + (b.totalPart ?? (b.qty * b.hargaJual)), 0))}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono font-bold text-amber-700">
                    +{formatRupiah(filteredSales.reduce((a, b) => a + (b.hargaJasa ?? 0), 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-extrabold text-slate-900">
                    {formatRupiah(filteredSales.reduce((a, b) => a + b.totalPenjualan, 0))}
                  </td>
                  <td className="px-2.5 py-2 text-right font-mono text-slate-500">
                    {formatRupiah(filteredSales.reduce((a, b) => a + b.totalHPP, 0))}
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-extrabold text-emerald-700">
                    {formatRupiah(filteredSales.reduce((a, b) => a + b.labaKotor, 0))}
                  </td>
                  <td className="px-2 py-2"></td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 4. PENGELUARAN SHEET (BEBAN OPERASIONAL & KAS AWAL) */}
          {activeSheet === 'Pengeluaran' && (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-purple-900 text-white font-bold uppercase sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2.5 border-r border-purple-800 w-12 text-center">No</th>
                  <th className="px-3 py-2.5 border-r border-purple-800">No_Transaksi</th>
                  <th className="px-3 py-2.5 border-r border-purple-800">Tanggal</th>
                  <th className="px-3 py-2.5 border-r border-purple-800">Kategori</th>
                  <th className="px-3 py-2.5 border-r border-purple-800">Keterangan</th>
                  <th className="px-3 py-2.5 border-r border-purple-800 text-right">Jumlah_Pengeluaran</th>
                  <th className="px-2.5 py-2.5 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Explicit Saldo Kas Awal / Modal Kasir Row if none yet */}
                {!filteredExpenses.some(e => e.kategori === 'Kas Awal / Modal Kasir' || e.isOpeningBalance) && (
                  <tr className="bg-amber-50/70 font-semibold border-b border-amber-200 font-mono">
                    <td className="px-3 py-2 border-r border-slate-200 text-center text-amber-700">★</td>
                    <td className="px-3 py-2 border-r border-slate-200 text-amber-900 font-bold">KAS-AWAL</td>
                    <td className="px-3 py-2 border-r border-slate-200 text-amber-700">
                      {selectedPeriod === 'current' ? `${activeCurrentMonth}-01` : `${selectedPeriod}-01`}
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Kas Awal / Modal Kasir
                      </span>
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-800 font-medium">
                      Saldo Kas Awal Kasir Pindahan dari Tutup Buku Bulan Lalu
                    </td>
                    <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-amber-900">
                      {formatRupiah(latestClosing?.saldoKasAwalNextMonth || 500000)}
                    </td>
                    <td className="px-2.5 py-2 text-center font-sans">
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                        Saldo Awal
                      </span>
                    </td>
                  </tr>
                )}

                {filteredExpenses.map((pg, idx) => {
                  const isOpening = pg.kategori === 'Kas Awal / Modal Kasir' || pg.isOpeningBalance;
                  return (
                    <tr
                      key={pg.noTransaksi}
                      className={`hover:bg-slate-50 font-mono ${
                        isOpening ? 'bg-amber-50/50 font-semibold' : ''
                      }`}
                    >
                      <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-400">
                        {isOpening ? '★' : idx + 1}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-purple-900">
                        {pg.noTransaksi}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600">
                        {pg.tanggal}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isOpening
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                              : 'bg-purple-100 text-purple-800 border-purple-200'
                          }`}
                        >
                          {pg.kategori}
                        </span>
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-800">
                        {pg.keterangan}
                      </td>
                      <td className="px-3 py-2 border-r border-slate-200 text-right font-bold text-slate-900">
                        {formatRupiah(pg.jumlahPengeluaran)}
                      </td>
                      <td className="px-2.5 py-2 text-center whitespace-nowrap font-sans">
                        {pg.isClosed ? (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold border border-slate-200">
                            🔒 Terkunci
                          </span>
                        ) : isOpening ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                            Saldo Awal
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus transaksi pengeluaran ${pg.noTransaksi}?`)) {
                                onDeletePengeluaran(pg.noTransaksi);
                              }
                            }}
                            title="Hapus Pengeluaran"
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-[11px] border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td colSpan={5} className="px-3 py-2 text-right">
                    TOTAL BEBAN OPERASIONAL (Di luar Saldo Kas Awal):
                  </td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-purple-900">
                    {formatRupiah(totalPengeluaran)}
                  </td>
                  <td className="px-2.5 py-2"></td>
                </tr>
              </tfoot>
            </table>
          )}

          {/* 5. BUKU BESAR (GENERAL LEDGER - SALDO AWAL + TRANSAKSI BULAN BARU) */}
          {activeSheet === 'Buku_Besar' && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Account Header Information Card */}
              <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded bg-indigo-700 text-white font-mono font-bold text-xs">
                      Akun {currentGL.kodeAkun}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base font-sans">
                      {currentGL.namaAkun}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Klasifikasi: <strong>{currentGL.kategori}</strong> • Saldo Normal: <strong>{currentGL.saldoNormal}</strong> • Periode: <strong>{selectedPeriod === 'current' ? formatMonthLabel(activeCurrentMonth) : selectedPeriod === 'all' ? 'Semua Periode' : formatMonthLabel(selectedPeriod)}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3 font-mono text-xs flex-wrap">
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Saldo Awal Pindahan:</span>
                    <strong className="text-indigo-900">{formatRupiah(currentGL.saldoAwal)}</strong>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Mutasi Debit:</span>
                    <strong className="text-emerald-700">+{formatRupiah(currentGL.mutasiDebit)}</strong>
                  </div>
                  <div className="bg-white px-3 py-1.5 rounded-lg border border-indigo-200 shadow-2xs">
                    <span className="text-[10px] text-slate-500 block uppercase font-sans">Mutasi Kredit:</span>
                    <strong className="text-rose-700">-{formatRupiah(currentGL.mutasiKredit)}</strong>
                  </div>
                  <div className="bg-indigo-900 text-white px-3.5 py-1.5 rounded-lg shadow-2xs">
                    <span className="text-[10px] text-indigo-300 block uppercase font-sans">Saldo Akhir:</span>
                    <strong className="text-white text-sm">{formatRupiah(currentGL.saldoAkhir)}</strong>
                  </div>
                </div>
              </div>

              {/* General Ledger Table with Saldo Awal on Row 1 */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-800 text-white font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-12 text-center">No</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-28">Tanggal</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 w-36">No_Bukti</th>
                      <th className="px-3 py-2.5 border-r border-slate-700">Keterangan Transaksi</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 text-right w-32">Debit (Rp)</th>
                      <th className="px-3 py-2.5 border-r border-slate-700 text-right w-32">Kredit (Rp)</th>
                      <th className="px-3 py-2.5 text-right w-36 bg-slate-900">Saldo Berjalan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {currentGL.entries.map((entry, idx) => {
                      return (
                        <tr
                          key={`${entry.noBukti}-${idx}`}
                          className={`hover:bg-slate-50 ${
                            entry.isOpeningBalance
                              ? 'bg-emerald-50/70 font-semibold border-b-2 border-emerald-300'
                              : ''
                          }`}
                        >
                          <td className="px-3 py-2 border-r border-slate-200 text-center text-slate-400">
                            {entry.isOpeningBalance ? '★' : idx}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 text-slate-700">
                            {entry.tanggal}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 font-bold text-indigo-900">
                            {entry.noBukti}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 font-sans text-slate-900">
                            <div className="flex items-center gap-2">
                              {entry.isOpeningBalance && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                                  SALDO AWAL
                                </span>
                              )}
                              <span>{entry.keterangan}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 text-right text-emerald-800">
                            {entry.debit > 0 ? formatRupiah(entry.debit) : '-'}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-200 text-right text-rose-800">
                            {entry.kredit > 0 ? formatRupiah(entry.kredit) : '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-bold text-slate-900 bg-slate-50/60">
                            {formatRupiah(entry.saldo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300 font-mono">
                    <tr>
                      <td colSpan={4} className="px-3 py-2 text-right font-sans">
                        TOTAL MUTASI &amp; SALDO AKHIR:
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-800">
                        {formatRupiah(currentGL.mutasiDebit)}
                      </td>
                      <td className="px-3 py-2 text-right text-rose-800">
                        {formatRupiah(currentGL.mutasiKredit)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-indigo-900 bg-slate-200/80">
                        {formatRupiah(currentGL.saldoAkhir)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* 6. LAPORAN KEUANGAN (LABA RUGI: NOL DI BULAN BARU vs NERACA: SALDO BERLANJUT) */}
          {activeSheet === 'Laporan_Keuangan' && (
            <div className="p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {/* Sub Tab Switcher */}
                <div className="flex border-b border-slate-200 gap-4">
                  <button
                    onClick={() => setLaporanSubTab('labarugi')}
                    className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                      laporanSubTab === 'labarugi'
                        ? 'border-amber-600 text-amber-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>1. Laporan Laba Rugi (Pendapatan &amp; Beban: Dimulai dari Nol)</span>
                  </button>

                  <button
                    onClick={() => setLaporanSubTab('neraca')}
                    className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                      laporanSubTab === 'neraca'
                        ? 'border-indigo-600 text-indigo-700'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Scale className="w-4 h-4" />
                    <span>2. Laporan Neraca (Aset, Hutang, Modal: Saldo Terus Berlanjut)</span>
                  </button>
                </div>

                {/* SUB TAB 1: LABA RUGI */}
                {laporanSubTab === 'labarugi' && (
                  <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="border-b pb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          Laporan Laba Rugi &amp; Pembagian Hasil
                        </h3>
                        <p className="text-xs text-slate-500">
                          Periode: <strong>{selectedPeriod === 'current' ? formatMonthLabel(activeCurrentMonth) : selectedPeriod === 'all' ? 'Semua Periode' : formatMonthLabel(selectedPeriod)}</strong>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold">
                        Akun Nominal • Dimulai dari Nol tiap Bulan
                      </span>
                    </div>

                    <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200 text-xs text-amber-900">
                      💡 <strong>Sifat Akun Laba Rugi:</strong> Pada awal bulan baru, seluruh akun pendapatan dan beban otomatis dimulai dari nol karena transaksi bulan lalu telah ditutup (closing entries) ke ekuitas modal.
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <div className="flex justify-between py-1 border-b">
                        <span className="font-sans">1. Pendapatan Penjualan Sparepart</span>
                        <span className="font-bold">{formatRupiah(totalPart)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="font-sans">2. Pendapatan Biaya Jasa Servis &amp; Pasang (100% Margin)</span>
                        <span className="font-bold text-amber-800">+{formatRupiah(totalJasa)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b bg-slate-50 font-bold">
                        <span className="font-sans">TOTAL PENDAPATAN USAHA (OMSET)</span>
                        <span>{formatRupiah(totalPenjualan)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b text-rose-700">
                        <span className="font-sans">3. Harga Pokok Penjualan (HPP Sparepart Terjual)</span>
                        <span>-{formatRupiah(totalHPP)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b bg-emerald-50/50 font-bold text-emerald-800">
                        <span className="font-sans">LABA KOTOR BENGKEL</span>
                        <span>{formatRupiah(labaKotor)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b text-rose-700">
                        <span className="font-sans">4. Beban Operasional Usaha (Listrik, Sewa, Gaji, dll)</span>
                        <span>-{formatRupiah(totalPengeluaran)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-t-2 border-b-2 border-slate-900 bg-emerald-50 font-extrabold text-sm text-emerald-900">
                        <span className="font-sans">LABA BERSIH BULAN INI</span>
                        <span>{formatRupiah(labaBersih)}</span>
                      </div>
                    </div>

                    {/* Pembagian Hasil */}
                    <div className="pt-2 border-t space-y-2 text-xs">
                      <h4 className="font-bold text-slate-800 font-sans">
                        Alokasi Bagi Hasil Usaha Sesuai Rasio ({config.pctPemilik}% : {config.pctPengelola}%):
                      </h4>
                      <div className="flex justify-between py-1 bg-emerald-50/40 px-3 rounded border border-emerald-100">
                        <span>Bagian Pemilik Modal ({config.namaPemilik}) [{config.pctPemilik}%]</span>
                        <strong className="font-mono text-emerald-800">{formatRupiah(nominalPemilik)}</strong>
                      </div>
                      <div className="flex justify-between py-1 bg-blue-50/40 px-3 rounded border border-blue-100">
                        <span>Bagian Pengelola Bengkel ({config.namaPengelola}) [{config.pctPengelola}%]</span>
                        <strong className="font-mono text-blue-800">{formatRupiah(nominalPengelola)}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* SUB TAB 2: NERACA KEUANGAN (BERLANJUT) */}
                {laporanSubTab === 'neraca' && (
                  <div className="bg-white border border-slate-300 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="border-b pb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-base text-slate-900">
                          Laporan Neraca Keuangan (Balance Sheet)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Per Tanggal: <strong>{formatDateIndo(balanceSheetData.tanggal)}</strong> • Periode: <strong>{balanceSheetData.periodeNama}</strong>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg text-xs font-semibold">
                        Akun Riil • Saldo Berlanjut dari Bulan ke Bulan
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-200 text-xs text-indigo-900">
                      💡 <strong>Sifat Akun Neraca:</strong> Nilai aset (uang kas di kasir/bank dan nilai fisik stok sparepart) terus berlanjut ke bulan baru sebagai Saldo Awal, mencerminkan modal yang terus berjalan.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Sisi Kiri: AKTIVA (ASET) */}
                      <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/40">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <Landmark className="w-4 h-4 text-emerald-600" />
                            <span>Aktiva (Aset Usaha)</span>
                          </h4>
                        </div>

                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="font-sans text-slate-700">1. Kas di Kasir &amp; Bank</span>
                            <span className="font-bold text-slate-900">{formatRupiah(balanceSheetData.asetLancar.kasDiKasir)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="font-sans text-slate-700">2. Persediaan Suku Cadang (Fisik)</span>
                            <span className="font-bold text-slate-900">{formatRupiah(balanceSheetData.asetLancar.persediaanBarang)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t-2 border-slate-800 font-extrabold text-emerald-900 text-sm bg-emerald-50 px-2 rounded">
                            <span className="font-sans">TOTAL AKTIVA (ASET)</span>
                            <span>{formatRupiah(balanceSheetData.totalAset)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Sisi Kanan: PASSIVA (KEWAJIBAN & EKUITAS) */}
                      <div className="border border-slate-200 rounded-lg p-4 space-y-3 bg-slate-50/40">
                        <div className="flex items-center justify-between border-b pb-2">
                          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-indigo-600" />
                            <span>Passiva (Kewajiban &amp; Modal)</span>
                          </h4>
                        </div>

                        <div className="space-y-2 text-xs font-mono">
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="font-sans text-slate-700">1. Kewajiban / Hutang Supplier</span>
                            <span className="font-bold text-slate-500">Rp 0</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="font-sans text-slate-700">2. Modal Usaha Pindahan Bulan Lalu</span>
                            <span className="font-bold text-indigo-900">{formatRupiah(balanceSheetData.ekuitas.modalPemilikAwal)}</span>
                          </div>
                          <div className="flex justify-between py-1 border-b border-slate-200">
                            <span className="font-sans text-slate-700">3. Laba Bersih Periode Berjalan</span>
                            <span className="font-bold text-emerald-800">{formatRupiah(balanceSheetData.ekuitas.labaPeriodeBerjalan)}</span>
                          </div>
                          <div className="flex justify-between py-2 border-t-2 border-slate-800 font-extrabold text-indigo-900 text-sm bg-indigo-50 px-2 rounded">
                            <span className="font-sans">TOTAL PASSIVA (MODAL)</span>
                            <span>{formatRupiah(balanceSheetData.totalPassiva)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Balance Banner */}
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-300 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <div>
                          <strong className="text-emerald-900">Neraca Seimbang (Balanced):</strong>
                          <span className="text-emerald-700 ml-1">Total Aktiva (Rp {formatRupiah(balanceSheetData.totalAset)}) = Total Passiva (Rp {formatRupiah(balanceSheetData.totalPassiva)})</span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-700 text-white font-bold rounded-lg text-[11px]">
                        100% BALANCE
                      </span>
                    </div>
                  </div>
                )}

                {/* Bottom Action Ribbon in Laporan Keuangan */}
                <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                  <button
                    onClick={onOpenReportPrint}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-sans font-bold rounded-lg shadow transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Buka Format Siap Cetak PDF A4</span>
                  </button>

                  {onOpenMonthlyClosing && (
                    <button
                      onClick={onOpenMonthlyClosing}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-sans font-bold rounded-lg shadow transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-4 h-4 text-amber-400" />
                      <span>Tutup Buku Akhir Bulan</span>
                    </button>
                  )}

                  {onExportExcel && (
                    <button
                      onClick={onExportExcel}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-sans font-bold rounded-lg shadow transition-colors text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-white" />
                      <span>Download Excel (.xlsx)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. CONFIG SHEET (Matching exact prompt coordinates B1:B10) */}
          {activeSheet === 'Config' && (
            <div className="p-6">
              <div className="max-w-2xl mx-auto">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Tata Letak Sel Sheet &quot;Config&quot;
                    </h3>
                    <p className="text-xs text-slate-500">
                      Data ini dibaca langsung oleh Macro VBA <code>Workbook_Open</code>, <code>GenerateLaporanKeuanganAndPrint</code>, dan <code>UserForm_ProfilBengkel</code>.
                    </p>
                  </div>
                  <button
                    onClick={onOpenProfil}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition-colors"
                  >
                    Edit via UserForm
                  </button>
                </div>

                <table className="w-full text-xs text-left border border-slate-300 rounded overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                    <tr>
                      <th className="px-3 py-2 border-r border-slate-300 w-16 text-center font-mono">Sel</th>
                      <th className="px-3 py-2 border-r border-slate-300 w-44">Parameter Label (Kolom A)</th>
                      <th className="px-3 py-2 border-r border-slate-300 font-mono">Nilai Tersimpan (Kolom B)</th>
                      <th className="px-3 py-2">Keterangan / Fungsi VBA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">A1:B1</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Header Konfigurasi</td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-600 font-bold">PENGATURAN BENGKEL</td>
                      <td className="px-3 py-2 font-sans text-slate-500">Judul tabel</td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-amber-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B2</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Status Lisensi</td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-700">
                        {config.licenseStatus}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">
                        Diperiksa saat <code>Workbook_Open</code> (Jika &lt;&gt; ACTIVE minta key)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B3</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Master Key Admin</td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-700">
                        {config.masterKey}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">Sandi verifikasi aktivasi</td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-blue-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B4</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Nama Usaha Bengkel</td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-blue-900">
                        {config.namaBengkel}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">
                        Input dari <code>txtNamaBengkel</code> UserForm
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-blue-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B5</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Alamat Lengkap</td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-800">
                        {config.alamat}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">
                        Input dari <code>txtAlamat</code> UserForm
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-blue-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B6</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Nama Pengelola</td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-slate-800">
                        {config.namaPengelola}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">
                        Input dari <code>txtPengelola</code> UserForm
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-emerald-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B7</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">% Bagi Hasil Pemilik</td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-emerald-800">
                        {config.pctPemilik}% ({(config.pctPemilik / 100).toFixed(2)})
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">
                        Input dari <code>txtPctPemilik</code> (Pengali Laba Bersih)
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-emerald-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B8</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">% Bagi Hasil Pengelola</td>
                      <td className="px-3 py-2 border-r border-slate-200 font-bold text-blue-800">
                        {config.pctPengelola}% ({(config.pctPengelola / 100).toFixed(2)})
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">
                        Input dari <code>txtPctPengelola</code>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-purple-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B9</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Nama Pemilik Modal</td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-800">
                        {config.namaPemilik}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">Untuk tanda tangan dokumen cetak</td>
                    </tr>
                    <tr className="hover:bg-slate-50 bg-purple-50/40">
                      <td className="px-3 py-2 text-center font-bold text-blue-700 border-r border-slate-200">B10</td>
                      <td className="px-3 py-2 font-sans font-semibold border-r border-slate-200">Kota Domisili</td>
                      <td className="px-3 py-2 border-r border-slate-200 text-slate-800">
                        {config.kota}
                      </td>
                      <td className="px-3 py-2 font-sans text-slate-500">Tanggal dan kota cetak dokumen</td>
                    </tr>
                  </tbody>
                </table>

                {/* Web-Base Storage & Maintenance Card */}
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-300 text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        Penyimpanan Web-Base (LocalStorage)
                      </h4>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Seluruh data stok, transaksi kasir penjualan &amp; jasa, serta biaya operasional tersimpan otomatis di peramban (browser) Anda.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
                    <button
                      onClick={onOpenProfil}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Edit Profil &amp; Bagi Hasil</span>
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm('PERINGATAN: Seluruh data transaksi penjualan, pembelian stok, dan pengeluaran akan di-reset kembali ke data contoh bawaan sistem. Lanjutkan?')) {
                          onResetData();
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-300 shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset ke Data Contoh Awal</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Excel Bottom Sheet Tab Bar */}
        <div className="bg-slate-200 border-t border-slate-300 px-2 py-1.5 flex items-center gap-1 overflow-x-auto select-none">
          <span className="text-[11px] font-bold text-slate-500 px-2 uppercase tracking-wider hidden sm:inline">
            Sheets:
          </span>

          {(
            [
              { id: 'Database_Barang', label: 'Database_Barang', icon: Database, color: 'text-blue-700' },
              { id: 'Pembelian', label: 'Pembelian', icon: ShoppingBag, color: 'text-teal-700' },
              { id: 'Penjualan', label: 'Penjualan', icon: ShoppingCart, color: 'text-rose-700' },
              { id: 'Pengeluaran', label: 'Pengeluaran', icon: Receipt, color: 'text-purple-700' },
              { id: 'Buku_Besar', label: 'Buku_Besar (GL)', icon: BookOpen, color: 'text-indigo-700' },
              { id: 'Laporan_Keuangan', label: 'Laporan_Keuangan', icon: FileText, color: 'text-amber-700' },
              { id: 'Config', label: 'Config', icon: SlidersHorizontal, color: 'text-slate-700' },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSheet === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSheet(tab.id);
                  if (tab.id !== 'Database_Barang') setFilterReorderOnly(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-t border-t-2 transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 border-emerald-600 shadow-xs'
                    : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${tab.color}`} />
                <span>{tab.label}</span>
                {tab.id === 'Database_Barang' && reorderCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Restock Mini Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-300 w-full max-w-sm p-4 text-xs">
            <h4 className="font-bold text-sm text-slate-900 mb-1">
              Restok Sparepart: {restockModalItem.kodeBarang}
            </h4>
            <p className="text-slate-800 font-medium">{restockModalItem.namaBarang}</p>
            <div className="mt-1 mb-3">
              <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[11px] border border-amber-200">
                🏍️ {restockModalItem.jenisKendaraan}
              </span>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold mb-1">Tambah Jumlah Masuk (pcs):</label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full px-3 py-2 border rounded font-bold text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRestockModalItem(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 text-white font-bold rounded shadow"
                >
                  Tambahkan ke Stok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Import Database Barang Modal */}
      <ImportBarangModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        currentItems={items}
        workshopName={config.namaBengkel}
        onCommitImport={(updatedItems, summary) => {
          if (onBatchUpdateItems) {
            onBatchUpdateItems(updatedItems);
          }
          setImportToast({
            message: `Database berhasil diperbarui`,
            added: summary.addedCount,
            updated: summary.updatedCount,
          });
          setTimeout(() => {
            setImportToast(null);
          }, 8000);
        }}
      />
    </div>
  );
};
