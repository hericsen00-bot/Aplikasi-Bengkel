import { Item, Penjualan, Pengeluaran, WorkshopConfig } from '../types';
import { formatDateIndo } from './formatters';

function escapeCsv(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

export function downloadCsvFile(filename: string, csvContent: string): void {
  // \uFEFF is the UTF-8 Byte Order Mark (BOM) ensuring Excel recognizes UTF-8 encoding
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ExportDataOptions {
  items: Item[];
  penjualan: Penjualan[];
  pengeluaran: Pengeluaran[];
  config: WorkshopConfig;
}

export function generateBengkelCompleteCsv({
  items,
  penjualan,
  pengeluaran,
  config,
}: ExportDataOptions): string {
  const lines: string[] = [];

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 8);

  // Totals calculations
  const totalItemCount = items.length;
  const totalStokBarang = items.reduce((acc, it) => acc + it.stokSaatIni, 0);
  const totalNilaiModal = items.reduce((acc, it) => acc + it.stokSaatIni * it.hargaModal, 0);
  const totalNilaiJual = items.reduce((acc, it) => acc + it.stokSaatIni * it.hargaJual, 0);

  const totalQtyJual = penjualan.reduce((acc, p) => acc + p.qty, 0);
  const totalPart = penjualan.reduce((acc, p) => acc + p.totalPart, 0);
  const totalJasa = penjualan.reduce((acc, p) => acc + p.hargaJasa, 0);
  const totalPenjualan = penjualan.reduce((acc, p) => acc + p.totalPenjualan, 0);
  const totalHPP = penjualan.reduce((acc, p) => acc + p.totalHPP, 0);
  const labaKotor = penjualan.reduce((acc, p) => acc + p.labaKotor, 0);

  const totalPengeluaran = pengeluaran.reduce((acc, p) => acc + p.jumlahPengeluaran, 0);
  const labaBersih = labaKotor - totalPengeluaran;
  const pctPemilik = (config.pctPemilik || 60) / 100;
  const pctPengelola = (config.pctPengelola || 40) / 100;
  const nominalPemilik = labaBersih > 0 ? labaBersih * pctPemilik : 0;
  const nominalPengelola = labaBersih > 0 ? labaBersih * pctPengelola : 0;

  // Header & Metadata
  lines.push([escapeCsv('=== RYCKO SYSTEM - EXPORT DATA SISTEM PEMBUKUAN BENGKEL ===')].join(','));
  lines.push([escapeCsv('Nama Bengkel'), escapeCsv(config.namaBengkel || 'BENGKEL MAJU JAYA')].join(','));
  lines.push([escapeCsv('Alamat'), escapeCsv(config.alamat || '-')].join(','));
  lines.push([escapeCsv('Nama Pengelola'), escapeCsv(config.namaPengelola || '-')].join(','));
  lines.push([escapeCsv('Nama Pemilik Modal'), escapeCsv(config.namaPemilik || '-')].join(','));
  lines.push([escapeCsv('Tanggal Export'), escapeCsv(`${formatDateIndo(dateStr)} (${dateStr})`)].join(','));
  lines.push([escapeCsv('Waktu Export'), escapeCsv(timeStr)].join(','));
  lines.push([escapeCsv('Developer & System Owner'), escapeCsv('Rycko Computer / IT Solution')].join(','));
  lines.push('');

  // SECTION 1: INVENTORY (DATABASE_BARANG)
  lines.push([escapeCsv('=== 1. DATA INVENTARIS & STOK BARANG (DATABASE_BARANG) ===')].join(','));
  lines.push([
    escapeCsv('No'),
    escapeCsv('Kode_Barang'),
    escapeCsv('Nama_Barang'),
    escapeCsv('Jenis_Kendaraan'),
    escapeCsv('Harga_Modal (Rp)'),
    escapeCsv('Harga_Jual (Rp)'),
    escapeCsv('Stok_Saat_Ini (pcs)'),
    escapeCsv('Minimal_Stok (pcs)'),
    escapeCsv('Status_Stok'),
  ].join(','));

  items.forEach((item, index) => {
    const isReorder = item.stokSaatIni <= item.minimalStok;
    lines.push([
      escapeCsv(index + 1),
      escapeCsv(item.kodeBarang),
      escapeCsv(item.namaBarang),
      escapeCsv(item.jenisKendaraan),
      escapeCsv(item.hargaModal),
      escapeCsv(item.hargaJual),
      escapeCsv(item.stokSaatIni),
      escapeCsv(item.minimalStok),
      escapeCsv(isReorder ? `REORDER (Sisa ${item.stokSaatIni})` : 'AMAN'),
    ].join(','));
  });

  lines.push([
    escapeCsv('TOTAL'),
    escapeCsv(`${totalItemCount} SKU`),
    escapeCsv(''),
    escapeCsv('Total Unit:'),
    escapeCsv(totalNilaiModal),
    escapeCsv(totalNilaiJual),
    escapeCsv(totalStokBarang),
    escapeCsv(''),
    escapeCsv(''),
  ].join(','));
  lines.push('');

  // SECTION 2: SALES (PENJUALAN & JASA)
  lines.push([escapeCsv('=== 2. DATA TRANSAKSI PENJUALAN & JASA SERVIS (PENJUALAN) ===')].join(','));
  lines.push([
    escapeCsv('No'),
    escapeCsv('No_Transaksi'),
    escapeCsv('Tanggal'),
    escapeCsv('Kode_Barang'),
    escapeCsv('Nama_Barang'),
    escapeCsv('Jenis_Kendaraan'),
    escapeCsv('Qty'),
    escapeCsv('Harga_Jual_Part (Rp)'),
    escapeCsv('Total_Part (Rp)'),
    escapeCsv('Harga_Jasa (Rp)'),
    escapeCsv('Total_Penjualan (Rp)'),
    escapeCsv('Total_HPP (Rp)'),
    escapeCsv('Laba_Kotor (Rp)'),
  ].join(','));

  penjualan.forEach((sale, index) => {
    lines.push([
      escapeCsv(index + 1),
      escapeCsv(sale.noTransaksi),
      escapeCsv(sale.tanggal),
      escapeCsv(sale.kodeBarang),
      escapeCsv(sale.namaBarang),
      escapeCsv(sale.jenisKendaraan),
      escapeCsv(sale.qty),
      escapeCsv(sale.hargaJual),
      escapeCsv(sale.totalPart),
      escapeCsv(sale.hargaJasa),
      escapeCsv(sale.totalPenjualan),
      escapeCsv(sale.totalHPP),
      escapeCsv(sale.labaKotor),
    ].join(','));
  });

  lines.push([
    escapeCsv('TOTAL'),
    escapeCsv(`${penjualan.length} Transaksi`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv(totalQtyJual),
    escapeCsv(''),
    escapeCsv(totalPart),
    escapeCsv(totalJasa),
    escapeCsv(totalPenjualan),
    escapeCsv(totalHPP),
    escapeCsv(labaKotor),
  ].join(','));
  lines.push('');

  // SECTION 3: EXPENSES (PENGELUARAN OPERASIONAL)
  lines.push([escapeCsv('=== 3. DATA PENGELUARAN OPERASIONAL (PENGELUARAN) ===')].join(','));
  lines.push([
    escapeCsv('No'),
    escapeCsv('No_Transaksi'),
    escapeCsv('Tanggal'),
    escapeCsv('Kategori'),
    escapeCsv('Keterangan'),
    escapeCsv('Jumlah_Pengeluaran (Rp)'),
  ].join(','));

  pengeluaran.forEach((exp, index) => {
    lines.push([
      escapeCsv(index + 1),
      escapeCsv(exp.noTransaksi),
      escapeCsv(exp.tanggal),
      escapeCsv(exp.kategori),
      escapeCsv(exp.keterangan),
      escapeCsv(exp.jumlahPengeluaran),
    ].join(','));
  });

  lines.push([
    escapeCsv('TOTAL'),
    escapeCsv(`${pengeluaran.length} Catatan`),
    escapeCsv(''),
    escapeCsv(''),
    escapeCsv('Total Beban:'),
    escapeCsv(totalPengeluaran),
  ].join(','));
  lines.push('');

  // SECTION 4: FINANCIAL SUMMARY (RINGKASAN LABA RUGI & BAGI HASIL)
  lines.push([escapeCsv('=== 4. REKAPITULASI RUGI LABA & BAGI HASIL ===')].join(','));
  lines.push([escapeCsv('Parameter Keuangan'), escapeCsv('Nominal (Rp)'), escapeCsv('Keterangan')].join(','));
  lines.push([
    escapeCsv('1. Pendapatan Penjualan Total (Part + Jasa)'),
    escapeCsv(totalPenjualan),
    escapeCsv('Omset kotor bengkel'),
  ].join(','));
  lines.push([
    escapeCsv('   - Penjualan Sparepart (Part)'),
    escapeCsv(totalPart),
    escapeCsv('Total belanja sparepart konsumen'),
  ].join(','));
  lines.push([
    escapeCsv('   - Pendapatan Biaya Jasa Servis/Pasang'),
    escapeCsv(totalJasa),
    escapeCsv('Jasa 0% HPP / 100% margin bersih'),
  ].join(','));
  lines.push([
    escapeCsv('2. Total HPP (Modal Sparepart)'),
    escapeCsv(totalHPP),
    escapeCsv('Hanya modal sparepart yang terjual'),
  ].join(','));
  lines.push([
    escapeCsv('3. LABA KOTOR (Gross Profit)'),
    escapeCsv(labaKotor),
    escapeCsv('Total Penjualan - Total HPP'),
  ].join(','));
  lines.push([
    escapeCsv('4. Total Beban Operasional'),
    escapeCsv(totalPengeluaran),
    escapeCsv('Biaya operasional, gaji, sewa, listrik, dll.'),
  ].join(','));
  lines.push([
    escapeCsv('5. LABA BERSIH (Net Profit)'),
    escapeCsv(labaBersih),
    escapeCsv('Laba Kotor - Beban Operasional'),
  ].join(','));
  lines.push([
    escapeCsv(`6. Bagi Hasil Pemilik Modal (${Math.round(pctPemilik * 100)}%)`),
    escapeCsv(nominalPemilik),
    escapeCsv(config.namaPemilik || 'Pemilik Modal'),
  ].join(','));
  lines.push([
    escapeCsv(`7. Bagi Hasil Pengelola (${Math.round(pctPengelola * 100)}%)`),
    escapeCsv(nominalPengelola),
    escapeCsv(config.namaPengelola || 'Pengelola Bengkel'),
  ].join(','));

  return lines.join('\r\n');
}

export function exportBengkelData(options: ExportDataOptions): void {
  const csvString = generateBengkelCompleteCsv(options);
  const cleanName = (options.config.namaBengkel || 'Bengkel')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toLowerCase();
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Data_Bengkel_${cleanName}_${dateStr}.csv`;
  downloadCsvFile(filename, csvString);
}
