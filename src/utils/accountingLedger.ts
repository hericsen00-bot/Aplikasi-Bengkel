import { Item, Penjualan, Pengeluaran, Pembelian, WorkshopConfig, ClosingPeriod } from '../types';

export interface GLAccountEntry {
  tanggal: string;
  noBukti: string;
  keterangan: string;
  debit: number;
  kredit: number;
  saldo: number;
  isOpeningBalance?: boolean;
}

export interface GLAccount {
  kodeAkun: string;
  namaAkun: string;
  kategori: string;
  saldoNormal: 'DEBIT' | 'KREDIT';
  saldoAwal: number;
  mutasiDebit: number;
  mutasiKredit: number;
  saldoAkhir: number;
  entries: GLAccountEntry[];
}

export interface BalanceSheetData {
  tanggal: string;
  periodeNama: string;
  asetLancar: {
    kasDiKasir: number;
    persediaanBarang: number;
  };
  totalAset: number;
  kewajiban: {
    hutangSupplier: number;
  };
  ekuitas: {
    modalPemilikAwal: number;
    labaPeriodeBerjalan: number;
  };
  totalPassiva: number;
  isBalanced: boolean;
}

export interface GenerateLedgerParams {
  config: WorkshopConfig;
  sales: Penjualan[];
  expenses: Pengeluaran[];
  purchases: Pembelian[];
  items: Item[];
  closingHistory?: ClosingPeriod[];
  selectedMonth?: string;
}

/**
 * Generate General Ledger (Buku Besar) Accounts
 * Sesuai prinsip akuntansi:
 * - Baris 1: Saldo Awal (pindahan dari bulan lalu)
 * - Baris berikutnya: Mutasi transaksi bulan berjalan
 * - Akun Nominal (Laba Rugi): Dimulai dari 0 di bulan baru
 * - Akun Riil (Neraca): Saldo awal membawa saldo akhir bulan lalu
 */
export function generateGeneralLedger(params: GenerateLedgerParams): GLAccount[] {
  const {
    sales = [],
    expenses = [],
    purchases = [],
    items = [],
    closingHistory = [],
    selectedMonth,
  } = params;

  const latestClosing = closingHistory && closingHistory.length > 0 ? closingHistory[0] : null;

  const now = new Date();
  const realCurrentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Tanggal default untuk saldo awal
  const monthPrefix = selectedMonth && selectedMonth !== 'all' && selectedMonth !== 'current'
    ? selectedMonth
    : latestClosing
      ? latestClosing.tanggalAkhir.substring(0, 7)
      : realCurrentMonth;
  const openingDate = `${monthPrefix}-01`;

  // 1. Saldo Awal Kas
  // Diambil dari penutupan bulan sebelumnya atau dari transaksi opening expense jika ada
  let kasAwal = latestClosing?.saldoKasAwalNextMonth ?? 500000;
  const openingExpense = expenses.find(e => e.kategori === 'Kas Awal / Modal Kasir' || e.isOpeningBalance);
  if (openingExpense) {
    kasAwal = openingExpense.jumlahPengeluaran;
  }

  // 2. Saldo Awal Persediaan
  // Diambil dari snapshot stock closing sebelumnya atau total persediaan item saat ini
  let persediaanAwal = 0;
  if (latestClosing && latestClosing.snapshotStock && latestClosing.snapshotStock.length > 0) {
    persediaanAwal = latestClosing.snapshotStock.reduce(
      (acc, it) => acc + (it.stokSaatIni * it.hargaModal),
      0
    );
  } else {
    // Estimasi persediaan barang saat ini dikurangi pembelian ditambah penjualan HPP
    const currentInventoryVal = items.reduce((acc, it) => acc + (it.stokSaatIni * it.hargaModal), 0);
    persediaanAwal = Math.max(0, currentInventoryVal);
  }

  // -------------------------------------------------------------
  // AKUN 101: KAS DI KASIR & OPERASIONAL (DEBIT)
  // -------------------------------------------------------------
  const kasEntries: GLAccountEntry[] = [];
  let runningKas = kasAwal;

  // Row 1: Saldo Awal
  kasEntries.push({
    tanggal: openingDate,
    noBukti: 'SA-KAS',
    keterangan: 'Saldo Kas Awal (Pindahan Tutup Buku Bulan Lalu)',
    debit: kasAwal,
    kredit: 0,
    saldo: runningKas,
    isOpeningBalance: true,
  });

  // Mutasi Penerimaan Kas dari Penjualan & Jasa
  sales.forEach(s => {
    runningKas += s.totalPenjualan;
    kasEntries.push({
      tanggal: s.tanggal,
      noBukti: s.noTransaksi,
      keterangan: `Penerimaan Kas Kasir: ${s.namaBarang} (${s.qty} unit)${s.hargaJasa > 0 ? ' + Jasa Pasang' : ''}`,
      debit: s.totalPenjualan,
      kredit: 0,
      saldo: runningKas,
    });
  });

  // Mutasi Pengeluaran Kas untuk Pembelian / Pengadaan Sparepart
  purchases.forEach(p => {
    runningKas -= p.totalHarga;
    kasEntries.push({
      tanggal: p.tanggal,
      noBukti: p.noTransaksi,
      keterangan: `Pembayaran Pengadaan Sparepart: ${p.namaBarang} (${p.qty} unit)`,
      debit: 0,
      kredit: p.totalHarga,
      saldo: runningKas,
    });
  });

  // Mutasi Pengeluaran Kas untuk Beban Operasional (Kecuali baris Saldo Awal)
  expenses.filter(e => e.kategori !== 'Kas Awal / Modal Kasir' && !e.isOpeningBalance).forEach(e => {
    runningKas -= e.jumlahPengeluaran;
    kasEntries.push({
      tanggal: e.tanggal,
      noBukti: e.noTransaksi,
      keterangan: `Beban ${e.kategori}: ${e.keterangan}`,
      debit: 0,
      kredit: e.jumlahPengeluaran,
      saldo: runningKas,
    });
  });

  const kasDebit = kasEntries.filter(e => !e.isOpeningBalance).reduce((acc, e) => acc + e.debit, 0);
  const kasKredit = kasEntries.reduce((acc, e) => acc + e.kredit, 0);

  const akunKas: GLAccount = {
    kodeAkun: '101',
    namaAkun: 'Kas di Kasir / Kas Operasional',
    kategori: 'Aset Lancar',
    saldoNormal: 'DEBIT',
    saldoAwal: kasAwal,
    mutasiDebit: kasDebit,
    mutasiKredit: kasKredit,
    saldoAkhir: runningKas,
    entries: kasEntries,
  };

  // -------------------------------------------------------------
  // AKUN 102: PERSEDIAAN SUKU CADANG (DEBIT)
  // -------------------------------------------------------------
  const persediaanEntries: GLAccountEntry[] = [];
  let runningPersediaan = persediaanAwal;

  persediaanEntries.push({
    tanggal: openingDate,
    noBukti: 'SA-STOK',
    keterangan: 'Saldo Awal Persediaan Sparepart (Pindahan Bulan Lalu)',
    debit: persediaanAwal,
    kredit: 0,
    saldo: runningPersediaan,
    isOpeningBalance: true,
  });

  // Pembelian menambah nilai persediaan
  purchases.forEach(p => {
    runningPersediaan += p.totalHarga;
    persediaanEntries.push({
      tanggal: p.tanggal,
      noBukti: p.noTransaksi,
      keterangan: `Masuk Stok Barang: ${p.namaBarang} (${p.qty} pcs @ Rp ${p.hargaModal.toLocaleString('id-ID')})`,
      debit: p.totalHarga,
      kredit: 0,
      saldo: runningPersediaan,
    });
  });

  // Penjualan mengurangi nilai persediaan sebesar HPP
  sales.forEach(s => {
    runningPersediaan -= s.totalHPP;
    persediaanEntries.push({
      tanggal: s.tanggal,
      noBukti: s.noTransaksi,
      keterangan: `Keluar Fisik Terjual (HPP): ${s.namaBarang} (${s.qty} unit)`,
      debit: 0,
      kredit: s.totalHPP,
      saldo: runningPersediaan,
    });
  });

  const persediaanDebit = persediaanEntries.filter(e => !e.isOpeningBalance).reduce((acc, e) => acc + e.debit, 0);
  const persediaanKredit = persediaanEntries.reduce((acc, e) => acc + e.kredit, 0);

  const akunPersediaan: GLAccount = {
    kodeAkun: '102',
    namaAkun: 'Persediaan Suku Cadang (Sparepart)',
    kategori: 'Aset Lancar',
    saldoNormal: 'DEBIT',
    saldoAwal: persediaanAwal,
    mutasiDebit: persediaanDebit,
    mutasiKredit: persediaanKredit,
    saldoAkhir: runningPersediaan,
    entries: persediaanEntries,
  };

  // -------------------------------------------------------------
  // AKUN 301: MODAL PEMILIK BENGKEL (KREDIT)
  // -------------------------------------------------------------
  const modalAwal = kasAwal + persediaanAwal;
  const modalEntries: GLAccountEntry[] = [
    {
      tanggal: openingDate,
      noBukti: 'SA-MODAL',
      keterangan: 'Saldo Modal Usaha Awal (Total Aset Bersih Bulan Lalu)',
      debit: 0,
      kredit: modalAwal,
      saldo: modalAwal,
      isOpeningBalance: true,
    }
  ];

  const akunModal: GLAccount = {
    kodeAkun: '301',
    namaAkun: 'Modal Usaha Pemilik Bengkel',
    kategori: 'Ekuitas',
    saldoNormal: 'KREDIT',
    saldoAwal: modalAwal,
    mutasiDebit: 0,
    mutasiKredit: 0,
    saldoAkhir: modalAwal,
    entries: modalEntries,
  };

  // -------------------------------------------------------------
  // AKUN 401: PENDAPATAN PENJUALAN SUKU CADANG (KREDIT)
  // Dimulai dari NOL di setiap bulan baru!
  // -------------------------------------------------------------
  const penjualanPartEntries: GLAccountEntry[] = [];
  let runningPart = 0;

  penjualanPartEntries.push({
    tanggal: openingDate,
    noBukti: 'SA-REV1',
    keterangan: 'Saldo Awal Bulan Baru (Akun Nominal Dimulai dari Nol)',
    debit: 0,
    kredit: 0,
    saldo: 0,
    isOpeningBalance: true,
  });

  sales.forEach(s => {
    const val = s.totalPart ?? (s.qty * s.hargaJual);
    runningPart += val;
    penjualanPartEntries.push({
      tanggal: s.tanggal,
      noBukti: s.noTransaksi,
      keterangan: `Penjualan: ${s.namaBarang} (${s.qty} unit)`,
      debit: 0,
      kredit: val,
      saldo: runningPart,
    });
  });

  const akunPenjualanPart: GLAccount = {
    kodeAkun: '401',
    namaAkun: 'Pendapatan Penjualan Sparepart',
    kategori: 'Pendapatan Usaha',
    saldoNormal: 'KREDIT',
    saldoAwal: 0,
    mutasiDebit: 0,
    mutasiKredit: runningPart,
    saldoAkhir: runningPart,
    entries: penjualanPartEntries,
  };

  // -------------------------------------------------------------
  // AKUN 402: PENDAPATAN BIAYA JASA SERVIS & PASANG (KREDIT)
  // Dimulai dari NOL di setiap bulan baru!
  // -------------------------------------------------------------
  const jasaEntries: GLAccountEntry[] = [];
  let runningJasa = 0;

  jasaEntries.push({
    tanggal: openingDate,
    noBukti: 'SA-REV2',
    keterangan: 'Saldo Awal Bulan Baru (Akun Nominal Dimulai dari Nol)',
    debit: 0,
    kredit: 0,
    saldo: 0,
    isOpeningBalance: true,
  });

  sales.filter(s => (s.hargaJasa ?? 0) > 0).forEach(s => {
    const val = s.hargaJasa ?? 0;
    runningJasa += val;
    jasaEntries.push({
      tanggal: s.tanggal,
      noBukti: s.noTransaksi,
      keterangan: `Biaya Jasa Servis/Pasang Part: ${s.namaBarang}`,
      debit: 0,
      kredit: val,
      saldo: runningJasa,
    });
  });

  const akunJasa: GLAccount = {
    kodeAkun: '402',
    namaAkun: 'Pendapatan Biaya Jasa Servis & Pasang',
    kategori: 'Pendapatan Usaha',
    saldoNormal: 'KREDIT',
    saldoAwal: 0,
    mutasiDebit: 0,
    mutasiKredit: runningJasa,
    saldoAkhir: runningJasa,
    entries: jasaEntries,
  };

  // -------------------------------------------------------------
  // AKUN 501: HARGA POKOK PENJUALAN (HPP) (DEBIT)
  // Dimulai dari NOL di setiap bulan baru!
  // -------------------------------------------------------------
  const hppEntries: GLAccountEntry[] = [];
  let runningHPP = 0;

  hppEntries.push({
    tanggal: openingDate,
    noBukti: 'SA-HPP',
    keterangan: 'Saldo Awal Bulan Baru (Akun Nominal Dimulai dari Nol)',
    debit: 0,
    kredit: 0,
    saldo: 0,
    isOpeningBalance: true,
  });

  sales.forEach(s => {
    runningHPP += s.totalHPP;
    hppEntries.push({
      tanggal: s.tanggal,
      noBukti: s.noTransaksi,
      keterangan: `Beban Pokok Pengadaan Part Terjual: ${s.namaBarang} (${s.qty} unit)`,
      debit: s.totalHPP,
      kredit: 0,
      saldo: runningHPP,
    });
  });

  const akunHPP: GLAccount = {
    kodeAkun: '501',
    namaAkun: 'Harga Pokok Penjualan (HPP Sparepart)',
    kategori: 'Beban Pokok Penjualan',
    saldoNormal: 'DEBIT',
    saldoAwal: 0,
    mutasiDebit: runningHPP,
    mutasiKredit: 0,
    saldoAkhir: runningHPP,
    entries: hppEntries,
  };

  // -------------------------------------------------------------
  // AKUN 601: BEBAN OPERASIONAL USAHA (DEBIT)
  // Dimulai dari NOL di setiap bulan baru!
  // -------------------------------------------------------------
  const bebanEntries: GLAccountEntry[] = [];
  let runningBeban = 0;

  bebanEntries.push({
    tanggal: openingDate,
    noBukti: 'SA-BEBAN',
    keterangan: 'Saldo Awal Bulan Baru (Akun Nominal Dimulai dari Nol)',
    debit: 0,
    kredit: 0,
    saldo: 0,
    isOpeningBalance: true,
  });

  expenses.filter(e => e.kategori !== 'Kas Awal / Modal Kasir' && !e.isOpeningBalance).forEach(e => {
    runningBeban += e.jumlahPengeluaran;
    bebanEntries.push({
      tanggal: e.tanggal,
      noBukti: e.noTransaksi,
      keterangan: `Beban Operasional: ${e.kategori} - ${e.keterangan}`,
      debit: e.jumlahPengeluaran,
      kredit: 0,
      saldo: runningBeban,
    });
  });

  const akunBeban: GLAccount = {
    kodeAkun: '601',
    namaAkun: 'Beban Operasional Usaha Bengkel',
    kategori: 'Beban Operasional',
    saldoNormal: 'DEBIT',
    saldoAwal: 0,
    mutasiDebit: runningBeban,
    mutasiKredit: 0,
    saldoAkhir: runningBeban,
    entries: bebanEntries,
  };

  return [
    akunKas,
    akunPersediaan,
    akunModal,
    akunPenjualanPart,
    akunJasa,
    akunHPP,
    akunBeban,
  ];
}

/**
 * Generate Laporan Neraca Keuangan (Balance Sheet)
 * Akun Riil (Aset, Kewajiban, Modal) membawa saldo terus berlanjut.
 * Persamaan dasar akuntansi: ASET = KEWAJIBAN + EKUITAS
 */
export function generateBalanceSheet(
  glAccounts: GLAccount[],
  periodeNama: string,
  tanggal: string
): BalanceSheetData {
  const kasAccount = glAccounts.find(a => a.kodeAkun === '101');
  const persediaanAccount = glAccounts.find(a => a.kodeAkun === '102');
  const modalAccount = glAccounts.find(a => a.kodeAkun === '301');
  const revPartAccount = glAccounts.find(a => a.kodeAkun === '401');
  const revJasaAccount = glAccounts.find(a => a.kodeAkun === '402');
  const hppAccount = glAccounts.find(a => a.kodeAkun === '501');
  const expAccount = glAccounts.find(a => a.kodeAkun === '601');

  const kasDiKasir = kasAccount ? kasAccount.saldoAkhir : 0;
  const persediaanBarang = persediaanAccount ? persediaanAccount.saldoAkhir : 0;
  const totalAset = kasDiKasir + persediaanBarang;

  // Laba bersih periode berjalan = Pendapatan - HPP - Beban Operasional
  const totalPendapatan = (revPartAccount ? revPartAccount.saldoAkhir : 0) + (revJasaAccount ? revJasaAccount.saldoAkhir : 0);
  const totalBeban = (hppAccount ? hppAccount.saldoAkhir : 0) + (expAccount ? expAccount.saldoAkhir : 0);
  const labaPeriodeBerjalan = totalPendapatan - totalBeban;

  // Modal pemilik awal disesuaikan sehingga Passiva seimbang dengan Aktiva
  const modalPemilikAwal = (modalAccount ? modalAccount.saldoAwal : 0) || (totalAset - labaPeriodeBerjalan);
  const totalPassiva = modalPemilikAwal + labaPeriodeBerjalan;

  return {
    tanggal,
    periodeNama,
    asetLancar: {
      kasDiKasir,
      persediaanBarang,
    },
    totalAset,
    kewajiban: {
      hutangSupplier: 0,
    },
    ekuitas: {
      modalPemilikAwal,
      labaPeriodeBerjalan,
    },
    totalPassiva,
    isBalanced: Math.abs(totalAset - totalPassiva) < 1,
  };
}
