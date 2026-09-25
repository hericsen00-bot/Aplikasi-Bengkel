import * as XLSX from 'xlsx';
import { Item } from '../types';
import { formatDateIndo } from './formatters';

export interface ParsedImportItem extends Item {
  rawRowIndex: number;
  isExisting?: boolean;
  existingItem?: Item;
  validationError?: string;
}

export interface ImportParseResult {
  validItems: ParsedImportItem[];
  invalidRows: { rowNumber: number; reason: string; rawData: any }[];
  totalRowsRead: number;
}

/**
 * Clean text to extract clean numbers (handling "Rp", "50.000", "50,000", etc.)
 */
function parseCleanNumber(val: any, fallback = 0): number {
  if (typeof val === 'number') {
    return isNaN(val) ? fallback : val;
  }
  if (!val) return fallback;
  const str = String(val).trim();
  // Remove "Rp", "IDR", spaces
  const cleanStr = str.replace(/[^\d.,-]/g, '').trim();
  if (!cleanStr) return fallback;

  // If Indonesian format with dots as thousands: e.g. "45.000" or "45.000,00"
  // If dot is followed by 3 digits and no more dots or at end, it's thousands separator
  let normalized = cleanStr;
  if (normalized.includes('.') && !normalized.includes(',')) {
    // E.g. "45.000" or "1.500.000"
    const parts = normalized.split('.');
    if (parts.length > 1 && parts.every((p, i) => i === 0 || p.length === 3)) {
      normalized = parts.join('');
    }
  } else if (normalized.includes('.') && normalized.includes(',')) {
    // Indonesian currency: "45.000,50" -> 45000.50
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    // Could be decimal comma: "45,5" or thousands comma "45,000"
    const parts = normalized.split(',');
    if (parts.length === 2 && parts[1].length === 3) {
      normalized = normalized.replace(',', '');
    } else {
      normalized = normalized.replace(',', '.');
    }
  }

  const num = parseFloat(normalized);
  return isNaN(num) ? fallback : Math.round(num);
}

/**
 * Export complete Item Database into a well-formatted Excel workbook (.xlsx)
 */
export function exportItemsToExcel(items: Item[], workshopName: string = 'Bengkel'): void {
  const wb = XLSX.utils.book_new();

  const printDate = new Date().toISOString().split('T')[0];
  const dateIndo = formatDateIndo(printDate);

  // Sheet 1: Database Barang
  const headers = [
    'No',
    'Kode Barang',
    'Nama Barang / Suku Cadang',
    'Jenis Kendaraan / Peruntukan',
    'Harga Modal (Rp)',
    'Harga Jual (Rp)',
    'Stok Saat Ini (Unit)',
    'Batas Min Stok',
    'Total Nilai Modal (Rp)',
    'Estimasi Nilai Jual (Rp)',
    'Potensi Margin (Rp)',
    'Status Inventaris',
  ];

  const rows = items.map((it, idx) => {
    const totalModal = it.stokSaatIni * it.hargaModal;
    const totalJual = it.stokSaatIni * it.hargaJual;
    const potensiMargin = totalJual - totalModal;
    const status = it.stokSaatIni <= it.minimalStok ? 'REORDER / MENIPIS' : 'STOK AMAN';

    return [
      idx + 1,
      it.kodeBarang,
      it.namaBarang,
      it.jenisKendaraan || 'Umum',
      it.hargaModal,
      it.hargaJual,
      it.stokSaatIni,
      it.minimalStok,
      totalModal,
      totalJual,
      potensiMargin,
      status,
    ];
  });

  const totalUnit = items.reduce((acc, it) => acc + it.stokSaatIni, 0);
  const totalNilaiModal = items.reduce((acc, it) => acc + it.stokSaatIni * it.hargaModal, 0);
  const totalNilaiJual = items.reduce((acc, it) => acc + it.stokSaatIni * it.hargaJual, 0);
  const totalPotensiMargin = totalNilaiJual - totalNilaiModal;

  const summaryRow = [
    'TOTAL',
    '',
    `Total: ${items.length} Item / SKU`,
    '',
    '',
    '',
    totalUnit,
    '',
    totalNilaiModal,
    totalNilaiJual,
    totalPotensiMargin,
    '',
  ];

  const sheetData = [
    [`DATABASE MASTER BARANG & SPAREPART - ${workshopName.toUpperCase()}`],
    [`Tanggal Ekspor: ${dateIndo} | Total SKU: ${items.length} Barang | Total Stok Fisik: ${totalUnit} Unit`],
    [`Status Nilai Persediaan: Modal Aset = Rp ${totalNilaiModal.toLocaleString('id-ID')} | Estimasi Jual = Rp ${totalNilaiJual.toLocaleString('id-ID')}`],
    [],
    headers,
    ...rows,
    [],
    summaryRow,
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Column Widths
  ws['!cols'] = [
    { wch: 6 },  // No
    { wch: 16 }, // Kode
    { wch: 38 }, // Nama
    { wch: 26 }, // Jenis Kendaraan
    { wch: 18 }, // Harga Modal
    { wch: 18 }, // Harga Jual
    { wch: 20 }, // Stok
    { wch: 16 }, // Min Stok
    { wch: 22 }, // Total Modal
    { wch: 22 }, // Estimasi Jual
    { wch: 20 }, // Potensi Margin
    { wch: 20 }, // Status
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Database_Barang');

  // Sheet 2: Rekap Kategori & Reorder
  const reorderItems = items.filter(it => it.stokSaatIni <= it.minimalStok);
  const reorderHeaders = [
    'No',
    'Kode Barang',
    'Nama Barang',
    'Sisa Stok',
    'Batas Minimal',
    'Rekomendasi Restok',
    'Estimasi Modal Restok (Rp)',
  ];
  const reorderRows = reorderItems.map((it, idx) => {
    const saranBeli = Math.max(10, it.minimalStok * 3 - it.stokSaatIni);
    return [
      idx + 1,
      it.kodeBarang,
      it.namaBarang,
      it.stokSaatIni,
      it.minimalStok,
      saranBeli,
      saranBeli * it.hargaModal,
    ];
  });

  const wsReorder = XLSX.utils.aoa_to_sheet([
    ['DAFTAR BARANG YANG PERLU DI-RESTOK (REORDER LIST)'],
    [`Terdapat ${reorderItems.length} suku cadang dengan stok menipis / kritis per ${dateIndo}`],
    [],
    reorderHeaders,
    ...reorderRows,
  ]);
  wsReorder['!cols'] = [
    { wch: 6 },
    { wch: 16 },
    { wch: 38 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsReorder, 'Barang_Perlu_Restok');

  const cleanName = workshopName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Database_Barang_${cleanName}_${printDate}.xlsx`;

  XLSX.writeFile(wb, filename);
}

/**
 * Generates and downloads standard Template Excel file for importing items
 */
export function downloadItemTemplateExcel(): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template Import Barang
  const headers = [
    'Kode Barang',
    'Nama Barang',
    'Jenis Kendaraan',
    'Harga Modal',
    'Harga Jual',
    'Stok',
    'Minimal Stok',
  ];

  const exampleRows = [
    [
      'BRG-001',
      'Oli Mesin MPX2 0.8L (Matic)',
      'Honda Matic (Beat/Vario/Scoopy)',
      42000,
      55000,
      24,
      5,
    ],
    [
      'BRG-002',
      'Kampas Rem Depan Honda Matic',
      'Honda Beat / Vario / Scoopy',
      28000,
      45000,
      12,
      4,
    ],
    [
      'BRG-003',
      'Busi Standar NGK CPR9EA-9',
      'Universal Bebek / Matic',
      15000,
      25000,
      30,
      6,
    ],
    [
      'BRG-004',
      'Ban Luar Tubeless 90/90-14 FDR',
      'Universal Rim 14',
      165000,
      210000,
      8,
      2,
    ],
    [
      'BRG-005',
      'Roller CVT Set (Standard)',
      'Yamaha Mio / Fazzio',
      35000,
      55000,
      15,
      3,
    ],
  ];

  const wsTemplate = XLSX.utils.aoa_to_sheet([
    headers,
    ...exampleRows,
  ]);

  wsTemplate['!cols'] = [
    { wch: 16 }, // Kode Barang
    { wch: 36 }, // Nama Barang
    { wch: 32 }, // Jenis Kendaraan
    { wch: 16 }, // Harga Modal
    { wch: 16 }, // Harga Jual
    { wch: 12 }, // Stok
    { wch: 16 }, // Minimal Stok
  ];

  XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template_Barang');

  // Sheet 2: Panduan Pengisian
  const instructions = [
    ['PANDUAN & ATURAN FORMAT IMPORT DATABASE BARANG'],
    ['Gunakan file ini untuk menginput atau mengupdate master data barang bengkel.'],
    [],
    ['NAMA KOLOM', 'SIFAT', 'TIPE DATA', 'PENJELASAN & CONTOH'],
    [
      'Kode Barang',
      'Wajib Diisi',
      'Teks Unik',
      'Kode unik produk (misal: BRG-001, OLI-01, BUSI-NGK). Jika kode SUDAH ADA di database aplikasi, data barang tersebut akan DI-UPDATE. Jika kode BELUM ADA, akan DITAMBAHKAN sebagai barang baru.',
    ],
    [
      'Nama Barang',
      'Wajib Diisi',
      'Teks',
      'Nama suku cadang / sparepart lengkap (misal: Oli Mesin MPX2 0.8L, Kampas Rem Belakang).',
    ],
    [
      'Jenis Kendaraan',
      'Opsional',
      'Teks',
      'Model atau tipe motor yang cocok (misal: Honda Matic, Yamaha Bebek, Universal). Bila kosong akan otomatis diisi "Umum".',
    ],
    [
      'Harga Modal',
      'Wajib Diisi',
      'Angka (Nominal)',
      'Harga pokok pembelian/modal pengadaan. Tulis angka saja tanpa simbol "Rp" atau titik ribuan (misal: 42000).',
    ],
    [
      'Harga Jual',
      'Wajib Diisi',
      'Angka (Nominal)',
      'Harga jual ke pelanggan bengkel. Tulis angka saja tanpa simbol "Rp" (misal: 55000).',
    ],
    [
      'Stok',
      'Wajib Diisi',
      'Angka Bulat',
      'Jumlah stok fisik saat ini di rak / gudang bengkel (misal: 24).',
    ],
    [
      'Minimal Stok',
      'Opsional',
      'Angka Bulat',
      'Batas pengingat restok / safety stock (misal: 3 atau 5). Bila kosong akan otomatis diisi 3.',
    ],
    [],
    ['TIPS IMPORT DATABASE:'],
    ['1. Anda boleh menghapus baris contoh (baris 2 sampai 6) di sheet "Template_Barang" lalu mengisi data Anda sendiri.'],
    ['2. Anda juga bisa langsung mengekspor database barang dari aplikasi, lalu mengeditnya di Excel, dan mengimpornya kembali.'],
    ['3. Saat import, aplikasi akan menampilkan pratinjau (preview) perubahan data sebelum Anda menekan tombol simpan.'],
  ];

  const wsInfo = XLSX.utils.aoa_to_sheet(instructions);
  wsInfo['!cols'] = [
    { wch: 22 },
    { wch: 16 },
    { wch: 18 },
    { wch: 80 },
  ];

  XLSX.utils.book_append_sheet(wb, wsInfo, 'Panduan_Pengisian');

  const filename = 'Format_Template_Import_Barang.xlsx';
  XLSX.writeFile(wb, filename);
}

/**
 * Parse an Excel (.xlsx / .xls) or CSV file and map to Items
 */
export async function parseItemsFromExcelFile(
  file: File,
  existingItems: Item[] = []
): Promise<ImportParseResult> {
  const existingMap = new Map<string, Item>();
  for (const it of existingItems) {
    existingMap.set(it.kodeBarang.trim().toLowerCase(), it);
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });

  // Pick first available sheet or sheet named Template_Barang / Database_Barang
  let sheetName = workbook.SheetNames[0];
  for (const name of workbook.SheetNames) {
    const lower = name.toLowerCase();
    if (lower.includes('template') || lower.includes('barang') || lower.includes('database')) {
      sheetName = name;
      break;
    }
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error('Lembar kerja (Sheet) tidak ditemukan di dalam file Excel.');
  }

  // Convert to 2D array of rows
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('File Excel kosong atau tidak memiliki baris data.');
  }

  // Find header row: look for row that contains keywords like "kode" and "nama"
  let headerRowIndex = -1;
  let colMap: Record<string, number> = {};

  for (let r = 0; r < Math.min(rawRows.length, 10); r++) {
    const row = rawRows[r];
    if (!Array.isArray(row)) continue;

    const rowStrings = row.map(c => String(c).toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
    
    // Check if contains kode & nama
    const hasKode = rowStrings.some(s => s.includes('kode') || s === 'sku' || s === 'id' || s.includes('partno'));
    const hasNama = rowStrings.some(s => s.includes('nama') || s.includes('barang') || s.includes('part') || s.includes('deskripsi'));

    if (hasKode && hasNama) {
      headerRowIndex = r;
      rowStrings.forEach((cleanHeader, colIdx) => {
        if (cleanHeader.includes('kode') || cleanHeader === 'sku' || cleanHeader.includes('partno') || cleanHeader === 'id') {
          if (colMap.kodeBarang === undefined) colMap.kodeBarang = colIdx;
        } else if (cleanHeader.includes('nama') || cleanHeader.includes('deskripsi') || cleanHeader.includes('sparepart')) {
          if (colMap.namaBarang === undefined) colMap.namaBarang = colIdx;
        } else if (cleanHeader.includes('kendaraan') || cleanHeader.includes('motor') || cleanHeader.includes('peruntukan') || cleanHeader.includes('kategori')) {
          if (colMap.jenisKendaraan === undefined) colMap.jenisKendaraan = colIdx;
        } else if (cleanHeader.includes('modal') || cleanHeader.includes('hpp') || cleanHeader.includes('beli')) {
          if (colMap.hargaModal === undefined) colMap.hargaModal = colIdx;
        } else if (cleanHeader.includes('jual') || cleanHeader.includes('price')) {
          if (colMap.hargaJual === undefined) colMap.hargaJual = colIdx;
        } else if (cleanHeader.includes('stok') && !cleanHeader.includes('min')) {
          if (colMap.stokSaatIni === undefined) colMap.stokSaatIni = colIdx;
        } else if (cleanHeader.includes('min') || cleanHeader.includes('safety') || cleanHeader.includes('batas')) {
          if (colMap.minimalStok === undefined) colMap.minimalStok = colIdx;
        }
      });
      break;
    }
  }

  // Fallback: If no header found by keywords, try checking row 0 as headers
  if (headerRowIndex === -1 && rawRows.length > 0) {
    headerRowIndex = 0;
    colMap = {
      kodeBarang: 0,
      namaBarang: 1,
      jenisKendaraan: 2,
      hargaModal: 3,
      hargaJual: 4,
      stokSaatIni: 5,
      minimalStok: 6,
    };
  }

  const validItems: ParsedImportItem[] = [];
  const invalidRows: { rowNumber: number; reason: string; rawData: any }[] = [];
  let totalRowsRead = 0;

  for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
    const row = rawRows[r];
    if (!row || !Array.isArray(row) || row.every(cell => String(cell).trim() === '')) {
      continue; // Skip entirely empty rows
    }

    totalRowsRead++;
    const rowNum = r + 1; // 1-based index in Excel

    // Read cells based on colMap
    const rawKode = colMap.kodeBarang !== undefined ? String(row[colMap.kodeBarang] || '').trim() : '';
    const rawNama = colMap.namaBarang !== undefined ? String(row[colMap.namaBarang] || '').trim() : '';
    const rawJenis = colMap.jenisKendaraan !== undefined ? String(row[colMap.jenisKendaraan] || '').trim() : '';
    const rawModal = colMap.hargaModal !== undefined ? row[colMap.hargaModal] : 0;
    const rawJual = colMap.hargaJual !== undefined ? row[colMap.hargaJual] : 0;
    const rawStok = colMap.stokSaatIni !== undefined ? row[colMap.stokSaatIni] : 0;
    const rawMin = colMap.minimalStok !== undefined ? row[colMap.minimalStok] : 3;

    // Check for summary or total rows that might have been exported earlier
    if (rawKode.toUpperCase() === 'TOTAL' || rawNama.toUpperCase().startsWith('TOTAL')) {
      continue;
    }

    if (!rawKode) {
      invalidRows.push({
        rowNumber: rowNum,
        reason: 'Kolom Kode Barang kosong',
        rawData: row,
      });
      continue;
    }

    if (!rawNama) {
      invalidRows.push({
        rowNumber: rowNum,
        reason: 'Kolom Nama Barang kosong',
        rawData: row,
      });
      continue;
    }

    const hargaModal = parseCleanNumber(rawModal, 0);
    const hargaJual = parseCleanNumber(rawJual, 0);
    const stokSaatIni = parseCleanNumber(rawStok, 0);
    const minimalStok = parseCleanNumber(rawMin, 3);

    const existing = existingMap.get(rawKode.toLowerCase());

    validItems.push({
      kodeBarang: rawKode,
      namaBarang: rawNama,
      jenisKendaraan: rawJenis || 'Umum',
      hargaModal,
      hargaJual,
      stokSaatIni,
      minimalStok,
      rawRowIndex: rowNum,
      isExisting: !!existing,
      existingItem: existing,
    });
  }

  return {
    validItems,
    invalidRows,
    totalRowsRead,
  };
}
