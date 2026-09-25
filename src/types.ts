export interface Item {
  kodeBarang: string;
  namaBarang: string;
  jenisKendaraan: string;
  hargaModal: number;
  hargaJual: number;
  stokSaatIni: number;
  minimalStok: number;
}

export interface Pembelian {
  noTransaksi: string;
  tanggal: string;
  kodeBarang: string;
  namaBarang: string;
  jenisKendaraan: string;
  qty: number;
  hargaModal: number;
  totalHarga: number;
  isClosed?: boolean;
}

export interface Penjualan {
  noTransaksi: string;
  tanggal: string;
  kodeBarang: string;
  namaBarang: string;
  jenisKendaraan: string;
  qty: number;
  hargaJual: number; // Harga Jual Part Satuan
  totalPart: number; // Qty * Harga Jual Part
  hargaJasa: number; // Biaya Servis / Jasa Pasang (0% HPP / 100% Margin)
  totalPenjualan: number; // Total Part + Harga Jasa
  totalHPP: number; // Qty * Harga Modal Part
  labaKotor: number; // Total Penjualan - Total HPP
  isClosed?: boolean;
}

export interface Pengeluaran {
  noTransaksi: string;
  tanggal: string;
  kategori: 'Operasional' | 'Gaji' | 'Sewa' | 'Listrik/Air' | 'Sparepart/Alat' | 'Kas Awal / Modal Kasir' | 'Lainnya';
  keterangan: string;
  jumlahPengeluaran: number;
  isClosed?: boolean;
  isOpeningBalance?: boolean;
}

export interface WorkshopConfig {
  licenseStatus: 'ACTIVE' | 'TRIAL' | 'LOCKED';
  masterKey: string;
  namaBengkel: string;
  alamat: string;
  namaPengelola: string;
  pctPemilik: number; // e.g. 60
  pctPengelola: number; // e.g. 40
  namaPemilik: string;
  telepon: string;
  kota: string;
}

export interface ClosingEntry {
  tanggal: string;
  kodeAkun: string;
  namaAkun: string;
  posisi: 'DEBIT' | 'KREDIT';
  debit: number;
  kredit: number;
  keterangan: string;
}

export interface ClosingPeriod {
  id: string;
  periodeNama: string; // e.g. "September 2026"
  tanggalAwal: string;
  tanggalAkhir: string;
  tanggalEksekusi: string;
  totalPenjualan: number;
  totalPart: number;
  totalJasa: number;
  totalHPP: number;
  labaKotor: number;
  totalPengeluaran: number;
  labaBersih: number;
  nominalPemilik: number;
  nominalPengelola: number;
  archivedSales: Penjualan[];
  archivedExpenses: Pengeluaran[];
  archivedPurchases: Pembelian[];
  snapshotStock: Item[];
  saldoKasAwalNextMonth: number;
  catatan?: string;
  closingEntries: ClosingEntry[];
}

export interface DateFilter {
  mode: 'all' | 'month' | 'custom';
  selectedMonth: string; // "YYYY-MM"
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
}

export interface VbaModule {
  id: string;
  title: string;
  type: 'Workbook' | 'Module' | 'UserForm' | 'Layout' | 'Sheet';
  filename: string;
  description: string;
  code: string;
  formControls?: {
    controlName: string;
    controlType: string;
    captionOrLabel: string;
    description: string;
  }[];
}
