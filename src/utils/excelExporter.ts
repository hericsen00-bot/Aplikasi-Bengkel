import * as XLSX from 'xlsx';
import { Item, Penjualan, Pengeluaran, Pembelian, WorkshopConfig, ClosingEntry } from '../types';
import { formatRupiah, formatDateIndo } from './formatters';

interface ExportExcelOptions {
  config: WorkshopConfig;
  periodeTitle: string;
  sales: Penjualan[];
  expenses: Pengeluaran[];
  purchases: Pembelian[];
  items: Item[];
  closingEntries?: ClosingEntry[];
  printDate?: string;
}

export function exportMonthlyClosingWorkbook({
  config,
  periodeTitle,
  sales,
  expenses,
  purchases,
  items,
  closingEntries = [],
  printDate = new Date().toISOString().split('T')[0],
}: ExportExcelOptions) {
  const wb = XLSX.utils.book_new();

  // 1. Calculate Totals
  const totalPart = sales.reduce((acc, s) => acc + (s.totalPart ?? (s.qty * s.hargaJual)), 0);
  const totalJasa = sales.reduce((acc, s) => acc + (s.hargaJasa ?? 0), 0);
  const totalPenjualan = sales.reduce((acc, s) => acc + s.totalPenjualan, 0);
  const totalHPP = sales.reduce((acc, s) => acc + s.totalHPP, 0);
  const labaKotor = totalPenjualan - totalHPP;
  const totalPengeluaran = expenses.reduce((acc, e) => acc + e.jumlahPengeluaran, 0);
  const labaBersih = labaKotor - totalPengeluaran;
  const nominalPemilik = Math.max(0, labaBersih) * (config.pctPemilik / 100);
  const nominalPengelola = Math.max(0, labaBersih) * (config.pctPengelola / 100);

  // ==========================================
  // SHEET 1: RINGKASAN LABA RUGI & BAGI HASIL
  // ==========================================
  const labaRugiData: (string | number)[][] = [
    [config.namaBengkel.toUpperCase()],
    [config.alamat],
    [`Penanggung Jawab: ${config.namaPengelola} | Telp: ${config.telepon || '-'}`],
    [],
    ['LAPORAN TUTUP BUKU BULANAN & REKAPITULASI LABA RUGI'],
    [`Periode Laporan: ${periodeTitle}`],
    [`Tanggal Cetak: ${formatDateIndo(printDate)}`],
    [],
    ['KOMPONEN KEUANGAN', 'NOMINAL (RP)', 'KETERANGAN'],
    ['1. PENDAPATAN USAHA (OMSET)', '', ''],
    ['   - Penjualan Suku Cadang (Sparepart)', totalPart, 'Nilai kotor part terjual'],
    ['   - Pendapatan Biaya Jasa Servis/Pasang', totalJasa, 'Margin 100% (Tanpa HPP)'],
    ['TOTAL OMSET PENDAPATAN (A)', totalPenjualan, 'Total Part + Jasa'],
    [],
    ['2. HARGA POKOK PENJUALAN (HPP)', '', ''],
    ['   - Beban Pokok Sparepart Terjual', totalHPP, 'Modal pengadaan part'],
    ['TOTAL HPP (B)', totalHPP, 'Hanya modal fisik sparepart'],
    [],
    ['LABA KOTOR USAHA (A - B)', labaKotor, 'Omset dikurangi modal part'],
    [],
    ['3. BIAYA / PENGELUARAN OPERASIONAL', '', ''],
    ['   - Total Beban Operasional Bengkel', totalPengeluaran, 'Sewa, listrik, gaji, alat, dll.'],
    ['TOTAL PENGELUARAN OPERASIONAL (C)', totalPengeluaran, 'Beban non-HPP'],
    [],
    ['LABA BERSIH USAHA (NET PROFIT)', labaBersih, 'Laba Kotor - Pengeluaran'],
    [],
    ['4. SKEMA BAGI HASIL KEUNTUNGAN', '', ''],
    [`   - Bagian Pemilik Modal (${config.pctPemilik}%)`, nominalPemilik, `Penerima: ${config.namaPemilik}`],
    [`   - Bagian Pengelola Bengkel (${config.pctPengelola}%)`, nominalPengelola, `Penerima: ${config.namaPengelola}`],
    ['TOTAL BAGI HASIL DIDISTRIBUSIKAN', nominalPemilik + nominalPengelola, '100% Laba Bersih'],
    [],
    [],
    ['', '', `${config.kota}, ${formatDateIndo(printDate)}`],
    ['Disetujui Oleh (Pemilik Modal)', '', 'Dibuat Oleh (Pengelola Bengkel)'],
    [],
    [],
    [`( ${config.namaPemilik} )`, '', `( ${config.namaPengelola} )`],
  ];

  const wsLabaRugi = XLSX.utils.aoa_to_sheet(labaRugiData);
  wsLabaRugi['!cols'] = [{ wch: 45 }, { wch: 22 }, { wch: 35 }];
  XLSX.utils.book_append_sheet(wb, wsLabaRugi, 'Ringkasan Laba Rugi');

  // ==========================================
  // SHEET 2: 1. PENJUALAN & JASA
  // ==========================================
  const penjualanHeader = [
    'No Transaksi',
    'Tanggal',
    'Kode Barang',
    'Nama Barang',
    'Jenis Kendaraan',
    'Qty',
    'Harga Jual Part (Rp)',
    'Total Part (Rp)',
    'Biaya Jasa Servis (Rp)',
    'Total Penjualan (Rp)',
    'Total HPP Modal (Rp)',
    'Laba Kotor (Rp)',
  ];

  const penjualanRows = sales.map((s) => [
    s.noTransaksi,
    s.tanggal,
    s.kodeBarang,
    s.namaBarang,
    s.jenisKendaraan,
    s.qty,
    s.hargaJual,
    s.totalPart ?? (s.qty * s.hargaJual),
    s.hargaJasa ?? 0,
    s.totalPenjualan,
    s.totalHPP,
    s.labaKotor,
  ]);

  // Add Summary row
  const totalQtyJual = sales.reduce((acc, s) => acc + s.qty, 0);
  const penjualanSummaryRow = [
    'TOTAL PERIODE',
    '',
    '',
    '',
    '',
    totalQtyJual,
    '',
    totalPart,
    totalJasa,
    totalPenjualan,
    totalHPP,
    labaKotor,
  ];

  const wsPenjualan = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI PENJUALAN & PENDAPATAN JASA - ${config.namaBengkel}`],
    [`Periode: ${periodeTitle}`],
    [],
    penjualanHeader,
    ...penjualanRows,
    [],
    penjualanSummaryRow,
  ]);
  wsPenjualan['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 32 }, { wch: 22 },
    { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 20 }, { wch: 20 },
    { wch: 18 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPenjualan, '1. Penjualan & Jasa');

  // ==========================================
  // SHEET 3: 2. PENGELUARAN BEBAN
  // ==========================================
  const pengeluaranHeader = [
    'No Transaksi',
    'Tanggal',
    'Kategori Pengeluaran',
    'Keterangan Beban Operasional',
    'Jumlah Pengeluaran (Rp)',
  ];

  const pengeluaranRows = expenses.map((e) => [
    e.noTransaksi,
    e.tanggal,
    e.kategori,
    e.keterangan,
    e.jumlahPengeluaran,
  ]);

  const pengeluaranSummaryRow = [
    'TOTAL PENGELUARAN',
    '',
    '',
    '',
    totalPengeluaran,
  ];

  const wsPengeluaran = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI BIAYA & PENGELUARAN OPERASIONAL - ${config.namaBengkel}`],
    [`Periode: ${periodeTitle}`],
    [],
    pengeluaranHeader,
    ...pengeluaranRows,
    [],
    pengeluaranSummaryRow,
  ]);
  wsPengeluaran['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 45 }, { wch: 24 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPengeluaran, '2. Pengeluaran');

  // ==========================================
  // SHEET 4: 3. PEMBELIAN STOK
  // ==========================================
  const pembelianHeader = [
    'No Transaksi',
    'Tanggal',
    'Kode Barang',
    'Nama Sparepart',
    'Jenis Kendaraan',
    'Qty Masuk',
    'Harga Modal Satuan (Rp)',
    'Total Pembelian (Rp)',
  ];

  const pembelianRows = purchases.map((p) => [
    p.noTransaksi,
    p.tanggal,
    p.kodeBarang,
    p.namaBarang,
    p.jenisKendaraan,
    p.qty,
    p.hargaModal,
    p.totalHarga,
  ]);

  const totalQtyBeli = purchases.reduce((acc, p) => acc + p.qty, 0);
  const totalNominalBeli = purchases.reduce((acc, p) => acc + p.totalHarga, 0);

  const pembelianSummaryRow = [
    'TOTAL PEMBELIAN',
    '',
    '',
    '',
    '',
    totalQtyBeli,
    '',
    totalNominalBeli,
  ];

  const wsPembelian = XLSX.utils.aoa_to_sheet([
    [`REKAPITULASI PEMBELIAN & PENGADAAN SUKU CADANG - ${config.namaBengkel}`],
    [`Periode: ${periodeTitle}`],
    [],
    pembelianHeader,
    ...pembelianRows,
    [],
    pembelianSummaryRow,
  ]);
  wsPembelian['!cols'] = [
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 32 }, { wch: 22 },
    { wch: 12 }, { wch: 22 }, { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPembelian, '3. Pembelian');

  // ==========================================
  // SHEET 5: STOK SPAREPART SAAT TUTUP BUKU
  // ==========================================
  const stokHeader = [
    'Kode Barang',
    'Nama Barang',
    'Jenis Kendaraan',
    'Harga Modal (Rp)',
    'Harga Jual (Rp)',
    'Stok Akhir Periode',
    'Batas Min Stok',
    'Total Nilai Persediaan (Rp)',
    'Status Stok',
  ];

  const stokRows = items.map((it) => {
    const nilaiAset = it.stokSaatIni * it.hargaModal;
    const status = it.stokSaatIni <= it.minimalStok ? 'REORDER' : 'AMAN';
    return [
      it.kodeBarang,
      it.namaBarang,
      it.jenisKendaraan,
      it.hargaModal,
      it.hargaJual,
      it.stokSaatIni,
      it.minimalStok,
      nilaiAset,
      status,
    ];
  });

  const totalNilaiPersediaan = items.reduce((acc, it) => acc + (it.stokSaatIni * it.hargaModal), 0);
  const totalUnitStok = items.reduce((acc, it) => acc + it.stokSaatIni, 0);

  const stokSummaryRow = [
    'TOTAL PERSEDIAAN',
    '',
    '',
    '',
    '',
    totalUnitStok,
    '',
    totalNilaiPersediaan,
    '',
  ];

  const wsStok = XLSX.utils.aoa_to_sheet([
    [`DAFTAR SALDO STOK SPAREPART (AKHIR BULAN) - ${config.namaBengkel}`],
    [`Sebagai Saldo Awal Periode Berikutnya`],
    [],
    stokHeader,
    ...stokRows,
    [],
    stokSummaryRow,
  ]);
  wsStok['!cols'] = [
    { wch: 14 }, { wch: 35 }, { wch: 24 }, { wch: 18 }, { wch: 18 },
    { wch: 16 }, { wch: 14 }, { wch: 24 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsStok, 'Stok Sparepart');

  // ==========================================
  // SHEET 6: JURNAL PENUTUP (CLOSING ENTRIES)
  // ==========================================
  const jurnalHeader = [
    'Tanggal',
    'Kode Akun',
    'Nama Akun / Deskripsi Jurnal',
    'Ref Posisi',
    'Debit (Rp)',
    'Kredit (Rp)',
    'Keterangan Transaksi',
  ];

  const entriesToUse: ClosingEntry[] = closingEntries.length > 0 ? closingEntries : generateStandardClosingEntries({
    tanggal: printDate,
    totalPenjualan,
    totalPart,
    totalJasa,
    totalHPP,
    totalPengeluaran,
    labaBersih,
    nominalPemilik,
    nominalPengelola,
    namaPemilik: config.namaPemilik,
    namaPengelola: config.namaPengelola,
  });

  const jurnalRows = entriesToUse.map((je) => [
    je.tanggal,
    je.kodeAkun,
    je.namaAkun,
    je.posisi,
    je.debit > 0 ? je.debit : '',
    je.kredit > 0 ? je.kredit : '',
    je.keterangan,
  ]);

  const totalDebit = entriesToUse.reduce((acc, je) => acc + je.debit, 0);
  const totalKredit = entriesToUse.reduce((acc, je) => acc + je.kredit, 0);

  const wsJurnal = XLSX.utils.aoa_to_sheet([
    [`JURNAL PENUTUP (CLOSING ENTRIES) AKHIR BULAN - ${config.namaBengkel}`],
    [`Periode: ${periodeTitle}`],
    [],
    jurnalHeader,
    ...jurnalRows,
    [],
    ['TOTAL JURNAL PENUTUP', '', '', '', totalDebit, totalKredit, totalDebit === totalKredit ? 'BALANCE (SEIMBANG)' : 'TIDAK BALANCE'],
  ]);
  wsJurnal['!cols'] = [
    { wch: 14 }, { wch: 12 }, { wch: 38 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsJurnal, 'Jurnal Penutup');

  // Generate and trigger download
  const cleanName = config.namaBengkel.replace(/[^a-zA-Z0-9]/g, '_');
  const cleanPeriode = periodeTitle.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Laporan_Tutup_Buku_${cleanName}_${cleanPeriode}.xlsx`;

  XLSX.writeFile(wb, filename);
}

export function generateStandardClosingEntries(params: {
  tanggal: string;
  totalPenjualan: number;
  totalPart: number;
  totalJasa: number;
  totalHPP: number;
  totalPengeluaran: number;
  labaBersih: number;
  nominalPemilik: number;
  nominalPengelola: number;
  namaPemilik: string;
  namaPengelola: string;
}): ClosingEntry[] {
  const {
    tanggal,
    totalPenjualan,
    totalPart,
    totalJasa,
    totalHPP,
    totalPengeluaran,
    labaBersih,
    nominalPemilik,
    nominalPengelola,
    namaPemilik,
    namaPengelola,
  } = params;

  const entries: ClosingEntry[] = [];

  // 1. Tutup Akun Pendapatan ke Ikhtisar Laba Rugi
  entries.push({
    tanggal,
    kodeAkun: '4-100',
    namaAkun: 'Pendapatan Penjualan Sparepart',
    posisi: 'DEBIT',
    debit: totalPart,
    kredit: 0,
    keterangan: 'Menutup saldo nominal penjualan part ke Ikhtisar Laba Rugi',
  });

  entries.push({
    tanggal,
    kodeAkun: '4-200',
    namaAkun: 'Pendapatan Biaya Jasa Servis & Pasang',
    posisi: 'DEBIT',
    debit: totalJasa,
    kredit: 0,
    keterangan: 'Menutup saldo pendapatan ongkos jasa ke Ikhtisar Laba Rugi',
  });

  entries.push({
    tanggal,
    kodeAkun: '3-900',
    namaAkun: '   Ikhtisar Laba Rugi (Income Summary)',
    posisi: 'KREDIT',
    debit: 0,
    kredit: totalPenjualan,
    keterangan: 'Kredit total omset penjualan & jasa',
  });

  // 2. Tutup Akun Beban Pokok (HPP) & Beban Operasional ke Ikhtisar Laba Rugi
  entries.push({
    tanggal,
    kodeAkun: '3-900',
    namaAkun: 'Ikhtisar Laba Rugi (Income Summary)',
    posisi: 'DEBIT',
    debit: totalHPP + totalPengeluaran,
    kredit: 0,
    keterangan: 'Debit total modal barang + beban operasional',
  });

  entries.push({
    tanggal,
    kodeAkun: '5-100',
    namaAkun: '   Harga Pokok Penjualan (HPP Sparepart)',
    posisi: 'KREDIT',
    debit: 0,
    kredit: totalHPP,
    keterangan: 'Menutup akun HPP modal pengadaan',
  });

  entries.push({
    tanggal,
    kodeAkun: '6-100',
    namaAkun: '   Beban Operasional & Pengeluaran',
    posisi: 'KREDIT',
    debit: 0,
    kredit: totalPengeluaran,
    keterangan: 'Menutup akun seluruh beban operasional',
  });

  // 3. Menutup Saldo Ikhtisar Laba Rugi ke Akun Modal / Bagi Hasil
  if (labaBersih > 0) {
    entries.push({
      tanggal,
      kodeAkun: '3-900',
      namaAkun: 'Ikhtisar Laba Rugi (Net Profit)',
      posisi: 'DEBIT',
      debit: labaBersih,
      kredit: 0,
      keterangan: 'Menutup laba bersih usaha bulan berjalan',
    });

    entries.push({
      tanggal,
      kodeAkun: '3-100',
      namaAkun: `   Modal / Bagi Hasil Pemilik (${namaPemilik})`,
      posisi: 'KREDIT',
      debit: 0,
      kredit: nominalPemilik,
      keterangan: 'Alokasi laba hak pemilik modal sesuai persentase',
    });

    entries.push({
      tanggal,
      kodeAkun: '3-200',
      namaAkun: `   Bagi Hasil Jasa Pengelola (${namaPengelola})`,
      posisi: 'KREDIT',
      debit: 0,
      kredit: nominalPengelola,
      keterangan: 'Alokasi laba hak pengelola bengkel sesuai persentase',
    });
  }

  return entries;
}
