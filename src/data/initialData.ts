import { Item, Pembelian, Penjualan, Pengeluaran, WorkshopConfig } from '../types';

export const initialConfig: WorkshopConfig = {
  licenseStatus: 'ACTIVE',
  masterKey: '*#rycko#*',
  namaBengkel: 'BENGKEL MAJU JAYA',
  alamat: 'Jl. Raya Industri No. 123, Bekasi',
  namaPengelola: 'Bp. Ahmad Pengelola',
  pctPemilik: 60,
  pctPengelola: 40,
  namaPemilik: 'Bp. Hendra Pemilik Modal',
  telepon: '0812-3456-7890',
  kota: 'Bekasi',
};

export const initialItems: Item[] = [
  {
    kodeBarang: 'BRG-001',
    namaBarang: 'Oli Mesin MPX2 0.8L (Matic)',
    jenisKendaraan: 'Honda Matic (Beat/Vario/Scoopy)',
    hargaModal: 42000,
    hargaJual: 58000,
    stokSaatIni: 24,
    minimalStok: 5,
  },
  {
    kodeBarang: 'BRG-002',
    namaBarang: 'Oli Mesin Yamalube Silver 0.8L',
    jenisKendaraan: 'Yamaha Bebek/Sport (Jupiter/Vega)',
    hargaModal: 38000,
    hargaJual: 52000,
    stokSaatIni: 16,
    minimalStok: 5,
  },
  {
    kodeBarang: 'BRG-003',
    namaBarang: 'Kampas Rem Depan Honda Beat/Vario',
    jenisKendaraan: 'Honda Beat / Vario / Scoopy',
    hargaModal: 28000,
    hargaJual: 45000,
    stokSaatIni: 2, // Low stock -> trigger reorder
    minimalStok: 4,
  },
  {
    kodeBarang: 'BRG-004',
    namaBarang: 'Kampas Rem Belakang Tromol Yamaha Mio',
    jenisKendaraan: 'Yamaha Mio / Soul / Fino',
    hargaModal: 25000,
    hargaJual: 40000,
    stokSaatIni: 8,
    minimalStok: 3,
  },
  {
    kodeBarang: 'BRG-005',
    namaBarang: 'Busi NGK CPR9EA-9 (Standard)',
    jenisKendaraan: 'Universal Bebek & Matic',
    hargaModal: 15000,
    hargaJual: 25000,
    stokSaatIni: 1, // Low stock -> trigger reorder
    minimalStok: 5,
  },
  {
    kodeBarang: 'BRG-006',
    namaBarang: 'Ban Luar Tubeless IRC 90/90-14',
    jenisKendaraan: 'Motor Matic Ring 14',
    hargaModal: 165000,
    hargaJual: 220000,
    stokSaatIni: 6,
    minimalStok: 3,
  },
  {
    kodeBarang: 'BRG-007',
    namaBarang: 'Roller CVT Set Honda Beat ESP (13gr)',
    jenisKendaraan: 'Honda Beat FI / Scoopy ESP',
    hargaModal: 45000,
    hargaJual: 75000,
    stokSaatIni: 2, // Low stock
    minimalStok: 3,
  },
  {
    kodeBarang: 'BRG-008',
    namaBarang: 'V-Belt Gates Powerlink Vario 125',
    jenisKendaraan: 'Honda Vario 125 / 150',
    hargaModal: 95000,
    hargaJual: 145000,
    stokSaatIni: 7,
    minimalStok: 3,
  },
  {
    kodeBarang: 'BRG-009',
    namaBarang: 'Air Radiator Coolant Prestone 1L',
    jenisKendaraan: 'Universal Motor & Mobil',
    hargaModal: 22000,
    hargaJual: 35000,
    stokSaatIni: 12,
    minimalStok: 3,
  },
  {
    kodeBarang: 'BRG-010',
    namaBarang: 'Minyak Rem Jumbo Dot 3 (50ml)',
    jenisKendaraan: 'Universal Semua Kendaraan',
    hargaModal: 7000,
    hargaJual: 15000,
    stokSaatIni: 18,
    minimalStok: 5,
  },
];

// Helper to dynamically synchronize sample data with the current month
const now = new Date();
const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
const makeDate = (day: number) => `${currentYM}-${String(day).padStart(2, '0')}`;

export const initialPembelian: Pembelian[] = [
  {
    noTransaksi: `PB-${currentYM.replace(/-/g, '')}01-01`,
    tanggal: makeDate(1),
    kodeBarang: 'BRG-001',
    namaBarang: 'Oli Mesin MPX2 0.8L (Matic)',
    jenisKendaraan: 'Honda Matic (Beat/Vario/Scoopy)',
    qty: 24,
    hargaModal: 42000,
    totalHarga: 1008000,
  },
  {
    noTransaksi: `PB-${currentYM.replace(/-/g, '')}01-02`,
    tanggal: makeDate(1),
    kodeBarang: 'BRG-002',
    namaBarang: 'Oli Mesin Yamalube Silver 0.8L',
    jenisKendaraan: 'Yamaha Bebek/Sport (Jupiter/Vega)',
    qty: 20,
    hargaModal: 38000,
    totalHarga: 760000,
  },
  {
    noTransaksi: `PB-${currentYM.replace(/-/g, '')}02-01`,
    tanggal: makeDate(2),
    kodeBarang: 'BRG-006',
    namaBarang: 'Ban Luar Tubeless IRC 90/90-14',
    jenisKendaraan: 'Motor Matic Ring 14',
    qty: 8,
    hargaModal: 165000,
    totalHarga: 1320000,
  },
  {
    noTransaksi: `PB-${currentYM.replace(/-/g, '')}05-01`,
    tanggal: makeDate(5),
    kodeBarang: 'BRG-008',
    namaBarang: 'V-Belt Gates Powerlink Vario 125',
    jenisKendaraan: 'Honda Vario 125 / 150',
    qty: 10,
    hargaModal: 95000,
    totalHarga: 950000,
  },
];

export const initialPenjualan: Penjualan[] = [
  {
    noTransaksi: `PJ-${currentYM.replace(/-/g, '')}10-01`,
    tanggal: makeDate(10),
    kodeBarang: 'BRG-001',
    namaBarang: 'Oli Mesin MPX2 0.8L (Matic)',
    jenisKendaraan: 'Honda Matic (Beat/Vario/Scoopy)',
    qty: 2,
    hargaJual: 58000,
    totalPart: 116000,
    hargaJasa: 15000, // Biaya Jasa Ganti Oli
    totalPenjualan: 131000,
    totalHPP: 84000,
    labaKotor: 47000,
  },
  {
    noTransaksi: `PJ-${currentYM.replace(/-/g, '')}11-01`,
    tanggal: makeDate(11),
    kodeBarang: 'BRG-006',
    namaBarang: 'Ban Luar Tubeless IRC 90/90-14',
    jenisKendaraan: 'Motor Matic Ring 14',
    qty: 2,
    hargaJual: 220000,
    totalPart: 440000,
    hargaJasa: 30000, // Biaya Pasang Ban Tubeless
    totalPenjualan: 470000,
    totalHPP: 330000,
    labaKotor: 140000,
  },
  {
    noTransaksi: `PJ-${currentYM.replace(/-/g, '')}12-01`,
    tanggal: makeDate(12),
    kodeBarang: 'BRG-003',
    namaBarang: 'Kampas Rem Depan Honda Beat/Vario',
    jenisKendaraan: 'Honda Beat / Vario / Scoopy',
    qty: 4,
    hargaJual: 45000,
    totalPart: 180000,
    hargaJasa: 20000, // Biaya Pasang Kampas Rem
    totalPenjualan: 200000,
    totalHPP: 112000,
    labaKotor: 88000,
  },
  {
    noTransaksi: `PJ-${currentYM.replace(/-/g, '')}13-01`,
    tanggal: makeDate(13),
    kodeBarang: 'BRG-007',
    namaBarang: 'Roller CVT Set Honda Beat ESP (13gr)',
    jenisKendaraan: 'Honda Beat FI / Scoopy ESP',
    qty: 2,
    hargaJual: 75000,
    totalPart: 150000,
    hargaJasa: 35000, // Biaya Servis & Bongkar CVT
    totalPenjualan: 185000,
    totalHPP: 90000,
    labaKotor: 95000,
  },
  {
    noTransaksi: `PJ-${currentYM.replace(/-/g, '')}14-01`,
    tanggal: makeDate(14),
    kodeBarang: 'BRG-008',
    namaBarang: 'V-Belt Gates Powerlink Vario 125',
    jenisKendaraan: 'Honda Vario 125 / 150',
    qty: 3,
    hargaJual: 145000,
    totalPart: 435000,
    hargaJasa: 45000, // Biaya Pasang & Servis Ringan
    totalPenjualan: 480000,
    totalHPP: 285000,
    labaKotor: 195000,
  },
  {
    noTransaksi: `PJ-${currentYM.replace(/-/g, '')}15-01`,
    tanggal: makeDate(15),
    kodeBarang: 'BRG-002',
    namaBarang: 'Oli Mesin Yamalube Silver 0.8L',
    jenisKendaraan: 'Yamaha Bebek/Sport (Jupiter/Vega)',
    qty: 4,
    hargaJual: 52000,
    totalPart: 208000,
    hargaJasa: 0, // Pembelian part saja tanpa jasa
    totalPenjualan: 208000,
    totalHPP: 152000,
    labaKotor: 56000,
  },
];

export const initialPengeluaran: Pengeluaran[] = [
  {
    noTransaksi: `PG-${currentYM.replace(/-/g, '')}01-01`,
    tanggal: makeDate(1),
    kategori: 'Sewa',
    keterangan: 'Sewa Kios Bengkel Bulan Berjalan',
    jumlahPengeluaran: 450000,
  },
  {
    noTransaksi: `PG-${currentYM.replace(/-/g, '')}04-01`,
    tanggal: makeDate(4),
    kategori: 'Listrik/Air',
    keterangan: 'Token Listrik PLN Daya 2200VA Kompresor',
    jumlahPengeluaran: 120000,
  },
  {
    noTransaksi: `PG-${currentYM.replace(/-/g, '')}08-01`,
    tanggal: makeDate(8),
    kategori: 'Sparepart/Alat',
    keterangan: 'Kunci T 8mm, 10mm & Kunci Busi Baru',
    jumlahPengeluaran: 65000,
  },
  {
    noTransaksi: `PG-${currentYM.replace(/-/g, '')}12-01`,
    tanggal: makeDate(12),
    kategori: 'Operasional',
    keterangan: 'Sabun Cuci Tangan, Lap Majun & Bensin Cuci Part',
    jumlahPengeluaran: 45000,
  },
];
