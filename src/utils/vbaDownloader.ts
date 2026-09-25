import JSZip from 'jszip';
import { VbaModule } from '../types';
import { downloadTextFile } from './formatters';

export async function downloadVbaZipArchive(
  modules: VbaModule[],
  workshopName: string = 'Bengkel'
) {
  const zip = new JSZip();

  // Mapping to guarantee exact filenames requested:
  // 1. Workbook.cls
  // 2. Modul_LaporanKeuangan.bas
  // 3. Modul_SetupDatabase.bas
  // 4. Userform_ProfilBengkel.frm
  // 5. Userform_Penjualan.frm
  // 6. Userform_Pengeluaran.frm
  // 7. Userform_Pembelian.frm
  // 8. Sheet3_Penjualan.cls
  // 9. Modul_TombolMenu.bas

  modules.forEach((mod) => {
    zip.file(mod.filename, mod.code);

    // If ThisWorkbook.cls, also supply Workbook.cls
    if (mod.filename.toLowerCase() === 'thisworkbook.cls') {
      zip.file('Workbook.cls', mod.code);
    }
    // Also supply standard userform filename variants
    if (mod.filename === 'UserForm_ProfilBengkel.frm') {
      zip.file('Userform_ProfilBengkel.frm', mod.code);
    }
    if (mod.filename === 'UserForm_Penjualan.frm') {
      zip.file('Userform_Penjualan.frm', mod.code);
    }
    if (mod.filename === 'UserForm_Pengeluaran.frm') {
      zip.file('Userform_Pengeluaran.frm', mod.code);
    }
    if (mod.filename === 'UserForm_Pembelian.frm') {
      zip.file('Userform_Pembelian.frm', mod.code);
    }
  });

  // Add Readme / Instructions for Excel VBA
  const readmeContent = `=========================================================================
PANDUAN IMPORT KODE VBA KE MICROSOFT EXCEL (.XLSM)
SISTEM PEMBUKUAN BENGKEL - RYCKO SYSTEM
=========================================================================

Daftar File Modul dalam Arsip ini:
1. Workbook.cls / ThisWorkbook.cls -> Buka VBA Editor (Alt+F11) -> Klik ganda "ThisWorkbook" -> Paste kode.
2. Modul_LaporanKeuangan.bas        -> Menu File -> Import File (Ctrl+M) -> Pilih file ini.
3. Modul_SetupDatabase.bas          -> Menu File -> Import File (Ctrl+M) -> Pilih file ini.
4. Userform_ProfilBengkel.frm       -> Menu File -> Import File (Ctrl+M) -> Pilih file ini.
5. Userform_Penjualan.frm           -> Menu File -> Import File (Ctrl+M) -> Pilih file ini.
6. Userform_Pengeluaran.frm         -> Menu File -> Import File (Ctrl+M) -> Pilih file ini.
7. Userform_Pembelian.frm           -> Menu File -> Import File (Ctrl+M) -> Pilih file ini.
8. Sheet3_Penjualan.cls             -> Klik ganda Sheet "Penjualan" di VBA Project -> Paste kode.
9. Modul_TombolMenu.bas             -> Menu File -> Import File (Ctrl+M) -> Pilih file ini.

Catatan Keamanan:
- Master Key Aktivasi: *#rycko#*
- Simpan file Excel dengan format "Excel Macro-Enabled Workbook (*.xlsm)".
=========================================================================
`;
  zip.file('README_CARA_IMPORT_EXCEL.txt', readmeContent);

  const cleanName = workshopName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `VBA_Bengkel_9_File_${cleanName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadIndividualVbaFile(filename: string, code: string) {
  downloadTextFile(filename, code);
}
