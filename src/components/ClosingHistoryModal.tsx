import React, { useState } from 'react';
import { 
  History, 
  FileSpreadsheet, 
  X, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Archive,
  ArrowLeft,
  Building2,
  Lock,
  Printer
} from 'lucide-react';
import { ClosingPeriod, WorkshopConfig } from '../types';
import { formatRupiah, formatDateIndo } from '../utils/formatters';
import { exportMonthlyClosingWorkbook } from '../utils/excelExporter';

interface ClosingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkshopConfig;
  closingHistory: ClosingPeriod[];
}

export const ClosingHistoryModal: React.FC<ClosingHistoryModalProps> = ({
  isOpen,
  onClose,
  config,
  closingHistory,
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<ClosingPeriod | null>(null);

  if (!isOpen) return null;

  const handleDownloadExcel = (period: ClosingPeriod) => {
    exportMonthlyClosingWorkbook({
      config,
      periodeTitle: period.periodeNama,
      sales: period.archivedSales,
      expenses: period.archivedExpenses,
      purchases: period.archivedPurchases,
      items: period.snapshotStock,
      closingEntries: period.closingEntries,
      printDate: period.tanggalAkhir,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span>Arsip Riwayat Tutup Buku Bulanan</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {closingHistory.length} Periode Tersimpan
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Lihat kembali data pembukuan lampau, saldo awal terbentuk, dan download file Excel (.xlsx) arsip
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          {selectedPeriod ? (
            /* DETAIL VIEW OF SELECTED PERIOD */
            <div className="space-y-5">
              <button
                onClick={() => setSelectedPeriod(null)}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Kembali ke Daftar Periode</span>
              </button>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    Periode: {selectedPeriod.periodeNama}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Ditutup pada: {new Date(selectedPeriod.tanggalEksekusi).toLocaleString('id-ID')}
                  </p>
                </div>

                <button
                  onClick={() => handleDownloadExcel(selectedPeriod)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow transition cursor-pointer text-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Excel Tutup Buku (.xlsx)</span>
                </button>
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500">Total Omset Penjualan</div>
                  <div className="text-sm font-bold font-mono text-slate-900">
                    {formatRupiah(selectedPeriod.totalPenjualan)}
                  </div>
                  <div className="text-[10px] text-slate-400">{selectedPeriod.archivedSales.length} transaksi</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500">HPP Modal Part</div>
                  <div className="text-sm font-bold font-mono text-amber-900">
                    {formatRupiah(selectedPeriod.totalHPP)}
                  </div>
                  <div className="text-[10px] text-slate-400">Modal sparepart</div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="text-[10px] text-slate-500">Biaya Operasional</div>
                  <div className="text-sm font-bold font-mono text-rose-900">
                    {formatRupiah(selectedPeriod.totalPengeluaran)}
                  </div>
                  <div className="text-[10px] text-slate-400">{selectedPeriod.archivedExpenses.length} beban</div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="text-[10px] text-emerald-700 font-bold">Laba Bersih Ditutup</div>
                  <div className="text-sm font-bold font-mono text-emerald-950">
                    {formatRupiah(selectedPeriod.labaBersih)}
                  </div>
                  <div className="text-[10px] text-emerald-700">Telah dibagikan</div>
                </div>
              </div>

              {/* Bagi Hasil & Saldo Kas Awal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <span className="font-bold text-slate-800">Distribusi Keuntungan:</span>
                  <div className="flex justify-between text-slate-600">
                    <span>Pemilik ({config.pctPemilik}%):</span>
                    <strong className="font-mono text-emerald-700">{formatRupiah(selectedPeriod.nominalPemilik)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Pengelola ({config.pctPengelola}%):</span>
                    <strong className="font-mono text-blue-700">{formatRupiah(selectedPeriod.nominalPengelola)}</strong>
                  </div>
                </div>

                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-1.5">
                  <span className="font-bold text-slate-800">Saldo Awal yang Dibentuk:</span>
                  <div className="flex justify-between text-slate-600">
                    <span>Saldo Kas Awal Kasir:</span>
                    <strong className="font-mono text-slate-900">{formatRupiah(selectedPeriod.saldoKasAwalNextMonth)}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Stok Sparepart Terbawa:</span>
                    <strong className="font-mono text-slate-900">
                      {selectedPeriod.snapshotStock.reduce((a, b) => a + b.stokSaatIni, 0)} Unit ({selectedPeriod.snapshotStock.length} Item)
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          ) : closingHistory.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Archive className="w-6 h-6" />
              </div>
              <p className="text-slate-600 font-medium">
                Belum ada periode tutup buku yang diarsipkan.
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Lakukan Tutup Buku Akhir Bulan saat pergantian bulan untuk mengarsipkan transaksi dan membentuk saldo awal baru secara otomatis.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {closingHistory.map((period) => (
                <div
                  key={period.id}
                  className="p-4 hover:bg-slate-50 transition flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <span>{period.periodeNama}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                          {period.tanggalAwal} s/d {period.tanggalAkhir}
                        </span>
                      </h4>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                        <span>Omset: <strong className="text-slate-700 font-mono">{formatRupiah(period.totalPenjualan)}</strong></span>
                        <span>•</span>
                        <span>Laba Bersih: <strong className="text-emerald-700 font-mono">{formatRupiah(period.labaBersih)}</strong></span>
                        <span>•</span>
                        <span>Kas Awal Dibentuk: <strong className="text-blue-700 font-mono">{formatRupiah(period.saldoKasAwalNextMonth)}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadExcel(period)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-xs transition cursor-pointer"
                      title="Download Excel file periode ini"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Download Excel</span>
                    </button>

                    <button
                      onClick={() => setSelectedPeriod(period)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs transition cursor-pointer"
                    >
                      <span>Lihat Rincian</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
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
