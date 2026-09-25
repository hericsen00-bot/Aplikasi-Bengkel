import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  ArrowRight, 
  X, 
  Coins, 
  BookOpen,
  DollarSign,
  Info,
  Sparkles
} from 'lucide-react';
import { Item, Penjualan, Pengeluaran, Pembelian, WorkshopConfig, ClosingPeriod } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { exportMonthlyClosingWorkbook, generateStandardClosingEntries } from '../utils/excelExporter';

interface MonthlyClosingModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkshopConfig;
  sales: Penjualan[];
  expenses: Pengeluaran[];
  purchases: Pembelian[];
  items: Item[];
  onExecuteClosing: (closingData: ClosingPeriod) => void;
}

export const MonthlyClosingModal: React.FC<MonthlyClosingModalProps> = ({
  isOpen,
  onClose,
  config,
  sales,
  expenses,
  purchases,
  items,
  onExecuteClosing,
}) => {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);
  const [periodeName, setPeriodeName] = useState<string>(() => {
    const d = new Date();
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  });
  const [closingDate, setClosingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [openingCash, setOpeningCash] = useState<string>('500000'); // Saldo kas awal kasir bulan baru
  const [notes, setNotes] = useState<string>('Tutup buku bulanan rutin bengkel');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [completedClosing, setCompletedClosing] = useState<ClosingPeriod | null>(null);
  const [simulationOverride, setSimulationOverride] = useState<boolean>(false);

  // Totals
  const totals = useMemo(() => {
    const totalPart = sales.reduce((acc, s) => acc + (s.totalPart ?? (s.qty * s.hargaJual)), 0);
    const totalJasa = sales.reduce((acc, s) => acc + (s.hargaJasa ?? 0), 0);
    const totalPenjualan = sales.reduce((acc, s) => acc + s.totalPenjualan, 0);
    const totalHPP = sales.reduce((acc, s) => acc + s.totalHPP, 0);
    const labaKotor = totalPenjualan - totalHPP;
    const totalPengeluaran = expenses.reduce((acc, e) => acc + e.jumlahPengeluaran, 0);
    const labaBersih = labaKotor - totalPengeluaran;

    const nominalPemilik = Math.max(0, labaBersih) * (config.pctPemilik / 100);
    const nominalPengelola = Math.max(0, labaBersih) * (config.pctPengelola / 100);

    return {
      totalPart,
      totalJasa,
      totalPenjualan,
      totalHPP,
      labaKotor,
      totalPengeluaran,
      labaBersih,
      nominalPemilik,
      nominalPengelola,
      totalStockValue: items.reduce((acc, it) => acc + (it.stokSaatIni * it.hargaModal), 0),
      totalStockUnits: items.reduce((acc, it) => acc + it.stokSaatIni, 0),
    };
  }, [sales, expenses, items, config]);

  // Closing Entries Preview
  const closingEntries = useMemo(() => {
    return generateStandardClosingEntries({
      tanggal: closingDate,
      totalPenjualan: totals.totalPenjualan,
      totalPart: totals.totalPart,
      totalJasa: totals.totalJasa,
      totalHPP: totals.totalHPP,
      totalPengeluaran: totals.totalPengeluaran,
      labaBersih: totals.labaBersih,
      nominalPemilik: totals.nominalPemilik,
      nominalPengelola: totals.nominalPengelola,
      namaPemilik: config.namaPemilik,
      namaPengelola: config.namaPengelola,
    });
  }, [closingDate, totals, config]);

  // Validation: Tutup buku hanya bisa dilakukan jika sudah di tanggal akhir bulan atau bulan setelahnya!
  const dateValidation = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Target year & month to close
    const [yStr, mStr] = closingDate.split('-');
    const closingYear = parseInt(yStr, 10) || today.getFullYear();
    const closingMonth = parseInt(mStr, 10) || (today.getMonth() + 1);

    // Last day of target closing month (e.g. 30 for Sep, 31 for Oct)
    const lastDayOfMonth = new Date(closingYear, closingMonth, 0).getDate();
    const endOfMonthDateStr = `${closingYear}-${String(closingMonth).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;

    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = months[closingMonth - 1] || '';

    // Condition: today must be >= endOfMonthDateStr
    const isAllowed = todayStr >= endOfMonthDateStr;

    // Remaining days calculation
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const targetMidnight = new Date(closingYear, closingMonth - 1, lastDayOfMonth).getTime();
    const daysRemaining = Math.max(0, Math.ceil((targetMidnight - todayMidnight) / (1000 * 60 * 60 * 24)));

    return {
      todayStr,
      endOfMonthDateStr,
      lastDayOfMonth,
      monthName,
      closingYear,
      isAllowed,
      daysRemaining,
    };
  }, [closingDate]);

  const canProceed = dateValidation.isAllowed || simulationOverride;

  if (!isOpen) return null;

  const handleConfirmClosing = () => {
    if (!canProceed) {
      alert(
        `Tutup buku hanya bisa dilakukan jika sudah di tanggal akhir bulan (${dateValidation.lastDayOfMonth} ${dateValidation.monthName}) atau pada bulan setelahnya.`
      );
      return;
    }

    const initialCashNumber = Number(openingCash.replace(/[^0-9]/g, '')) || 0;
    
    // Find min date and max date from transactions
    const allDates = [
      ...sales.map(s => s.tanggal),
      ...expenses.map(e => e.tanggal),
      ...purchases.map(p => p.tanggal),
    ].filter(Boolean).sort();

    const tanggalAwal = allDates.length > 0 ? allDates[0] : closingDate;
    const tanggalAkhir = closingDate;

    const newClosing: ClosingPeriod = {
      id: `CLOSING-${new Date().getTime()}`,
      periodeNama: periodeName,
      tanggalAwal,
      tanggalAkhir,
      tanggalEksekusi: new Date().toISOString(),
      totalPenjualan: totals.totalPenjualan,
      totalPart: totals.totalPart,
      totalJasa: totals.totalJasa,
      totalHPP: totals.totalHPP,
      labaKotor: totals.labaKotor,
      totalPengeluaran: totals.totalPengeluaran,
      labaBersih: totals.labaBersih,
      nominalPemilik: totals.nominalPemilik,
      nominalPengelola: totals.nominalPengelola,
      archivedSales: [...sales],
      archivedExpenses: [...expenses],
      archivedPurchases: [...purchases],
      snapshotStock: items.map(i => ({ ...i })),
      saldoKasAwalNextMonth: initialCashNumber,
      catatan: notes,
      closingEntries: [...closingEntries],
    };

    setCompletedClosing(newClosing);
    onExecuteClosing(newClosing);
    setIsSuccess(true);
  };

  const handleDownloadExcel = () => {
    const dataToExport = completedClosing || {
      config,
      periodeTitle: periodeName,
      sales,
      expenses,
      purchases,
      items,
      closingEntries,
      printDate: closingDate,
    };

    exportMonthlyClosingWorkbook({
      config,
      periodeTitle: completedClosing ? completedClosing.periodeNama : periodeName,
      sales: completedClosing ? completedClosing.archivedSales : sales,
      expenses: completedClosing ? completedClosing.archivedExpenses : expenses,
      purchases: completedClosing ? completedClosing.archivedPurchases : purchases,
      items: completedClosing ? completedClosing.snapshotStock : items,
      closingEntries: completedClosing ? completedClosing.closingEntries : closingEntries,
      printDate: closingDate,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Tutup Buku Akhir Bulan &amp; Jurnal Penutup</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  Monthly Closing
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Mengarsipkan periode berjalan, membuat jurnal penutup, dan membentuk saldo awal bulan baru
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

        {/* Steps indicator if not yet success */}
        {!isSuccess && (
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveStep(1)}
                className={`flex items-center gap-2 font-semibold cursor-pointer ${
                  activeStep === 1 ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  activeStep === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  1
                </span>
                <span>Rekapitulasi Keuangan</span>
              </button>

              <button
                onClick={() => setActiveStep(2)}
                className={`flex items-center gap-2 font-semibold cursor-pointer ${
                  activeStep === 2 ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  activeStep === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  2
                </span>
                <span>Jurnal Penutup &amp; Akuntansi</span>
              </button>

              <button
                onClick={() => setActiveStep(3)}
                className={`flex items-center gap-2 font-semibold cursor-pointer ${
                  activeStep === 3 ? 'text-blue-600' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  activeStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  3
                </span>
                <span>Saldo Awal Bulan Baru</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-700">
          {isSuccess ? (
            <div className="text-center py-6 space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl font-bold text-slate-900">
                  Tutup Buku Periode {completedClosing?.periodeNama} Berhasil!
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Transaksi periode lama telah tersimpan aman di Riwayat Tutup Buku. Semua sheet pembukuan kini telah disegarkan untuk transaksi awal bulan baru dengan saldo awal yang telah ditetapkan.
                </p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl mx-auto text-left">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500">Laba Bersih Ditutup</div>
                  <div className="text-sm font-bold font-mono text-emerald-700">
                    {formatRupiah(completedClosing?.labaBersih || 0)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500">Saldo Kas Awal Baru</div>
                  <div className="text-sm font-bold font-mono text-blue-700">
                    {formatRupiah(completedClosing?.saldoKasAwalNextMonth || 0)}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[11px] text-slate-500">Stok Sparepart Terbawa</div>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {totals.totalStockUnits} Unit
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                <button
                  onClick={handleDownloadExcel}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow transition cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download File Excel Tutup Buku (.xlsx)</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow transition cursor-pointer text-xs"
                >
                  Buka Lembar Pembukuan Baru
                </button>
              </div>
            </div>
          ) : activeStep === 1 ? (
            /* STEP 1: REKAPITULASI & PERIODE */
            <div className="space-y-5">
              {/* Date Requirement Alert Banner */}
              {!dateValidation.isAllowed ? (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-rose-950 shadow-2xs">
                  <div className="flex items-center gap-2 font-bold text-sm text-rose-800">
                    <Lock className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Tutup Buku Belum Dapat Dilakukan (Belum Akhir Bulan)</span>
                  </div>
                  <p className="text-xs text-rose-800 leading-relaxed">
                    Sesuai kaidah akuntansi bengkel, tutup buku bulanan <strong>hanya bisa dilakukan jika sudah di tanggal akhir bulan ({dateValidation.lastDayOfMonth} {dateValidation.monthName} {dateValidation.closingYear}) atau pada bulan setelahnya</strong>. Tujuannya agar seluruh transaksi kasir, pengadaan barang, dan pengeluaran operasional bulan ini tercatat tuntas.
                  </p>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                      <span className="text-slate-500 text-[10px] block font-sans">Tanggal Hari Ini:</span>
                      <strong className="text-slate-800 font-mono">{formatDateIndo(dateValidation.todayStr)}</strong>
                    </div>
                    <div className="bg-white px-3 py-1.5 rounded-lg border border-rose-200">
                      <span className="text-slate-500 text-[10px] block font-sans">Syarat Minimal Tutup Buku:</span>
                      <strong className="text-rose-700 font-mono">{formatDateIndo(dateValidation.endOfMonthDateStr)}</strong>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-rose-200 text-rose-900 font-bold text-xs">
                      Kurang {dateValidation.daysRemaining} hari lagi
                    </span>
                  </div>

                  <div className="pt-2 border-t border-rose-200 mt-2 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-rose-950 font-semibold select-none">
                      <input
                        type="checkbox"
                        checked={simulationOverride}
                        onChange={(e) => setSimulationOverride(e.target.checked)}
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                      />
                      <span>Mode Uji Coba: Izinkan simulasi tutup buku sebelum tanggal akhir bulan</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-950 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="text-emerald-900">Syarat Periode Terpenuhi:</strong>
                      <span className="text-emerald-800 ml-1">
                        Tanggal saat ini ({formatDateIndo(dateValidation.todayStr)}) telah berada di tanggal akhir bulan / periode setelahnya.
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold text-[11px] shrink-0">
                    Siap Tutup Buku
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Periode Tutup Buku:
                  </label>
                  <input
                    type="text"
                    value={periodeName}
                    onChange={(e) => setPeriodeName(e.target.value)}
                    placeholder="Contoh: September 2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tanggal Efektif Penutupan (Akhir Periode):
                  </label>
                  <input
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-semibold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Akhir bulan untuk periode ini adalah <strong>{formatDateIndo(dateValidation.endOfMonthDateStr)}</strong>
                  </p>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="text-[11px] text-blue-700 font-medium">Total Omset Penjualan</div>
                  <div className="text-sm font-bold font-mono text-blue-950 mt-0.5">
                    {formatRupiah(totals.totalPenjualan)}
                  </div>
                  <div className="text-[10px] text-blue-600 mt-0.5">
                    {sales.length} transaksi
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-[11px] text-amber-700 font-medium">Total Modal Part (HPP)</div>
                  <div className="text-sm font-bold font-mono text-amber-950 mt-0.5">
                    {formatRupiah(totals.totalHPP)}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">
                    Harga modal barang
                  </div>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                  <div className="text-[11px] text-purple-700 font-medium">Beban Operasional</div>
                  <div className="text-sm font-bold font-mono text-purple-950 mt-0.5">
                    {formatRupiah(totals.totalPengeluaran)}
                  </div>
                  <div className="text-[10px] text-purple-600 mt-0.5">
                    {expenses.length} pengeluaran
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <div className="text-[11px] text-emerald-700 font-bold">Laba Bersih Akhir</div>
                  <div className="text-sm font-bold font-mono text-emerald-950 mt-0.5">
                    {formatRupiah(totals.labaBersih)}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">
                    Siap dibagi hasil
                  </div>
                </div>
              </div>

              {/* Profit Sharing Table */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span>Realisasi Bagi Hasil Bulan Ini</span>
                  <span className="text-slate-500 font-normal">Kaidah {config.pctPemilik}% Pemilik / {config.pctPengelola}% Pengelola</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-700">Pemilik Modal:</span>
                      <div className="text-[10px] text-slate-400">{config.namaPemilik}</div>
                    </div>
                    <span className="font-bold font-mono text-emerald-700 text-sm">
                      {formatRupiah(totals.nominalPemilik)}
                    </span>
                  </div>

                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-slate-700">Pengelola Bengkel:</span>
                      <div className="text-[10px] text-slate-400">{config.namaPengelola}</div>
                    </div>
                    <span className="font-bold font-mono text-blue-700 text-sm">
                      {formatRupiah(totals.nominalPengelola)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  Pastikan seluruh nota penjualan, faktur pembelian sparepart, dan bukti pengeluaran bulan ini telah dicatat dengan benar sebelum melakukan penutupan buku.
                </p>
              </div>
            </div>
          ) : activeStep === 2 ? (
            /* STEP 2: JURNAL PENUTUP (CLOSING ENTRIES) */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Daftar Ayat Jurnal Penutup (Closing Entries)
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Format standar akuntansi untuk menolkan akun nominal (pendapatan &amp; beban) ke modal
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                  Status: Balance (Seimbang)
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Kode</th>
                      <th className="p-2.5">Nama Akun Akuntansi</th>
                      <th className="p-2.5 text-right">Debit (Rp)</th>
                      <th className="p-2.5 text-right">Kredit (Rp)</th>
                      <th className="p-2.5">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {closingEntries.map((je, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/75 font-mono">
                        <td className="p-2.5 text-slate-500">{je.kodeAkun}</td>
                        <td className="p-2.5 font-sans font-medium text-slate-800">
                          {je.namaAkun}
                        </td>
                        <td className="p-2.5 text-right text-slate-900 font-semibold">
                          {je.debit > 0 ? formatRupiah(je.debit) : '-'}
                        </td>
                        <td className="p-2.5 text-right text-slate-900 font-semibold">
                          {je.kredit > 0 ? formatRupiah(je.kredit) : '-'}
                        </td>
                        <td className="p-2.5 font-sans text-[11px] text-slate-500">
                          {je.keterangan}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100/70 font-bold border-t border-slate-300">
                    <tr>
                      <td colSpan={2} className="p-2.5 text-slate-800">TOTAL JURNAL PENUTUP</td>
                      <td className="p-2.5 text-right font-mono text-slate-950">
                        {formatRupiah(closingEntries.reduce((acc, c) => acc + c.debit, 0))}
                      </td>
                      <td className="p-2.5 text-right font-mono text-slate-950">
                        {formatRupiah(closingEntries.reduce((acc, c) => acc + c.kredit, 0))}
                      </td>
                      <td className="p-2.5 text-[11px] text-emerald-700 font-semibold">
                        Keseimbangan Terpenuhi
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* STEP 3: SALDO AWAL BULAN BARU */
            <div className="space-y-5">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Mekanisme Pembentukan Saldo Awal (Opening Balance):</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-blue-800 space-y-1">
                  <li>
                    <strong>Sheet Database Barang:</strong> Stok fisik akhir ({totals.totalStockUnits} unit) otomatis dijadikan Saldo Stok Awal periode berikutnya.
                  </li>
                  <li>
                    <strong>Sheet Penjualan &amp; Pembelian:</strong> Dikosongkan untuk lembar kerja baru bulan berikutnya. Seluruh data lama tersimpan di riwayat arsip.
                  </li>
                  <li>
                    <strong>Sheet Pengeluaran:</strong> Dimulai dengan 1 baris transaksi pembuka &quot;Kas Awal / Modal Kerja Kasir&quot;.
                  </li>
                </ul>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Saldo Kas Awal Kasir / Modal Kerja Operasional Bulan Baru (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      type="text"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="500000"
                      className="w-full pl-10 pr-4 py-2 text-sm font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Uang fisik kas kecil di kasir untuk kembalian transaksi servis awal bulan
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Catatan Penutupan Buku (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan inventaris, bagi hasil sudah diserahkan, dll."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          {!isSuccess ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
              >
                Batal
              </button>

              <div className="flex items-center gap-2">
                {activeStep > 1 && (
                  <button
                    onClick={() => setActiveStep((prev) => (prev - 1) as 1 | 2)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition cursor-pointer"
                  >
                    Kembali
                  </button>
                )}

                {activeStep < 3 ? (
                  <button
                    onClick={() => {
                      if (!canProceed) {
                        alert(
                          `Tutup buku hanya bisa dilakukan jika sudah di tanggal akhir bulan (${dateValidation.lastDayOfMonth} ${dateValidation.monthName}) atau pada bulan setelahnya.`
                        );
                        return;
                      }
                      setActiveStep((prev) => (prev + 1) as 2 | 3);
                    }}
                    disabled={!canProceed}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    title={
                      !canProceed
                        ? `Belum dapat dilanjutkan karena belum mencapai tanggal akhir bulan (${dateValidation.lastDayOfMonth} ${dateValidation.monthName})`
                        : undefined
                    }
                  >
                    <span>Lanjut ke Langkah {activeStep + 1}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleConfirmClosing}
                    disabled={!canProceed}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow transition cursor-pointer"
                    title={
                      !canProceed
                        ? `Tutup buku terkunci hingga tanggal akhir bulan (${dateValidation.lastDayOfMonth} ${dateValidation.monthName})`
                        : undefined
                    }
                  >
                    <Lock className="w-4 h-4" />
                    <span>Eksekusi Tutup Buku Sekarang</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Tutup Jendela
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
