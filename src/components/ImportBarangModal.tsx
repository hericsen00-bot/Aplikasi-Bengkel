import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Search,
  ArrowRight,
  Database,
  Info
} from 'lucide-react';
import { Item } from '../types';
import {
  parseItemsFromExcelFile,
  ParsedImportItem,
  downloadItemTemplateExcel,
  exportItemsToExcel
} from '../utils/itemExcelManager';
import { formatRupiah } from '../utils/formatters';

interface ImportBarangModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentItems: Item[];
  onCommitImport: (
    updatedItems: Item[],
    summary: { addedCount: number; updatedCount: number; totalCount: number }
  ) => void;
  workshopName?: string;
}

export const ImportBarangModal: React.FC<ImportBarangModalProps> = ({
  isOpen,
  onClose,
  currentItems,
  onCommitImport,
  workshopName = 'Bengkel',
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedImportItem[] | null>(null);
  const [invalidRows, setInvalidRows] = useState<{ rowNumber: number; reason: string }[]>([]);
  const [totalRowsRead, setTotalRowsRead] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuration settings
  const [importMode, setImportMode] = useState<'merge_all' | 'update_only' | 'replace_all'>('merge_all');
  const [stockHandling, setStockHandling] = useState<'overwrite' | 'accumulate'>('overwrite');

  // Preview filtering
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new_only' | 'update_only'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setSelectedFileName(null);
      setParsedItems(null);
      setInvalidRows([]);
      setErrorMsg(null);
      setImportMode('merge_all');
      setStockHandling('overwrite');
      setPreviewFilter('all');
      setSearchFilter('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    setSelectedFileName(file.name);

    try {
      const result = await parseItemsFromExcelFile(file, currentItems);
      if (result.validItems.length === 0) {
        setErrorMsg('Tidak ditemukan data barang yang valid di dalam file. Pastikan baris memiliki Kode Barang dan Nama Barang.');
        setParsedItems(null);
      } else {
        setParsedItems(result.validItems);
        setInvalidRows(result.invalidRows);
        setTotalRowsRead(result.totalRowsRead);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal membaca file Excel. Pastikan format file sesuai.');
      setParsedItems(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
    // reset input so same file can be selected again
    e.target.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  // Counts
  const newItemsCount = parsedItems ? parsedItems.filter(it => !it.isExisting).length : 0;
  const existingItemsCount = parsedItems ? parsedItems.filter(it => it.isExisting).length : 0;

  // Filtered preview rows
  const filteredPreview = (parsedItems || []).filter(item => {
    if (previewFilter === 'new_only' && item.isExisting) return false;
    if (previewFilter === 'update_only' && !item.isExisting) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        item.kodeBarang.toLowerCase().includes(q) ||
        item.namaBarang.toLowerCase().includes(q) ||
        item.jenisKendaraan.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Execute Commit
  const handleApplyImport = () => {
    if (!parsedItems || parsedItems.length === 0) return;

    let finalItems: Item[] = [];
    let addedCount = 0;
    let updatedCount = 0;

    if (importMode === 'replace_all') {
      // Complete replacement with excel content
      finalItems = parsedItems.map(it => ({
        kodeBarang: it.kodeBarang,
        namaBarang: it.namaBarang,
        jenisKendaraan: it.jenisKendaraan,
        hargaModal: it.hargaModal,
        hargaJual: it.hargaJual,
        stokSaatIni: it.stokSaatIni,
        minimalStok: it.minimalStok,
      }));
      addedCount = finalItems.length;
      updatedCount = 0;
    } else {
      // Map of current items by lowercase code
      const itemMap = new Map<string, Item>();
      currentItems.forEach(it => {
        itemMap.set(it.kodeBarang.toLowerCase(), { ...it });
      });

      parsedItems.forEach(importRow => {
        const key = importRow.kodeBarang.toLowerCase();
        const existing = itemMap.get(key);

        if (existing) {
          // Existing item: Update properties
          const newStock = stockHandling === 'accumulate'
            ? existing.stokSaatIni + importRow.stokSaatIni
            : importRow.stokSaatIni;

          itemMap.set(key, {
            ...existing,
            kodeBarang: importRow.kodeBarang, // keep casing from import
            namaBarang: importRow.namaBarang,
            jenisKendaraan: importRow.jenisKendaraan || existing.jenisKendaraan,
            hargaModal: importRow.hargaModal > 0 ? importRow.hargaModal : existing.hargaModal,
            hargaJual: importRow.hargaJual > 0 ? importRow.hargaJual : existing.hargaJual,
            stokSaatIni: Math.max(0, newStock),
            minimalStok: importRow.minimalStok > 0 ? importRow.minimalStok : existing.minimalStok,
          });
          updatedCount++;
        } else if (importMode === 'merge_all') {
          // New item: Add if mode is merge_all
          itemMap.set(key, {
            kodeBarang: importRow.kodeBarang,
            namaBarang: importRow.namaBarang,
            jenisKendaraan: importRow.jenisKendaraan || 'Umum',
            hargaModal: importRow.hargaModal,
            hargaJual: importRow.hargaJual,
            stokSaatIni: Math.max(0, importRow.stokSaatIni),
            minimalStok: importRow.minimalStok > 0 ? importRow.minimalStok : 3,
          });
          addedCount++;
        }
      });

      finalItems = Array.from(itemMap.values());
    }

    onCommitImport(finalItems, {
      addedCount,
      updatedCount,
      totalCount: finalItems.length,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-5 py-4 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/40 rounded-xl border border-blue-400/30 text-blue-200 shadow-inner">
              <FileSpreadsheet className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Import &amp; Update Database Barang Excel</h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  .xlsx / .xls / .csv
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Perbarui harga, stok fisik, atau tambahkan suku cadang baru sekaligus secara massal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadItemTemplateExcel()}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              title="Download Format Template Excel Resmi"
            >
              <Download className="w-3.5 h-3.5 text-blue-200" />
              <span>Download Template</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Tutup (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-4">
          {/* STAGE 1: Upload Dropzone if no file or user clicked re-upload */}
          {!parsedItems ? (
            <div className="flex flex-col gap-4">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="p-4 rounded-2xl bg-blue-100 text-blue-700 shadow-xs">
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-700" />
                  ) : (
                    <UploadCloud className="w-8 h-8" />
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    {isProcessing ? 'Sedang Membaca File Excel...' : 'Tarik & Letakkan File Excel Di Sini'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-md">
                    Mendukung file format <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>. Klik area ini untuk mencari file dari komputer.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs">
                    📁 Pilih File dari Perangkat
                  </span>
                </div>
              </div>

              {/* Error Alert if any */}
              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="font-bold">Gagal Membaca File:</strong> {errorMsg}
                  </div>
                </div>
              )}

              {/* Instructions and Quick Download Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">1. Download Template Format Data</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Download format standar Excel kosong yang sudah memiliki kolom Kode Barang, Nama, Jenis Kendaraan, Modal, Jual, dan Stok.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Format_Template_Import_Barang.xlsx</span>
                    <button
                      type="button"
                      onClick={() => downloadItemTemplateExcel()}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Download Format</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-800 rounded-lg shrink-0">
                      <Database className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">2. Atau Export Database Saat Ini</h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        Ekspor seluruh database barang yang ada ({currentItems.length} barang), ubah harganya di Excel, lalu import kembali untuk mengupdate.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{currentItems.length} Master Barang</span>
                    <button
                      type="button"
                      onClick={() => exportItemsToExcel(currentItems, workshopName)}
                      className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <Download className="w-3 h-3" />
                      <span>Export Data Sekarang</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Format Rules Guidance */}
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/40 text-slate-700 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 mb-1.5">
                  <Info className="w-4 h-4 text-blue-600" />
                  <span>Aturan &amp; Ketentuan Kolom Excel:</span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-600 list-disc list-inside">
                  <li><strong>Kode Barang:</strong> Wajib unik (BRG-001, OLI-01, dll). Jika kode sama, data barang diupdate.</li>
                  <li><strong>Nama Barang:</strong> Wajib diisi nama suku cadang / sparepart.</li>
                  <li><strong>Harga Modal &amp; Jual:</strong> Isi angka saja tanpa &quot;Rp&quot; atau tanda titik.</li>
                  <li><strong>Stok &amp; Min Stok:</strong> Isi angka bulat (misal: 10, 24).</li>
                </ul>
              </div>
            </div>
          ) : (
            /* STAGE 2: File Parsed - Preview & Options */
            <div className="flex flex-col gap-4 flex-1">
              {/* Top Banner: File Name & Stats */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800">{selectedFileName}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Total baris: {totalRowsRead}</span>
                      <span>•</span>
                      <span className="text-emerald-700 font-semibold">{parsedItems.length} baris valid</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedItems(null);
                      setSelectedFileName(null);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-lg border border-slate-300 transition-colors cursor-pointer"
                  >
                    Ganti File Excel
                  </button>
                </div>
              </div>

              {/* Statistics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Total Valid</span>
                  <span className="text-xl font-black text-blue-900">{parsedItems.length}</span>
                  <span className="text-[10px] text-blue-600 block">Suku cadang terdeteksi</span>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Barang Baru</span>
                  <span className="text-xl font-black text-emerald-900">+{newItemsCount}</span>
                  <span className="text-[10px] text-emerald-600 block">Kode belum terdaftar</span>
                </div>

                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Diperbarui</span>
                  <span className="text-xl font-black text-amber-900">~{existingItemsCount}</span>
                  <span className="text-[10px] text-amber-600 block">Kode cocok (Update harga/stok)</span>
                </div>

                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Baris Dilewati</span>
                  <span className="text-xl font-black text-slate-700">{invalidRows.length}</span>
                  <span className="text-[10px] text-slate-500 block">Kosong / Tanpa kode</span>
                </div>
              </div>

              {/* Import Options Controls */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Option 1: Mode Import */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Mode Pembaruan Database:
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer hover:bg-blue-50/40">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'merge_all'}
                        onChange={() => setImportMode('merge_all')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <strong className="text-slate-800 font-semibold block">Update Cocok &amp; Tambah Baru (Rekomendasi)</strong>
                        <span className="text-[10px] text-slate-500 block">
                          Update data yang kodenya sama, dan tambahkan barang baru jika kodenya belum ada.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer hover:bg-blue-50/40">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'update_only'}
                        onChange={() => setImportMode('update_only')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <strong className="text-slate-800 font-semibold block">Hanya Update Barang Yang Sudah Ada</strong>
                        <span className="text-[10px] text-slate-500 block">
                          Hanya perbarui harga &amp; stok untuk kode yang sudah terdaftar. Abaikan {newItemsCount} barang baru.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-rose-200 text-xs cursor-pointer hover:bg-rose-50/40">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace_all'}
                        onChange={() => setImportMode('replace_all')}
                        className="text-rose-600 focus:ring-rose-500"
                      />
                      <div>
                        <strong className="text-rose-800 font-semibold block">Ganti Seluruh Database (Timpa Penuh)</strong>
                        <span className="text-[10px] text-rose-600 block">
                          Hapus seluruh database barang saat ini ({currentItems.length} item) dan ganti murni dengan isi file Excel ini.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Option 2: Stock Handling */}
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1.5">
                    Perlakuan Stok Fisik:
                  </label>
                  <div className="flex flex-col gap-1.5">
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer hover:bg-blue-50/40">
                      <input
                        type="radio"
                        name="stockHandling"
                        checked={stockHandling === 'overwrite'}
                        onChange={() => setStockHandling('overwrite')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <strong className="text-slate-800 font-semibold block">Ganti Stok dengan Nilai di Excel (Stock Opname)</strong>
                        <span className="text-[10px] text-slate-500 block">
                          Nilai stok di aplikasi akan langsung disesuaikan dengan angka stok di file Excel.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer hover:bg-blue-50/40">
                      <input
                        type="radio"
                        name="stockHandling"
                        checked={stockHandling === 'accumulate'}
                        onChange={() => setStockHandling('accumulate')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <strong className="text-slate-800 font-semibold block">Tambahkan ke Stok Saat Ini (Restok Massal)</strong>
                        <span className="text-[10px] text-slate-500 block">
                          Stok lama + angka stok di file Excel (contoh: 12 + 10 = 22).
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Preview Table Header & Search Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-700">Filter Preview:</span>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      previewFilter === 'all'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Semua ({parsedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('new_only')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      previewFilter === 'new_only'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    Barang Baru ({newItemsCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('update_only')}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                      previewFilter === 'update_only'
                        ? 'bg-blue-700 text-white'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                    }`}
                  >
                    Update ({existingItemsCount})
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kode / nama barang..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-lg bg-white w-56 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Interactive Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="px-3 py-2 border-r border-slate-200 w-16 text-center">Status</th>
                      <th className="px-3 py-2 border-r border-slate-200">Kode Barang</th>
                      <th className="px-3 py-2 border-r border-slate-200">Nama Barang</th>
                      <th className="px-3 py-2 border-r border-slate-200">Jenis Kendaraan</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-right">Harga Modal</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-right">Harga Jual</th>
                      <th className="px-3 py-2 border-r border-slate-200 text-center">Stok</th>
                      <th className="px-3 py-2 text-center">Min Stok</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreview.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-400">
                          Tidak ada data yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredPreview.map((item, idx) => {
                        const isExisting = item.isExisting;
                        const oldItem = item.existingItem;

                        const oldStock = oldItem ? oldItem.stokSaatIni : null;
                        const newStock = isExisting && stockHandling === 'accumulate' && oldStock !== null
                          ? oldStock + item.stokSaatIni
                          : item.stokSaatIni;

                        const priceChanged = oldItem && (oldItem.hargaJual !== item.hargaJual || oldItem.hargaModal !== item.hargaModal);

                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-blue-50/40 transition-colors ${
                              isExisting ? 'bg-white' : 'bg-emerald-50/30'
                            }`}
                          >
                            <td className="px-3 py-2 border-r border-slate-200 text-center whitespace-nowrap">
                              {isExisting ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                  Update
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  + Baru
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 font-mono font-bold text-blue-700">
                              {item.kodeBarang}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 font-medium text-slate-800">
                              {item.namaBarang}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 text-slate-600">
                              {item.jenisKendaraan}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 text-right text-slate-600">
                              {oldItem && oldItem.hargaModal !== item.hargaModal ? (
                                <div>
                                  <span className="line-through text-slate-400 text-[10px] mr-1">
                                    {formatRupiah(oldItem.hargaModal)}
                                  </span>
                                  <span className="font-semibold text-emerald-700">
                                    {formatRupiah(item.hargaModal)}
                                  </span>
                                </div>
                              ) : (
                                formatRupiah(item.hargaModal)
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 text-right font-semibold text-slate-900">
                              {oldItem && oldItem.hargaJual !== item.hargaJual ? (
                                <div>
                                  <span className="line-through text-slate-400 text-[10px] mr-1">
                                    {formatRupiah(oldItem.hargaJual)}
                                  </span>
                                  <span className="font-bold text-blue-700">
                                    {formatRupiah(item.hargaJual)}
                                  </span>
                                </div>
                              ) : (
                                formatRupiah(item.hargaJual)
                              )}
                            </td>
                            <td className="px-3 py-2 border-r border-slate-200 text-center font-bold">
                              {isExisting && oldStock !== null ? (
                                <div className="inline-flex items-center gap-1 text-[11px]">
                                  <span className="text-slate-400 font-normal">{oldStock}</span>
                                  <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                  <span className={newStock !== oldStock ? 'text-blue-700' : 'text-slate-700'}>
                                    {newStock}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-emerald-700">{item.stokSaatIni}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-slate-500">
                              {item.minimalStok}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            {parsedItems ? (
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Siap di-import: <strong>{newItemsCount} barang baru</strong> &amp; <strong>{existingItemsCount} diperbarui</strong></span>
              </span>
            ) : (
              <span>Gunakan file Excel (.xlsx) dengan kolom Kode Barang &amp; Nama Barang.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal / Tutup
            </button>

            {parsedItems && (
              <button
                type="button"
                onClick={handleApplyImport}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terapkan &amp; Update Database ({parsedItems.length} Item)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
