import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SheetsView } from './components/SheetsView';
import { VbaCodeViewer } from './components/VbaCodeViewer';
import { ReportPrintView } from './components/ReportPrintView';
import { InstallationGuide } from './components/InstallationGuide';
import { UserFormProfilBengkel } from './components/UserFormProfilBengkel';
import { UserFormPenjualan } from './components/UserFormPenjualan';
import { UserFormPengeluaran } from './components/UserFormPengeluaran';
import { UserFormItem } from './components/UserFormItem';
import { UserFormPembelian } from './components/UserFormPembelian';
import { AdminKeyModal } from './components/AdminKeyModal';
import { StandaloneAppModal } from './components/StandaloneAppModal';
import { MonthlyClosingModal } from './components/MonthlyClosingModal';
import { ClosingHistoryModal } from './components/ClosingHistoryModal';

import { 
  initialConfig, 
  initialItems, 
  initialPembelian, 
  initialPenjualan, 
  initialPengeluaran 
} from './data/initialData';
import { 
  loadStoredConfig, 
  loadStoredItems, 
  loadStoredPembelian, 
  loadStoredPenjualan, 
  loadStoredPengeluaran,
  loadStoredClosingHistory,
  saveStoredConfig,
  saveStoredItems,
  saveStoredPembelian,
  saveStoredPenjualan,
  saveStoredPengeluaran,
  saveStoredClosingHistory,
  resetAllToDefault
} from './utils/storage';
import { vbaModules } from './data/vbaCode';
import { Item, Pembelian, Penjualan, Pengeluaran, WorkshopConfig, ClosingPeriod } from './types';
import { downloadTextFile } from './utils/formatters';
import { downloadVbaZipArchive } from './utils/vbaDownloader';
import { exportMonthlyClosingWorkbook, generateStandardClosingEntries } from './utils/excelExporter';

export default function App() {
  const [activeTab, setActiveTab] = useState<'simulator' | 'vbacode' | 'report' | 'guide'>('simulator');
  
  // App Data States - Loaded from persistent localStorage (Web-Base)
  const [config, setConfig] = useState<WorkshopConfig>(() => loadStoredConfig());
  const [items, setItems] = useState<Item[]>(() => loadStoredItems());
  const [pembelian, setPembelian] = useState<Pembelian[]>(() => loadStoredPembelian());
  const [penjualan, setPenjualan] = useState<Penjualan[]>(() => loadStoredPenjualan());
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>(() => loadStoredPengeluaran());
  const [closingHistory, setClosingHistory] = useState<ClosingPeriod[]>(() => loadStoredClosingHistory());

  // Automatically sync to localStorage whenever state changes
  useEffect(() => {
    saveStoredConfig(config);
  }, [config]);

  useEffect(() => {
    saveStoredItems(items);
  }, [items]);

  useEffect(() => {
    saveStoredPembelian(pembelian);
  }, [pembelian]);

  useEffect(() => {
    saveStoredPenjualan(penjualan);
  }, [penjualan]);

  useEffect(() => {
    saveStoredPengeluaran(pengeluaran);
  }, [pengeluaran]);

  useEffect(() => {
    saveStoredClosingHistory(closingHistory);
  }, [closingHistory]);

  // Modals
  const [isPenjualanOpen, setIsPenjualanOpen] = useState(false);
  const [isPengeluaranOpen, setIsPengeluaranOpen] = useState(false);
  const [isProfilOpen, setIsProfilOpen] = useState(false);
  const [isAdminKeyOpen, setIsAdminKeyOpen] = useState(false);
  const [isStandaloneModalOpen, setIsStandaloneModalOpen] = useState(false);
  const [isMonthlyClosingOpen, setIsMonthlyClosingOpen] = useState(false);
  const [isClosingHistoryOpen, setIsClosingHistoryOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [isPembelianOpen, setIsPembelianOpen] = useState(false);
  const [pembelianDefaultKode, setPembelianDefaultKode] = useState<string | undefined>(undefined);

  // Save Penjualan & Deduct Stock
  const handleSavePenjualan = (newSale: Penjualan, updatedItem: Item) => {
    setPenjualan((prev) => [newSale, ...prev]);
    setItems((prev) =>
      prev.map((it) => (it.kodeBarang === updatedItem.kodeBarang ? updatedItem : it))
    );
  };

  // Delete Penjualan & Restore Stock
  const handleDeletePenjualan = (noTransaksi: string, kodeBarang: string, qty: number) => {
    setPenjualan((prev) => prev.filter((p) => p.noTransaksi !== noTransaksi));
    setItems((prev) =>
      prev.map((it) =>
        it.kodeBarang === kodeBarang
          ? { ...it, stokSaatIni: it.stokSaatIni + qty }
          : it
      )
    );
  };

  // Save Pengeluaran
  const handleSavePengeluaran = (newExpense: Pengeluaran) => {
    setPengeluaran((prev) => [newExpense, ...prev]);
  };

  // Delete Pengeluaran
  const handleDeletePengeluaran = (noTransaksi: string) => {
    setPengeluaran((prev) => prev.filter((p) => p.noTransaksi !== noTransaksi));
  };

  // Save Item (Create or Update)
  const handleSaveItem = (itemData: Item) => {
    setItems((prev) => {
      const exists = prev.some((it) => it.kodeBarang === itemData.kodeBarang);
      if (exists) {
        return prev.map((it) => (it.kodeBarang === itemData.kodeBarang ? itemData : it));
      }
      return [...prev, itemData];
    });
  };

  // Delete Item from Database_Barang
  const handleDeleteItem = (kodeBarang: string) => {
    setItems((prev) => prev.filter((it) => it.kodeBarang !== kodeBarang));
  };

  // Save Pembelian / Restok (supports existing item or new item registration)
  const handleSavePembelian = (newPb: Pembelian, newItem?: Item) => {
    setPembelian((prev) => [newPb, ...prev]);
    if (newItem) {
      setItems((prev) => {
        const exists = prev.some((it) => it.kodeBarang === newItem.kodeBarang);
        if (exists) {
          return prev.map((it) =>
            it.kodeBarang === newItem.kodeBarang
              ? { ...it, stokSaatIni: it.stokSaatIni + newPb.qty, hargaModal: newPb.hargaModal }
              : it
          );
        }
        return [...prev, newItem];
      });
    } else {
      setItems((prev) =>
        prev.map((it) =>
          it.kodeBarang === newPb.kodeBarang
            ? { ...it, stokSaatIni: it.stokSaatIni + newPb.qty, hargaModal: newPb.hargaModal }
            : it
        )
      );
    }
  };

  // Quick Restock Item (creates Pembelian record & adds stock)
  const handleRestockItem = (kodeBarang: string, addQty: number) => {
    const target = items.find((i) => i.kodeBarang === kodeBarang);
    if (!target) return;

    const dateNow = new Date().toISOString().split('T')[0];
    const randId = Math.floor(100 + Math.random() * 900);
    const newPb: Pembelian = {
      noTransaksi: `PB-${dateNow.replace(/-/g, '')}-${randId}`,
      tanggal: dateNow,
      kodeBarang: target.kodeBarang,
      namaBarang: target.namaBarang,
      jenisKendaraan: target.jenisKendaraan,
      qty: addQty,
      hargaModal: target.hargaModal,
      totalHarga: addQty * target.hargaModal,
    };

    handleSavePembelian(newPb);
  };

  // Open Modal Pembelian for specific or general item
  const handleOpenPembelian = (defaultKode?: string) => {
    setPembelianDefaultKode(defaultKode);
    setIsPembelianOpen(true);
  };

  // Open Item Form for Add
  const handleOpenAddItem = () => {
    setItemToEdit(null);
    setIsItemModalOpen(true);
  };

  // Open Item Form for Edit
  const handleOpenEditItem = (item: Item) => {
    setItemToEdit(item);
    setIsItemModalOpen(true);
  };

  // Save Profil Config
  const handleSaveProfil = (updated: Partial<WorkshopConfig>) => {
    setConfig((prev) => ({ ...prev, ...updated }));
  };

  // Reset Data to Default
  const handleResetData = () => {
    resetAllToDefault();
    setConfig(initialConfig);
    setItems(initialItems);
    setPembelian(initialPembelian);
    setPenjualan(initialPenjualan);
    setPengeluaran(initialPengeluaran);
  };

  // Synchronize unclosed transactions to the real current month
  const handleSyncCurrentMonth = () => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const mapDateToCurrentMonth = (oldDate: string) => {
      if (!oldDate) return `${currentYearMonth}-01`;
      const parts = oldDate.split('-');
      let day = parseInt(parts[2], 10) || 1;
      if (day > daysInMonth) day = daysInMonth;
      return `${currentYearMonth}-${String(day).padStart(2, '0')}`;
    };

    setPenjualan((prev) =>
      prev.map((s) => (s.isClosed ? s : { ...s, tanggal: mapDateToCurrentMonth(s.tanggal) }))
    );
    setPembelian((prev) =>
      prev.map((p) => (p.isClosed ? p : { ...p, tanggal: mapDateToCurrentMonth(p.tanggal) }))
    );
    setPengeluaran((prev) =>
      prev.map((e) => (e.isClosed ? e : { ...e, tanggal: mapDateToCurrentMonth(e.tanggal) }))
    );
  };

  // Download All VBA Modules as ZIP archive or bundled file
  const handleDownloadAllVba = async () => {
    try {
      await downloadVbaZipArchive(vbaModules, config.namaBengkel);
    } catch {
      // Fallback to text file if ZIP fails
      let combined = `''' =========================================================================\n`;
      combined += `''' BUNDLE KODE VBA EXCEL - SISTEM PEMBUKUAN USAHA BENGKEL\n`;
      combined += `''' Generated for: ${config.namaBengkel} (${config.kota})\n`;
      combined += `''' =========================================================================\n\n`;

      vbaModules.forEach((mod) => {
        combined += `\n' #########################################################################\n`;
        combined += `' FILE: ${mod.filename} (${mod.title})\n`;
        combined += `' TIPE: ${mod.type}\n`;
        combined += `' DESKRIPSI: ${mod.description}\n`;
        combined += `' #########################################################################\n\n`;
        combined += mod.code;
        combined += `\n\n`;
      });

      downloadTextFile(`VBA_Pembukuan_Bengkel_${config.namaBengkel.replace(/\s+/g, '_')}.txt`, combined);
    }
  };

  // Execute Tutup Buku Akhir Bulan (Monthly Closing)
  const handleExecuteClosing = (closingData: ClosingPeriod) => {
    // 1. Simpan periode ke riwayat arsip
    setClosingHistory((prev) => [closingData, ...prev]);

    // 2. Tandai seluruh transaksi yang ditutup buku dengan isClosed: true
    // Hal ini memungkinkan sistem otomatis menyembunyikan transaksi bulan lalu dari bulan baru,
    // namun pengguna tetap dapat melihat kembali data lama saat memilih filter bulan sebelumnya.
    setPenjualan((prev) => prev.map((s) => ({ ...s, isClosed: true, closingId: closingData.id })));
    setPembelian((prev) => prev.map((p) => ({ ...p, isClosed: true, closingId: closingData.id })));

    // 3. Masukkan baris Saldo Kas Awal di sheet Pengeluaran untuk bulan baru
    const dateStr = closingData.tanggalAkhir || new Date().toISOString().split('T')[0];
    const dateParts = dateStr.split('-');
    let nextY = parseInt(dateParts[0], 10) || 2026;
    let nextM = parseInt(dateParts[1], 10) || 9;
    nextM += 1;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const nextMonthFirstDay = `${nextY}-${String(nextM).padStart(2, '0')}-01`;

    const openingExpense: Pengeluaran = {
      noTransaksi: `KAS-AWAL-${nextMonthFirstDay.replace(/-/g, '')}`,
      tanggal: nextMonthFirstDay,
      kategori: 'Kas Awal / Modal Kasir',
      keterangan: `Saldo Kas Awal Kasir Bulan Baru (${closingData.periodeNama})`,
      jumlahPengeluaran: closingData.saldoKasAwalNextMonth,
      isOpeningBalance: true,
    };
    setPengeluaran((prev) => [
      openingExpense,
      ...prev.map((e) => ({ ...e, isClosed: true, closingId: closingData.id })),
    ]);

    // Note: Sheet Database_Barang tetap menyimpan stok terkini sebagai Saldo Awal Fisik bulan baru
  };

  // Direct export current data to multi-sheet Excel (.xlsx)
  const handleDirectExcelExport = () => {
    const today = new Date().toISOString().split('T')[0];
    const totalPart = penjualan.reduce((acc, s) => acc + (s.totalPart ?? (s.qty * s.hargaJual)), 0);
    const totalJasa = penjualan.reduce((acc, s) => acc + (s.hargaJasa ?? 0), 0);
    const totalPenjualan = penjualan.reduce((acc, s) => acc + s.totalPenjualan, 0);
    const totalHPP = penjualan.reduce((acc, s) => acc + s.totalHPP, 0);
    const labaKotor = totalPenjualan - totalHPP;
    const totalPengeluaran = pengeluaran.reduce((acc, e) => acc + e.jumlahPengeluaran, 0);
    const labaBersih = labaKotor - totalPengeluaran;

    const nominalPemilik = Math.max(0, labaBersih) * (config.pctPemilik / 100);
    const nominalPengelola = Math.max(0, labaBersih) * (config.pctPengelola / 100);

    const closingEntries = generateStandardClosingEntries({
      tanggal: today,
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

    exportMonthlyClosingWorkbook({
      config,
      periodeTitle: `Pembukuan Berjalan - ${config.namaBengkel}`,
      sales: penjualan,
      expenses: pengeluaran,
      purchases: pembelian,
      items,
      closingEntries,
      printDate: today,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        onOpenAdminKey={() => setIsAdminKeyOpen(true)}
        onDownloadAllVba={handleDownloadAllVba}
        onOpenStandaloneModal={() => setIsStandaloneModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'simulator' && (
          <SheetsView
            items={items}
            pembelian={pembelian}
            penjualan={penjualan}
            pengeluaran={pengeluaran}
            config={config}
            onOpenPenjualan={() => setIsPenjualanOpen(true)}
            onOpenPengeluaran={() => setIsPengeluaranOpen(true)}
            onOpenProfil={() => setIsProfilOpen(true)}
            onOpenReportPrint={() => setActiveTab('report')}
            onRestockItem={handleRestockItem}
            onOpenAddItem={handleOpenAddItem}
            onOpenEditItem={handleOpenEditItem}
            onDeleteItem={handleDeleteItem}
            onOpenPembelian={handleOpenPembelian}
            onDeletePenjualan={handleDeletePenjualan}
            onDeletePengeluaran={handleDeletePengeluaran}
            onResetData={handleResetData}
            onOpenStandaloneModal={() => setIsStandaloneModalOpen(true)}
            onOpenMonthlyClosing={() => setIsMonthlyClosingOpen(true)}
            onOpenClosingHistory={() => setIsClosingHistoryOpen(true)}
            closingHistoryCount={closingHistory.length}
            closingHistory={closingHistory}
            onExportExcel={handleDirectExcelExport}
            onSyncCurrentMonth={handleSyncCurrentMonth}
            onBatchUpdateItems={(newItems) => setItems(newItems)}
          />
        )}

        {activeTab === 'vbacode' && (
          <VbaCodeViewer 
            workshopName={config.namaBengkel} 
            onDownloadAll={handleDownloadAllVba} 
          />
        )}

        {activeTab === 'report' && (
          <ReportPrintView
            config={config}
            sales={penjualan}
            expenses={pengeluaran}
            purchases={pembelian}
            items={items}
            onOpenProfilForm={() => setIsProfilOpen(true)}
            onOpenMonthlyClosing={() => setIsMonthlyClosingOpen(true)}
            closingHistory={closingHistory}
          />
        )}

        {activeTab === 'guide' && <InstallationGuide />}
      </main>

      {/* Footer */}
      <footer className="print:hidden bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <p>
          Aplikasi Bengkel Web-Base • Rycko System • Format Sesuai Standar Pembukuan &amp; VBA Macro Excel
        </p>
      </footer>

      {/* UserForms & Dialog Modals */}
      <UserFormPenjualan
        isOpen={isPenjualanOpen}
        onClose={() => setIsPenjualanOpen(false)}
        items={items}
        onSavePenjualan={handleSavePenjualan}
      />

      <UserFormPengeluaran
        isOpen={isPengeluaranOpen}
        onClose={() => setIsPengeluaranOpen(false)}
        onSavePengeluaran={handleSavePengeluaran}
      />

      <UserFormItem
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setItemToEdit(null);
        }}
        onSaveItem={handleSaveItem}
        existingItem={itemToEdit}
        itemToEdit={itemToEdit}
        allItems={items}
        items={items}
        existingCodes={items.map((it) => it.kodeBarang)}
      />

      <UserFormPembelian
        isOpen={isPembelianOpen}
        onClose={() => {
          setIsPembelianOpen(false);
          setPembelianDefaultKode(undefined);
        }}
        items={items}
        onSavePembelian={handleSavePembelian}
        defaultKodeBarang={pembelianDefaultKode}
      />

      <UserFormProfilBengkel
        isOpen={isProfilOpen}
        onClose={() => setIsProfilOpen(false)}
        config={config}
        onSave={handleSaveProfil}
      />

      <AdminKeyModal
        isOpen={isAdminKeyOpen}
        onClose={() => setIsAdminKeyOpen(false)}
        config={config}
        onUpdateStatus={(st) => setConfig((prev) => ({ ...prev, licenseStatus: st }))}
      />

      <StandaloneAppModal
        isOpen={isStandaloneModalOpen}
        onClose={() => setIsStandaloneModalOpen(false)}
        workshopName={config.namaBengkel}
      />

      {/* Monthly Closing Modal */}
      <MonthlyClosingModal
        isOpen={isMonthlyClosingOpen}
        onClose={() => setIsMonthlyClosingOpen(false)}
        config={config}
        sales={penjualan}
        expenses={pengeluaran}
        purchases={pembelian}
        items={items}
        onExecuteClosing={handleExecuteClosing}
      />

      {/* Closing History Modal */}
      <ClosingHistoryModal
        isOpen={isClosingHistoryOpen}
        onClose={() => setIsClosingHistoryOpen(false)}
        config={config}
        closingHistory={closingHistory}
      />
    </div>
  );
}
