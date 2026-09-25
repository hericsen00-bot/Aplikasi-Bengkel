import React from 'react';
import { 
  BookOpen, 
  Terminal, 
  CheckCircle, 
  Key, 
  Layers, 
  MousePointerClick, 
  ShieldCheck, 
  Save, 
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export const InstallationGuide: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Intro Banner */}
      <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-md border border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-700 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h2 className="text-lg font-bold">
              Panduan Lengkap Pemasangan VBA di Microsoft Excel
            </h2>
            <p className="text-xs text-indigo-200">
              Langkah demi langkah menyusun sistem pembukuan bengkel dari file Excel baru sampai siap pakai.
            </p>
          </div>
        </div>
      </div>

      {/* Step by step cards */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              1
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Simpan File Sebagai Excel Macro-Enabled Workbook (.xlsm)
            </h3>
          </div>
          <p className="text-xs text-slate-600 pl-8">
            Buka Microsoft Excel baru, lalu klik <strong>File &gt; Save As</strong>. Pilih format file: <code className="bg-slate-100 px-1 py-0.5 rounded text-blue-700 font-bold">Excel Macro-Enabled Workbook (*.xlsm)</code>. Ini wajib agar kode VBA tidak terhapus saat file disimpan.
          </p>
        </div>

        {/* Step 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              2
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Buka Visual Basic Editor (VBE)
            </h3>
          </div>
          <p className="text-xs text-slate-600 pl-8">
            Tekan kombinasi tombol <kbd className="bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-800">Alt + F11</kbd> pada keyboard Anda, atau melalui tab menu <strong>Developer &gt; Visual Basic</strong>.
          </p>
        </div>

        {/* Step 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              3
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Pasang Kode Lisensi &amp; Proteksi pada Objek &quot;ThisWorkbook&quot;
            </h3>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-1.5">
            <p>
              Pada jendela <em>Project Explorer</em> di sebelah kiri, klik dua kali pada objek <strong>ThisWorkbook</strong>.
            </p>
            <p>
              Salin dan tempelkan kode dari tab <strong>&quot;ThisWorkbook (Lisensi, Proteksi &amp; Auto-Check)&quot;</strong>. Ini mengaktifkan pemeriksaan lisensi Kode Aktivasi unik <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded font-bold text-amber-900">*#rycko#*</code>, menyembunyikan semua sheet utama via <code>xlSheetVeryHidden</code> jika belum aktif, dan menampilkan hak cipta resmi Rycko System.
            </p>
          </div>
        </div>

        {/* Step 4 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              4
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Buat Standar Module (Module 1, 2, 3) &amp; Sheet Event
            </h3>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-2">
            <p>
              Klik menu <strong>Insert &gt; Module</strong> di VBA Editor:
            </p>
            <ul className="list-disc list-inside space-y-1 font-mono text-[11px] bg-slate-50 p-3 rounded border border-slate-200">
              <li><strong>Module 1:</strong> Tempelkan kode <code>Modul_LaporanKeuangan.bas</code> (Perhitungan rugi laba, bagi hasil &amp; export PDF)</li>
              <li><strong>Module 2:</strong> Tempelkan kode <code>Modul_SetupDatabase.bas</code> (Membuat otomatis 6 sheet dengan kolom Jenis Kendaraan &amp; layout Config)</li>
              <li><strong>Module 3:</strong> Tempelkan kode <code>Modul_TombolMenu.bas</code> (Sub navigasi untuk tombol di sheet)</li>
            </ul>
            <p className="text-[11px] text-slate-700 font-medium">
              💡 <strong>Otomatisasi Ketik Manual (Worksheet_Change):</strong> Di Project Explorer, klik ganda pada <strong>Sheet3 (Penjualan)</strong>, lalu tempelkan kode dari tab <em>&quot;Sheet Event: Auto-Fill Lembar Penjualan&quot;</em>. Kolom Nama Barang, Jenis Kendaraan, dan Harga Jual akan terisi otomatis begitu Anda mengetik Kode Barang di Kolom C!
            </p>
          </div>
        </div>

        {/* Step 5 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              5
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Buat 4 UserForm GUI (Form Input Kasir &amp; Pengelola)
            </h3>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-2">
            <p>
              Klik menu <strong>Insert &gt; UserForm</strong>. Buat 4 UserForm dengan mengubah properti <code>(Name)</code> di panel Properties (F4):
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="font-bold text-emerald-900 font-mono text-[11px]">UserForm_Penjualan</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Tambahkan ComboBox <code>txtKodeBarang</code>, TextBox <code>txtNamaBarang</code>, <code>txtJenisKendaraan</code>, <code>txtHargaJual</code>, <code>txtStokTersedia</code>, <code>txtQty</code>, <code>txtTotal</code>, tombol <code>btnSimpan</code>, <code>btnReset</code>.
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg">
                <div className="font-bold text-teal-900 font-mono text-[11px]">UserForm_Pembelian (Restok)</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Tambahkan ComboBox <code>txtKodeBarang</code>, TextBox <code>txtNamaBarang</code>, <code>txtJenisKendaraan</code>, <code>txtHargaModal</code>, <code>txtQty</code>, <code>txtTotal</code>, tombol <code>btnSimpan</code>, <code>btnReset</code>.
                </div>
              </div>

              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="font-bold text-purple-900 font-mono text-[11px]">UserForm_Pengeluaran</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Tambahkan ComboBox <code>cmbKategori</code>, TextBox <code>txtKeterangan</code>, <code>txtJumlah</code>, dan tombol <code>btnSimpan</code>.
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="font-bold text-blue-900 font-mono text-[11px]">UserForm_ProfilBengkel</div>
                <div className="text-[11px] text-slate-600 mt-1">
                  Tambahkan TextBox <code>txtNamaBengkel</code>, <code>txtAlamat</code>, <code>txtPengelola</code>, <code>txtPctPemilik</code>, <code>txtPctPengelola</code>, dan tombol <code>btnSimpanProfil</code>.
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              *Klik kanan pada masing-masing form &gt; <em>View Code</em>, lalu tempelkan kode VBA yang sudah disediakan di tab &quot;Pusat Kode VBA&quot;.
            </p>
          </div>
        </div>

        {/* Step 6 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              6
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Jalankan Macro Setup Database Otomatis
            </h3>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-1">
            <p>
              Di Excel, tekan <kbd className="bg-slate-200 px-2 py-0.5 rounded font-mono font-bold text-slate-800">Alt + F8</kbd>, pilih macro <strong>SetupStrukturSheetAwal</strong>, lalu klik <strong>Run</strong>.
            </p>
            <p className="text-emerald-700 font-medium">
              Excel akan secara otomatis membuat 6 sheet lengkap dengan header tabel, warna header, lebar kolom, dan tabel Config B1:B10!
            </p>
          </div>
        </div>

        {/* Step 7 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              7
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              Pasang Tombol Menu di Sheet Excel
            </h3>
          </div>
          <div className="pl-8 text-xs text-slate-600 space-y-1.5">
            <p>
              Untuk memudahkan kasir dan pengelola membuka UserForm tanpa masuk ke VBA Editor:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-700">
              <li>Klik menu <strong>Insert &gt; Shapes &gt; Rounded Rectangle</strong> (buat kotak tombol di sheet).</li>
              <li>Beri teks seperti &quot;+ Transaksi Penjualan&quot;, &quot;+ Catat Pengeluaran&quot;, atau &quot;Cetak Laporan&quot;.</li>
              <li>Klik kanan pada Shape tersebut &gt; pilih <strong>Assign Macro...</strong></li>
              <li>Pilih macro yang sesuai: <code>BukaFormPenjualan</code>, <code>BukaFormPengeluaran</code>, <code>BukaFormProfilBengkel</code>, atau <code>CetakLaporanLangsung</code>.</li>
            </ol>
          </div>
        </div>

        {/* Step 8 - 3-Tier Security & VBA Protection */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border-2 border-amber-300 shadow-md space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-amber-600 text-white font-black text-sm flex items-center justify-center shadow">
              8
            </span>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
              <h3 className="font-extrabold text-base text-amber-950">
                LANGKAH WAJIB SEBELUM MEMBAGIKAN FILE: 3 Tingkat Proteksi &amp; Kunci VBA
              </h3>
            </div>
          </div>

          <div className="pl-9 space-y-4 text-xs text-slate-700">
            <p className="leading-relaxed font-medium">
              Agar sistem VBA ini aman saat dibagikan ke komputer lain, tidak bisa dibajak, tetap memiliki hak cipta/branding Anda, dan mewajibkan kode aktivasi <code className="font-mono bg-amber-200 px-1.5 py-0.5 rounded font-bold text-amber-900">*#rycko#*</code>, ikuti 3 tingkatan proteksi berikut:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-xs space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                  Tingkat 1
                </span>
                <h4 className="font-bold text-slate-900 text-xs">Marking Hak Cipta &amp; Watermark</h4>
                <p className="text-[11px] text-slate-600 leading-normal">
                  - <strong>UserForm:</strong> Label footer <code className="text-slate-800 font-semibold">&quot;Developer &amp; System Owner: Rycko Computer / IT Solution&quot;</code>.<br />
                  - <strong>Laporan Cetak:</strong> Footer otomatis <code className="text-slate-800 font-semibold">&quot;System Developed by Rycko | Licensed Material&quot;</code>.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-xs space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                  Tingkat 2
                </span>
                <h4 className="font-bold text-slate-900 text-xs">Aktivasi Unik &amp; xlSheetVeryHidden</h4>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Jika status belum <strong>ACTIVE</strong>, makro otomatis menyembunyikan sheet utama via <code className="text-amber-800 font-bold">xlSheetVeryHidden</code>. Pengguna tidak bisa klik kanan Unhide biasa. Hanya kunci <code className="text-amber-800 font-bold font-mono">*#rycko#*</code> yang membuka akses.
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-lg border border-amber-200 shadow-xs space-y-1.5">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                  Tingkat 3
                </span>
                <h4 className="font-bold text-slate-900 text-xs">Kunci Password Kode Sumber (VBE)</h4>
                <p className="text-[11px] text-slate-600 leading-normal">
                  Mencegah orang lain membongkar kode VBA untuk melihat password atau menghapus lisensi Anda.
                </p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-amber-200 space-y-2">
              <h4 className="font-bold text-xs text-amber-900 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-600" />
                <span>Panduan Praktis Mengunci VBAProject (Anti-Bongkar):</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-700">
                <li>Buka VBA Editor (<kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">Alt + F11</kbd>).</li>
                <li>Klik menu <strong>Tools &gt; VBAProject Properties...</strong></li>
                <li>Pilih tab <strong>Protection</strong> di jendela dialog.</li>
                <li>Centang kotak pilihan <strong>&quot;Lock project for viewing&quot;</strong>.</li>
                <li>Ketikkan kata sandi rahasia Anda pada kolom <strong>Password</strong> dan <strong>Confirm password</strong> (simpan password ini di catatan pribadi Anda).</li>
                <li>Klik <strong>OK</strong>.</li>
                <li>Kembali ke Excel, pada sheet <strong>Config</strong>, ubah sel <strong>B2</strong> menjadi <code className="font-mono bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded">LOCKED</code> (agar meminta aktivasi saat dibuka pertama kali).</li>
                <li>Simpan file (<kbd className="bg-slate-100 px-1.5 py-0.5 rounded font-mono font-bold">Ctrl + S</kbd>) lalu tutup file Excel.</li>
              </ol>
            </div>

            <div className="p-3 bg-amber-100/70 rounded-lg border border-amber-300 text-[11px] text-amber-900">
              <strong>Hasil Akhir:</strong> Saat file <code>.xlsm</code> dibuka di komputer klien, spreadsheet terkunci total dan otomatis menampilkan kotak dialog aktivasi resmi. Kode sumber Anda aman terlindungi kata sandi, tidak ada yang bisa melihat logika internal tanpa izin Anda!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
