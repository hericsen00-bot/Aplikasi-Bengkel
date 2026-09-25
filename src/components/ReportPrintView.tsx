import React, { useMemo, useState } from 'react';
import { 
  Printer, 
  FileSpreadsheet, 
  Copy, 
  Check, 
  Calendar,
  Building2, 
  Lock,
  Filter,
  Layers,
  ArrowUpDown,
  BookOpen,
  Info,
  DollarSign
} from 'lucide-react';
import { Item, Penjualan, Pengeluaran, Pembelian, WorkshopConfig, ClosingPeriod } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { exportMonthlyClosingWorkbook, generateStandardClosingEntries } from '../utils/excelExporter';
import { generateGeneralLedger, generateBalanceSheet } from '../utils/accountingLedger';

interface ReportPrintViewProps {
  config: WorkshopConfig;
  sales: Penjualan[];
  expenses: Pengeluaran[];
  purchases: Pembelian[];
  items: Item[];
  onOpenProfilForm: () => void;
  onOpenMonthlyClosing?: () => void;
  closingHistory?: ClosingPeriod[];
}

type ReportSection = 'rekap' | 'penjualan' | 'pengeluaran' | 'pembelian' | 'bukubesar' | 'neraca' | 'jurnal' | 'lengkap';

export const ReportPrintView: React.FC<ReportPrintViewProps> = ({
  config,
  sales,
  expenses,
  purchases,
  items,
  onOpenProfilForm,
  onOpenMonthlyClosing,
  closingHistory = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [printDate, setPrintDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [activeSection, setActiveSection] = useState<ReportSection>('rekap');

  // Filter state
  const [filterMode, setFilterMode] = useState<'all' | 'month' | 'custom'>('month');
  
  // Available months list extracted from all transaction dates
  const availableMonths = useMemo(() => {
    const dates = [
      ...sales.map(s => s.tanggal),
      ...expenses.map(e => e.tanggal),
      ...purchases.map(p => p.tanggal),
    ].filter(Boolean);

    const monthSet = new Set<string>();
    dates.forEach(d => {
      const match = d.match(/^(\d{4})-(\d{2})/);
      if (match) monthSet.add(`${match[1]}-${match[2]}`);
    });

    // Add current month if empty
    const nowStr = new Date().toISOString().substring(0, 7);
    monthSet.add(nowStr);

    return Array.from(monthSet).sort().reverse();
  }, [sales, expenses, purchases]);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0] || new Date().toISOString().substring(0, 7)
  );

  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Filtered dataset
  const filteredSales = useMemo(() => {
    if (filterMode === 'all') return sales;
    if (filterMode === 'month') {
      return sales.filter(s => s.tanggal.startsWith(selectedMonth));
    }
    return sales.filter(s => s.tanggal >= startDate && s.tanggal <= endDate);
  }, [sales, filterMode, selectedMonth, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    if (filterMode === 'all') return expenses;
    if (filterMode === 'month') {
      return expenses.filter(e => e.tanggal.startsWith(selectedMonth));
    }
    return expenses.filter(e => e.tanggal >= startDate && e.tanggal <= endDate);
  }, [expenses, filterMode, selectedMonth, startDate, endDate]);

  const filteredPurchases = useMemo(() => {
    if (filterMode === 'all') return purchases;
    if (filterMode === 'month') {
      return purchases.filter(p => p.tanggal.startsWith(selectedMonth));
    }
    return purchases.filter(p => p.tanggal >= startDate && p.tanggal <= endDate);
  }, [purchases, filterMode, selectedMonth, startDate, endDate]);

  // Dynamic Periode Label
  const periodeLabel = useMemo(() => {
    if (filterMode === 'all') return 'Semua Periode Transaksi';
    if (filterMode === 'month') {
      const [y, m] = selectedMonth.split('-');
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      return `Bulan ${monthNames[parseInt(m, 10) - 1]} ${y}`;
    }
    return `${formatDateIndo(startDate)} s/d ${formatDateIndo(endDate)}`;
  }, [filterMode, selectedMonth, startDate, endDate]);

  // Totals based on filtered data
  const totals = useMemo(() => {
    const totalPart = filteredSales.reduce((acc, s) => acc + (s.totalPart ?? (s.qty * s.hargaJual)), 0);
    const totalJasa = filteredSales.reduce((acc, s) => acc + (s.hargaJasa ?? 0), 0);
    const totalPenjualan = filteredSales.reduce((acc, s) => acc + s.totalPenjualan, 0);
    const totalHPP = filteredSales.reduce((acc, s) => acc + s.totalHPP, 0);
    const labaKotor = totalPenjualan - totalHPP;
    const totalPengeluaran = filteredExpenses.reduce((acc, e) => acc + e.jumlahPengeluaran, 0);
    const labaBersih = labaKotor - totalPengeluaran;

    const totalBeli = filteredPurchases.reduce((acc, p) => acc + p.totalHarga, 0);
    const totalQtyBeli = filteredPurchases.reduce((acc, p) => acc + p.qty, 0);
    const totalQtyJual = filteredSales.reduce((acc, s) => acc + s.qty, 0);

    const pctPemilikDecimal = config.pctPemilik / 100;
    const pctPengelolaDecimal = config.pctPengelola / 100;

    const nominalPemilik = Math.max(0, labaBersih) * pctPemilikDecimal;
    const nominalPengelola = Math.max(0, labaBersih) * pctPengelolaDecimal;

    return {
      totalPart,
      totalJasa,
      totalPenjualan,
      totalHPP,
      labaKotor,
      totalPengeluaran,
      labaBersih,
      totalBeli,
      totalQtyBeli,
      totalQtyJual,
      nominalPemilik,
      nominalPengelola,
    };
  }, [filteredSales, filteredExpenses, filteredPurchases, config]);

  // Closing entries calculation
  const closingEntries = useMemo(() => {
    return generateStandardClosingEntries({
      tanggal: printDate,
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
  }, [totals, printDate, config]);

  // General Ledger accounts calculation
  const glAccounts = useMemo(() => {
    return generateGeneralLedger({
      config,
      sales: filteredSales,
      expenses: filteredExpenses,
      purchases: filteredPurchases,
      items,
      closingHistory,
      selectedMonth,
    });
  }, [config, filteredSales, filteredExpenses, filteredPurchases, items, closingHistory, selectedMonth]);

  // Balance sheet calculation
  const balanceSheetData = useMemo(() => {
    return generateBalanceSheet(glAccounts, periodeLabel, printDate);
  }, [glAccounts, periodeLabel, printDate]);

  // ASCII plain-text summary
  const asciiReport = useMemo(() => {
    const tgl = formatDateIndo(printDate);
    const divider = '============================================================';

    return `${divider}
                     ${config.namaBengkel.toUpperCase()}
             ${config.alamat}
${divider}
              LAPORAN TUTUP BUKU & REKAPITULASI USAHA
                   Periode: ${periodeLabel}
                   Tanggal Cetak: ${tgl}
${divider}

1. PENDAPATAN OMSET TOTAL        : ${formatRupiah(totals.totalPenjualan)}
   - Penjualan Sparepart (Part)  : ${formatRupiah(totals.totalPart)} (${filteredSales.length} transaksi)
   - Pendapatan Jasa Servis      : ${formatRupiah(totals.totalJasa)} (100% Margin)
2. TOTAL HPP (MODAL BARANG)      : ${formatRupiah(totals.totalHPP)}
   ------------------------------------------------------------ (-)
   LABA KOTOR (GROSS PROFIT)     : ${formatRupiah(totals.labaKotor)}

3. TOTAL BEBAN PENGELUARAN       : ${formatRupiah(totals.totalPengeluaran)} (${filteredExpenses.length} transaksi)
   ------------------------------------------------------------ (-)
   LABA BERSIH (NET PROFIT)      : ${formatRupiah(totals.labaBersih)}

4. TOTAL PEMBELIAN / RESTOK      : ${formatRupiah(totals.totalBeli)} (${totals.totalQtyBeli} unit)

${divider}
SKEMA BAGI HASIL KEUNTUNGAN:
- Bagian Pemilik Modal (${config.pctPemilik}%)   : ${formatRupiah(totals.nominalPemilik)}
- Bagian Pengelola Bengkel (${config.pctPengelola}%) : ${formatRupiah(totals.nominalPengelola)}
${divider}

                                     ${config.kota}, ${tgl}
   Disetujui Oleh,                   Dibuat Oleh,
   (Pemilik Modal)                   (Pengelola Bengkel)




 ( ${config.namaPemilik} )         ( ${config.namaPengelola} )
`;
  }, [config, totals, printDate, periodeLabel, filteredSales.length, filteredExpenses.length]);

  const handleCopyAscii = () => {
    navigator.clipboard.writeText(asciiReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    exportMonthlyClosingWorkbook({
      config,
      periodeTitle: periodeLabel,
      sales: filteredSales,
      expenses: filteredExpenses,
      purchases: filteredPurchases,
      items,
      closingEntries,
      printDate,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Filter & Control Panel (Hidden during print) */}
      <div className="print:hidden bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Pusat Laporan Cetak &amp; Tutup Buku Bulanan Excel</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter periode tanggal/bulan, export multi-sheet Excel (.xlsx), dan cetak laporan standar akuntansi A4
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenMonthlyClosing && (
              <button
                onClick={onOpenMonthlyClosing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-xs transition-colors cursor-pointer"
                title="Beralih ke bulan baru dengan jurnal penutup dan saldo awal"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Tutup Buku Akhir Bulan</span>
              </button>
            )}

            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Download format Excel .xlsx lengkap (Penjualan, Pengeluaran, Pembelian, Jurnal Penutup)"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:bg-slate-950 rounded-lg shadow-xs transition-colors cursor-pointer"
              title="Cetak format fisik atau simpan PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF (A4)</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center text-xs">
          {/* Mode Selector */}
          <div className="md:col-span-4 flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterMode('month')}
              className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-center transition cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Per Bulan
            </button>
            <button
              onClick={() => setFilterMode('custom')}
              className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-center transition cursor-pointer ${
                filterMode === 'custom'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rentang Tanggal
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`flex-1 py-1.5 px-2 rounded-md font-semibold text-center transition cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua
            </button>
          </div>

          {/* Date Picker Controls */}
          <div className="md:col-span-5 flex items-center gap-2">
            {filterMode === 'month' ? (
              <div className="flex items-center gap-2 w-full">
                <span className="text-slate-600 font-medium whitespace-nowrap">Pilih Bulan:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  {availableMonths.map((ym) => {
                    const [y, m] = ym.split('-');
                    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                    const label = `${monthNames[parseInt(m, 10) - 1]} ${y}`;
                    return (
                      <option key={ym} value={ym}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : filterMode === 'custom' ? (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-slate-400">s/d</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div className="text-xs text-slate-500 italic">
                Menampilkan seluruh riwayat transaksi yang ada
              </div>
            )}
          </div>

          {/* Print Date & Auxiliary */}
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px]">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Tgl Cetak:</span>
              <input
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
                className="bg-white border border-slate-300 rounded px-1 py-0.5 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveSection('rekap')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'rekap'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Rekap Laba Rugi &amp; Bagi Hasil
            </button>
            <button
              onClick={() => setActiveSection('penjualan')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'penjualan'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              1. Seluruh Penjualan &amp; Jasa ({filteredSales.length})
            </button>
            <button
              onClick={() => setActiveSection('pengeluaran')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'pengeluaran'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              2. Seluruh Pengeluaran ({filteredExpenses.length})
            </button>
            <button
              onClick={() => setActiveSection('pembelian')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'pembelian'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              3. Seluruh Pembelian ({filteredPurchases.length})
            </button>
            <button
              onClick={() => setActiveSection('bukubesar')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'bukubesar'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Buku Besar (GL)
            </button>
            <button
              onClick={() => setActiveSection('neraca')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'neraca'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Neraca Keuangan
            </button>
            <button
              onClick={() => setActiveSection('jurnal')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'jurnal'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Jurnal Penutup
            </button>
            <button
              onClick={() => setActiveSection('lengkap')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeSection === 'lengkap'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Semua Halaman (Lengkap)
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onOpenProfilForm}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Profil / % Bagi Hasil</span>
            </button>

            <button
              onClick={handleCopyAscii}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Printable Sheet Presentation */}
      <div 
        id="printable-report" 
        className="bg-white p-8 sm:p-12 rounded-xl shadow-md border border-slate-200 text-slate-900 mx-auto print:shadow-none print:border-none print:p-0 print:m-0 font-sans space-y-8"
      >
        {/* Header Bengkel */}
        <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight uppercase text-slate-900">
            {config.namaBengkel}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 italic">
            {config.alamat}
          </p>
          <p className="text-xs text-slate-700 font-medium">
            Penanggung Jawab: <strong>{config.namaPengelola}</strong> {config.telepon && `• Telp: ${config.telepon}`} • Pemilik Modal: <strong>{config.namaPemilik}</strong>
          </p>
        </div>

        {/* Title of Report */}
        <div className="text-center py-2 border-b border-slate-300">
          <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wide text-slate-800">
            LAPORAN TUTUP BUKU &amp; PERTANGGUNGJAWABAN KEUANGAN
          </h2>
          <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 bg-slate-100 rounded-full text-xs font-bold text-slate-800">
            <span>Periode Laporan: {periodeLabel}</span>
            <span>•</span>
            <span>Tgl Cetak: {formatDateIndo(printDate)}</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN 1: REKAPITULASI LABA RUGI & BAGI HASIL */}
        {/* ========================================================================= */}
        {(activeSection === 'rekap' || activeSection === 'lengkap') && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>I. REKAPITULASI PENDAPATAN &amp; BEBAN (LABA RUGI)</span>
                <span className="text-[11px] text-slate-500 font-normal">Metode: Akrual Suku Cadang &amp; Jasa</span>
              </h3>

              <div className="space-y-2 text-sm bg-slate-50/70 p-4 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-800 font-semibold">1. Total Omset Penjualan (Sparepart + Jasa Servis)</span>
                  <span className="font-mono font-bold text-slate-950">
                    {formatRupiah(totals.totalPenjualan)}
                  </span>
                </div>

                {/* Sub-breakdown */}
                <div className="pl-4 pr-1 py-1 space-y-1 text-xs border-l-2 border-slate-300 text-slate-600 bg-white rounded-r">
                  <div className="flex justify-between items-center">
                    <span>• Penjualan Suku Cadang ({totals.totalQtyJual} unit part terjual)</span>
                    <span className="font-mono text-slate-800 font-medium">{formatRupiah(totals.totalPart)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-emerald-800 font-medium">• Pendapatan Biaya Jasa Servis / Pasang (100% Margin)</span>
                    <span className="font-mono text-emerald-700 font-bold">+{formatRupiah(totals.totalJasa)}</span>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-700">2. Total HPP (Harga Pokok Penjualan - Modal Fisik Sparepart)</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatRupiah(totals.totalHPP)}
                  </span>
                </div>

                <div className="flex justify-end text-xs text-slate-400 border-b border-slate-300 pb-1">
                  <span>(-)</span>
                </div>

                <div className="flex justify-between items-center py-1.5 text-base font-bold bg-slate-100/80 px-2 rounded">
                  <span className="text-slate-800">LABA KOTOR USAHA (GROSS PROFIT)</span>
                  <span className="font-mono text-emerald-800">
                    {formatRupiah(totals.labaKotor)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1 pt-2">
                  <span className="text-slate-700">3. Total Beban Operasional &amp; Biaya Usaha</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {formatRupiah(totals.totalPengeluaran)}
                  </span>
                </div>

                <div className="flex justify-end text-xs text-slate-400 border-b border-slate-300 pb-1">
                  <span>(-)</span>
                </div>

                <div className="flex justify-between items-center py-2 text-base sm:text-lg font-extrabold bg-blue-50 px-3 rounded-lg border border-blue-200 text-blue-950">
                  <span>LABA BERSIH USAHA (NET PROFIT)</span>
                  <span className="font-mono text-blue-900">
                    {formatRupiah(totals.labaBersih)}
                  </span>
                </div>
              </div>
            </div>

            {/* Skema Bagi Hasil */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  II. PEMBAGIAN HASIL LABA BERSIH PERIODE INI
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  Sesuai Rasio: Pemilik {config.pctPemilik}% : Pengelola {config.pctPengelola}%
                </span>
              </div>

              <div className="overflow-hidden border border-slate-300 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 uppercase font-bold border-b border-slate-300">
                    <tr>
                      <th className="px-4 py-2.5">Pihak Penerima</th>
                      <th className="px-4 py-2.5 text-center">Porsi (%)</th>
                      <th className="px-4 py-2.5">Formula Perhitungan</th>
                      <th className="px-4 py-2.5 text-right">Jumlah Diterima</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Pemilik Modal / Investor
                        <div className="text-[10px] text-slate-500 font-normal">{config.namaPemilik}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-emerald-700 font-mono">
                        {config.pctPemilik}%
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">
                        {formatRupiah(totals.labaBersih)} × {config.pctPemilik}%
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-slate-900 text-sm">
                        {formatRupiah(totals.nominalPemilik)}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Pengelola / Manajemen Bengkel
                        <div className="text-[10px] text-slate-500 font-normal">{config.namaPengelola}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-bold text-blue-700 font-mono">
                        {config.pctPengelola}%
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono">
                        {formatRupiah(totals.labaBersih)} × {config.pctPengelola}%
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-mono text-slate-900 text-sm">
                        {formatRupiah(totals.nominalPengelola)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <tr>
                      <td className="px-4 py-2.5">TOTAL LABA DIDISTRIBUSIKAN</td>
                      <td className="px-4 py-2.5 text-center font-mono">
                        {config.pctPemilik + config.pctPengelola}%
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 font-normal">100% Realisasi Laba Bersih</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-900 text-sm">
                        {formatRupiah(totals.nominalPemilik + totals.nominalPengelola)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN 2: 1. SELURUH PENJUALAN & JASA */}
        {/* ========================================================================= */}
        {(activeSection === 'penjualan' || activeSection === 'lengkap') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                1. DAFTAR SELURUH TRANSAKSI PENJUALAN SUKU CADANG &amp; PENDAPATAN JASA
              </h3>
              <span className="text-xs text-slate-500">
                Total: {filteredSales.length} Transaksi ({totals.totalQtyJual} Part)
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2">No Transaksi</th>
                    <th className="p-2">Tanggal</th>
                    <th className="p-2">Kode</th>
                    <th className="p-2">Nama Sparepart</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Harga Part</th>
                    <th className="p-2 text-right">Total Part</th>
                    <th className="p-2 text-right">Ongkos Jasa</th>
                    <th className="p-2 text-right">Total Bayar</th>
                    <th className="p-2 text-right">HPP Modal</th>
                    <th className="p-2 text-right">Laba Kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="p-4 text-center text-slate-400 italic">
                        Tidak ada transaksi penjualan pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-mono">
                        <td className="p-2 font-medium text-slate-900">{s.noTransaksi}</td>
                        <td className="p-2 text-slate-600">{s.tanggal}</td>
                        <td className="p-2 text-slate-500">{s.kodeBarang}</td>
                        <td className="p-2 font-sans text-slate-800">{s.namaBarang}</td>
                        <td className="p-2 text-center font-bold">{s.qty}</td>
                        <td className="p-2 text-right">{formatRupiah(s.hargaJual)}</td>
                        <td className="p-2 text-right">{formatRupiah(s.totalPart ?? (s.qty * s.hargaJual))}</td>
                        <td className="p-2 text-right text-emerald-700 font-medium">{formatRupiah(s.hargaJasa ?? 0)}</td>
                        <td className="p-2 text-right font-bold text-slate-900">{formatRupiah(s.totalPenjualan)}</td>
                        <td className="p-2 text-right text-slate-600">{formatRupiah(s.totalHPP)}</td>
                        <td className="p-2 text-right text-blue-700 font-semibold">{formatRupiah(s.labaKotor)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 font-mono">
                  <tr>
                    <td colSpan={4} className="p-2 text-left font-sans">TOTAL PENJUALAN PERIODE</td>
                    <td className="p-2 text-center">{totals.totalQtyJual}</td>
                    <td className="p-2"></td>
                    <td className="p-2 text-right">{formatRupiah(totals.totalPart)}</td>
                    <td className="p-2 text-right text-emerald-800">{formatRupiah(totals.totalJasa)}</td>
                    <td className="p-2 text-right text-slate-950">{formatRupiah(totals.totalPenjualan)}</td>
                    <td className="p-2 text-right">{formatRupiah(totals.totalHPP)}</td>
                    <td className="p-2 text-right text-blue-900">{formatRupiah(totals.labaKotor)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN 3: 2. SELURUH PENGELUARAN BEBAN */}
        {/* ========================================================================= */}
        {(activeSection === 'pengeluaran' || activeSection === 'lengkap') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                2. DAFTAR SELURUH BIAYA &amp; PENGELUARAN OPERASIONAL
              </h3>
              <span className="text-xs text-slate-500">
                Total: {filteredExpenses.length} Transaksi Beban
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">No Transaksi</th>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">Kategori Beban</th>
                    <th className="p-2.5">Keterangan Pengeluaran</th>
                    <th className="p-2.5 text-right">Jumlah Biaya (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400 italic">
                        Tidak ada catatan pengeluaran operasional pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((e, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-slate-700">{e.noTransaksi}</td>
                        <td className="p-2.5 font-mono text-slate-600">{e.tanggal}</td>
                        <td className="p-2.5 font-semibold text-slate-800">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {e.kategori}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-700">{e.keterangan}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                          {formatRupiah(e.jumlahPengeluaran)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 font-mono">
                  <tr>
                    <td colSpan={4} className="p-2.5 text-left font-sans">TOTAL PENGELUARAN OPERASIONAL</td>
                    <td className="p-2.5 text-right text-slate-950">
                      {formatRupiah(totals.totalPengeluaran)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN 4: 3. SELURUH PEMBELIAN STOK */}
        {/* ========================================================================= */}
        {(activeSection === 'pembelian' || activeSection === 'lengkap') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                3. DAFTAR SELURUH PEMBELIAN &amp; PENGADAAN SUKU CADANG (RESTOK)
              </h3>
              <span className="text-xs text-slate-500">
                Total: {filteredPurchases.length} Faktur Pembelian ({totals.totalQtyBeli} Unit)
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">No Faktur</th>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">Kode</th>
                    <th className="p-2.5">Nama Sparepart</th>
                    <th className="p-2.5">Peruntukan</th>
                    <th className="p-2.5 text-center">Qty Masuk</th>
                    <th className="p-2.5 text-right">Harga Modal Satuan</th>
                    <th className="p-2.5 text-right">Total Pembelian (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-slate-400 italic">
                        Tidak ada transaksi pembelian suku cadang pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 font-mono">
                        <td className="p-2.5 font-medium text-slate-800">{p.noTransaksi}</td>
                        <td className="p-2.5 text-slate-600">{p.tanggal}</td>
                        <td className="p-2.5 text-slate-500">{p.kodeBarang}</td>
                        <td className="p-2.5 font-sans font-semibold text-slate-800">{p.namaBarang}</td>
                        <td className="p-2.5 font-sans text-slate-600">{p.jenisKendaraan}</td>
                        <td className="p-2.5 text-center font-bold text-emerald-700">+{p.qty}</td>
                        <td className="p-2.5 text-right">{formatRupiah(p.hargaModal)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatRupiah(p.totalHarga)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 font-mono">
                  <tr>
                    <td colSpan={5} className="p-2.5 text-left font-sans">TOTAL PEMBELIAN PERIODE</td>
                    <td className="p-2.5 text-center text-emerald-800">+{totals.totalQtyBeli}</td>
                    <td className="p-2.5"></td>
                    <td className="p-2.5 text-right text-slate-950">{formatRupiah(totals.totalBeli)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN: BUKU BESAR UMUM (GENERAL LEDGER) */}
        {/* ========================================================================= */}
        {(activeSection === 'bukubesar' || activeSection === 'lengkap') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                BUKU BESAR UMUM (GENERAL LEDGER) - SALDO AWAL &amp; MUTASI BULAN BERJALAN
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                {glAccounts.length} Akun Standar
              </span>
            </div>

            <div className="space-y-6">
              {glAccounts.map((acc) => (
                <div key={acc.kodeAkun} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <span className="font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded border border-slate-300 mr-2">
                        {acc.kodeAkun}
                      </span>
                      <strong className="text-slate-900">{acc.namaAkun}</strong>
                      <span className="text-slate-500 text-[11px] ml-2">({acc.kategori} • Normal: {acc.saldoNormal})</span>
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span>Saldo Awal: <strong>{formatRupiah(acc.saldoAwal)}</strong></span>
                      <span>Mutasi D: <strong className="text-emerald-700">+{formatRupiah(acc.mutasiDebit)}</strong></span>
                      <span>Mutasi K: <strong className="text-rose-700">-{formatRupiah(acc.mutasiKredit)}</strong></span>
                      <span className="bg-indigo-900 text-white px-2 py-0.5 rounded font-bold">Saldo Akhir: {formatRupiah(acc.saldoAkhir)}</span>
                    </div>
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2 w-24">Tanggal</th>
                        <th className="p-2 w-32">No Bukti</th>
                        <th className="p-2">Keterangan Transaksi</th>
                        <th className="p-2 text-right w-28">Debit (Rp)</th>
                        <th className="p-2 text-right w-28">Kredit (Rp)</th>
                        <th className="p-2 text-right w-32 bg-slate-100">Saldo (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {acc.entries.map((en, eIdx) => (
                        <tr key={eIdx} className={`hover:bg-slate-50 ${en.isOpeningBalance ? 'bg-emerald-50/70 font-semibold' : ''}`}>
                          <td className="p-2 text-slate-600">{en.tanggal}</td>
                          <td className="p-2 font-bold text-indigo-900">{en.noBukti}</td>
                          <td className="p-2 font-sans text-slate-800">
                            {en.isOpeningBalance && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-900 text-[9px] font-bold mr-1.5">
                                SALDO AWAL
                              </span>
                            )}
                            {en.keterangan}
                          </td>
                          <td className="p-2 text-right text-emerald-800">{en.debit > 0 ? formatRupiah(en.debit) : '-'}</td>
                          <td className="p-2 text-right text-rose-800">{en.kredit > 0 ? formatRupiah(en.kredit) : '-'}</td>
                          <td className="p-2 text-right font-bold text-slate-900 bg-slate-50/50">{formatRupiah(en.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN: LAPORAN NERACA KEUANGAN (BALANCE SHEET) */}
        {/* ========================================================================= */}
        {(activeSection === 'neraca' || activeSection === 'lengkap') && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                LAPORAN NERACA KEUANGAN (BALANCE SHEET) - POSISI KEUANGAN BERLANJUT
              </h3>
              <span className="text-xs text-emerald-700 font-semibold">
                Status: Seimbang (Balanced)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aktiva (Aset) */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/30">
                <h4 className="font-bold text-slate-800 text-xs uppercase border-b pb-2 mb-2">
                  AKTIVA (ASET USAHA)
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-sans text-slate-700">1. Kas di Kasir &amp; Bank</span>
                    <span className="font-bold">{formatRupiah(balanceSheetData.asetLancar.kasDiKasir)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-sans text-slate-700">2. Persediaan Suku Cadang (Stok Fisik)</span>
                    <span className="font-bold">{formatRupiah(balanceSheetData.asetLancar.persediaanBarang)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-slate-800 font-extrabold text-emerald-900 bg-emerald-50 px-2 rounded">
                    <span className="font-sans">TOTAL AKTIVA (ASET)</span>
                    <span>{formatRupiah(balanceSheetData.totalAset)}</span>
                  </div>
                </div>
              </div>

              {/* Passiva (Kewajiban & Ekuitas) */}
              <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/30">
                <h4 className="font-bold text-slate-800 text-xs uppercase border-b pb-2 mb-2">
                  PASSIVA (KEWAJIBAN &amp; EKUITAS)
                </h4>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-sans text-slate-700">1. Kewajiban / Hutang Supplier</span>
                    <span className="font-bold text-slate-400">Rp 0</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-sans text-slate-700">2. Modal Usaha Pindahan Bulan Lalu</span>
                    <span className="font-bold">{formatRupiah(balanceSheetData.ekuitas.modalPemilikAwal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200">
                    <span className="font-sans text-slate-700">3. Laba Bersih Periode Berjalan</span>
                    <span className="font-bold text-emerald-800">{formatRupiah(balanceSheetData.ekuitas.labaPeriodeBerjalan)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-t-2 border-slate-800 font-extrabold text-indigo-900 bg-indigo-50 px-2 rounded">
                    <span className="font-sans">TOTAL PASSIVA (MODAL)</span>
                    <span>{formatRupiah(balanceSheetData.totalPassiva)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* BAGIAN 5: JURNAL PENUTUP (CLOSING ENTRIES) */}
        {/* ========================================================================= */}
        {(activeSection === 'jurnal' || activeSection === 'lengkap') && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-300 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                AYAT JURNAL PENUTUP (CLOSING ENTRIES) AKHIR BULAN
              </h3>
              <span className="text-xs text-slate-500 font-mono">
                Debit = Kredit (Balance)
              </span>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">Kode Akun</th>
                    <th className="p-2.5">Nama Akun &amp; Keterangan Jurnal</th>
                    <th className="p-2.5 text-right">Debit (Rp)</th>
                    <th className="p-2.5 text-right">Kredit (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {closingEntries.map((ce, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-600">{ce.tanggal}</td>
                      <td className="p-2.5 text-slate-500">{ce.kodeAkun}</td>
                      <td className="p-2.5 font-sans font-medium text-slate-800">
                        {ce.namaAkun}
                        <div className="text-[10px] text-slate-400 font-normal font-sans">{ce.keterangan}</div>
                      </td>
                      <td className="p-2.5 text-right text-slate-900 font-semibold">
                        {ce.debit > 0 ? formatRupiah(ce.debit) : '-'}
                      </td>
                      <td className="p-2.5 text-right text-slate-900 font-semibold">
                        {ce.kredit > 0 ? formatRupiah(ce.kredit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100/80 font-bold border-t-2 border-slate-300 font-mono">
                  <tr>
                    <td colSpan={3} className="p-2.5 text-left font-sans">TOTAL JURNAL PENUTUP</td>
                    <td className="p-2.5 text-right text-slate-950">
                      {formatRupiah(closingEntries.reduce((acc, c) => acc + c.debit, 0))}
                    </td>
                    <td className="p-2.5 text-right text-slate-950">
                      {formatRupiah(closingEntries.reduce((acc, c) => acc + c.kredit, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Section 6: Signature Approval Block */}
        <div className="pt-8 pb-4">
          <div className="text-right text-xs text-slate-600 mb-6 font-medium">
            {config.kota}, {formatDateIndo(printDate)}
          </div>

          <div className="grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-16">
              <div>
                <p className="font-semibold text-slate-800">Disetujui Oleh,</p>
                <p className="text-slate-500 text-[11px]">Pemilik Modal / Investor</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm border-t border-slate-400 pt-1 inline-block min-w-[180px]">
                  ( {config.namaPemilik} )
                </p>
              </div>
            </div>

            <div className="space-y-16">
              <div>
                <p className="font-semibold text-slate-800">Dibuat Oleh,</p>
                <p className="text-slate-500 text-[11px]">Pengelola Bengkel</p>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm border-t border-slate-400 pt-1 inline-block min-w-[180px]">
                  ( {config.namaPengelola} )
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note with Licensing & System Owner */}
        <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-[10px] text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-1">
          <span className="font-semibold text-slate-700">System Developed by Rycko | Licensed Material &amp; Monthly Closing Engine</span>
          <span className="font-mono text-slate-400">Periode: {periodeLabel} • Cetak A4</span>
        </div>
      </div>
    </div>
  );
};
