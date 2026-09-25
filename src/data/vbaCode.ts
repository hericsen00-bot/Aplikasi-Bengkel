import { VbaModule } from '../types';

export const vbaModules: VbaModule[] = [
{
    id: 'thisworkbook',
    title: '1. Workbook.cls (Lisensi, Proteksi & Auto-Check)',
    type: 'Workbook',
    filename: 'Workbook.cls',
    description: 'Pemeriksaan status lisensi saat file dibuka (Workbook_Open). Mengunci seluruh sheet dengan xlSheetVeryHidden jika belum aktif dan memvalidasi Master Key "*#rycko#*".',
    code: `' =========================================================================
' NAMA OBJEK : ThisWorkbook
' DESKRIPSI  : 3-Tier Security: Lisensi, Proteksi Sheet & Hak Cipta Rycko
' DEVELOPER  : Rycko Computer / IT Solution
' MASTER KEY : *#rycko#*
' =========================================================================
Option Explicit

Private Sub Workbook_Open()
    Dim StatusAktivasi As String
    Dim KeyInput As String
    Const MasterKey As String = "*#rycko#*" ' Kunci Aktivasi Khusus Rycko
    Dim wsConfig As Worksheet
    
    ' Tangani jika sheet Config belum ada
    On Error Resume Next
    Set wsConfig = ThisWorkbook.Sheets("Config")
    On Error GoTo 0
    
    If wsConfig Is Nothing Then
        Call SetupStrukturSheetAwal
        Set wsConfig = ThisWorkbook.Sheets("Config")
    End If
    
    On Error Resume Next
    StatusAktivasi = UCase(Trim(Sheets("Config").Range("B2").Value))
    On Error GoTo 0
    
    ' Jika file belum diaktifkan di komputer ini
    If StatusAktivasi <> "ACTIVE" Then
        ' Sembunyikan semua sheet utama demi keamanan
        Call SembunyikanSheet
        
        MsgBox "Aplikasi ini dilindungi Hak Cipta [Rycko System]." & vbCrLf & _
               "Developer & System Owner: Rycko Computer / IT Solution" & vbCrLf & vbCrLf & _
               "Untuk penggunaan di komputer ini, diperlukan Kode Aktivasi Resmi.", _
               vbInformation, "Lisensi Aplikasi - Rycko System"
        
        KeyInput = InputBox("Masukkan Kode Aktivasi Resmi dari Pengembang:", "Aktivasi Aplikasi")
        
        If KeyInput = MasterKey Then
            ' Jika Kunci Benar
            Sheets("Config").Range("B2").Value = "ACTIVE"
            Sheets("Config").Range("B3").Value = MasterKey
            Call TampilkanSheet
            
            MsgBox "Aktivasi Berhasil!" & vbCrLf & _
                   "Terima kasih telah menggunakan sistem resmi Rycko." & vbCrLf & _
                   "Selamat datang di Sistem Pembukuan " & Sheets("Config").Range("B4").Value, _
                   vbInformation, "Aktivasi Sukses"
            ThisWorkbook.Save
        Else
            ' Jika Kunci Salah
            MsgBox "Kode Aktivasi SALAH / UNVALID!" & vbCrLf & _
                   "Akses ditolak. Hubungi pengembang untuk mendapatkan kode aktivasi resmi." & vbCrLf & _
                   "Kontak: Rycko Computer / IT Solution", _
                   vbCritical, "Akses Ditolak"
            ThisWorkbook.Close SaveChanges:=False
        End If
    Else
        ' Jika sudah Aktif, pastikan seluruh sheet terlihat
        Call TampilkanSheet
    End If
    
    ' Arahkan fokus ke sheet Penjualan
    On Error Resume Next
    ThisWorkbook.Sheets("Penjualan").Activate
    On Error GoTo 0
End Sub

' Menyembunyikan semua sheet kecuali Config secara total (tidak bisa di-unhide via UI biasa)
Sub SembunyikanSheet()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If ws.Name <> "Config" Then
            ws.Visible = xlSheetVeryHidden ' Sembunyikan total
        End If
    Next ws
End Sub

' Menampilkan kembali semua sheet yang telah terverifikasi
Sub TampilkanSheet()
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        ws.Visible = xlSheetVisible
    Next ws
End Sub
`
  },
{
    id: 'modul_laporan',
    title: '2. Modul_LaporanKeuangan.bas (Laporan & Print PDF)',
    type: 'Module',
    filename: 'Modul_LaporanKeuangan.bas',
    description: 'Perhitungan omset, HPP, laba kotor, beban operasional, laba bersih, bagi hasil % pemilik & % pengelola, layout printout, dan export PDF.',
    code: `' =========================================================================
' NAMA MODUL : Modul_LaporanKeuangan
' DESKRIPSI  : Generator Laporan Rugi Laba, Bagi Hasil Keuntungan & Export PDF
' =========================================================================
Option Explicit

Sub GenerateLaporanKeuanganAndPrint()
    Dim wsPenjualan As Worksheet
    Dim wsPengeluaran As Worksheet
    Dim wsConfig As Worksheet
    Dim wsLaporan As Worksheet
    Dim lastRowPenjualan As Long
    Dim lastRowPengeluaran As Long
    
    Dim totalPenjualan As Double
    Dim totalHPP As Double
    Dim labaKotor As Double
    Dim totalPengeluaran As Double
    Dim labaBersih As Double
    
    Dim pctPemilik As Double
    Dim pctPengelola As Double
    Dim nominalPemilik As Double
    Dim nominalPengelola As Double
    
    Dim namaBengkel As String
    Dim alamatBengkel As String
    Dim namaPengelola As String
    Dim namaPemilik As String
    Dim kotaBengkel As String
    
    ' Validasi keberadaan sheet
    Set wsPenjualan = ThisWorkbook.Sheets("Penjualan")
    Set wsPengeluaran = ThisWorkbook.Sheets("Pengeluaran")
    Set wsConfig = ThisWorkbook.Sheets("Config")
    
    ' Ambil atau buat sheet Laporan_Keuangan
    On Error Resume Next
    Set wsLaporan = ThisWorkbook.Sheets("Laporan_Keuangan")
    If wsLaporan Is Nothing Then
        Set wsLaporan = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        wsLaporan.Name = "Laporan_Keuangan"
    End If
    On Error GoTo 0
    
    ' 1. BACA DATA PROFIL & PERSENTASE DARI SHEET CONFIG
    namaBengkel = wsConfig.Range("B4").Value
    alamatBengkel = wsConfig.Range("B5").Value
    namaPengelola = wsConfig.Range("B6").Value
    pctPemilik = CDbl(wsConfig.Range("B7").Value)       ' Contoh: 0.60 atau 60
    If pctPemilik > 1 Then pctPemilik = pctPemilik / 100
    
    pctPengelola = CDbl(wsConfig.Range("B8").Value)     ' Contoh: 0.40 atau 40
    If pctPengelola > 1 Then pctPengelola = pctPengelola / 100
    
    namaPemilik = wsConfig.Range("B9").Value
    If Trim(namaPemilik) = "" Then namaPemilik = "Pemilik Modal / Investor"
    kotaBengkel = wsConfig.Range("B10").Value
    If Trim(kotaBengkel) = "" Then kotaBengkel = "Bekasi"
    
    ' 2. HITUNG TOTAL PENJUALAN & TOTAL HPP DARI SHEET PENJUALAN
    ' Kolom Penjualan: [A]No_Trans, [B]Tgl, [C]Kode, [D]Nama, [E]Jenis_Kendaraan, [F]Qty, [G]Harga_Jual_Part, [H]Total_Part, [I]Harga_Jasa, [J]Total_Penjualan, [K]Total_HPP, [L]Laba_Kotor
    Dim totalPart As Double
    Dim totalJasa As Double
    
    lastRowPenjualan = wsPenjualan.Cells(wsPenjualan.Rows.Count, "A").End(xlUp).Row
    If lastRowPenjualan >= 2 Then
        totalPart = Application.WorksheetFunction.Sum(wsPenjualan.Range("H2:H" & lastRowPenjualan))
        totalJasa = Application.WorksheetFunction.Sum(wsPenjualan.Range("I2:I" & lastRowPenjualan))
        totalPenjualan = Application.WorksheetFunction.Sum(wsPenjualan.Range("J2:J" & lastRowPenjualan))
        totalHPP = Application.WorksheetFunction.Sum(wsPenjualan.Range("K2:K" & lastRowPenjualan))
    Else
        totalPart = 0
        totalJasa = 0
        totalPenjualan = 0
        totalHPP = 0
    End If
    labaKotor = totalPenjualan - totalHPP
    
    ' 3. HITUNG TOTAL PENGELUARAN OPERASIONAL
    lastRowPengeluaran = wsPengeluaran.Cells(wsPengeluaran.Rows.Count, "A").End(xlUp).Row
    If lastRowPengeluaran >= 2 Then
        totalPengeluaran = Application.WorksheetFunction.Sum(wsPengeluaran.Range("E2:E" & lastRowPengeluaran))
    Else
        totalPengeluaran = 0
    End If
    
    ' 4. HITUNG LABA BERSIH & BAGI HASIL
    labaBersih = labaKotor - totalPengeluaran
    nominalPemilik = labaBersih * pctPemilik
    nominalPengelola = labaBersih * pctPengelola
    
    ' 5. BUAT TAMPILAN FORMAT PRINTOUT DI SHEET LAPORAN_KEUANGAN
    Application.ScreenUpdating = False
    wsLaporan.Cells.Clear
    
    ' Set Font default
    With wsLaporan.Cells.Font
        .Name = "Calibri"
        .Size = 11
    End With
    
    ' Lebar Kolom
    wsLaporan.Columns("A").ColumnWidth = 5
    wsLaporan.Columns("B").ColumnWidth = 38
    wsLaporan.Columns("C").ColumnWidth = 4
    wsLaporan.Columns("D").ColumnWidth = 25
    wsLaporan.Columns("E").ColumnWidth = 5
    
    ' HEADER BENGKEL
    wsLaporan.Range("B2:D2").Merge
    wsLaporan.Range("B2").Value = UCase(namaBengkel)
    wsLaporan.Range("B2").Font.Size = 16
    wsLaporan.Range("B2").Font.Bold = True
    wsLaporan.Range("B2").HorizontalAlignment = xlCenter
    
    wsLaporan.Range("B3:D3").Merge
    wsLaporan.Range("B3").Value = alamatBengkel
    wsLaporan.Range("B3").Font.Size = 10
    wsLaporan.Range("B3").Font.Italic = True
    wsLaporan.Range("B3").HorizontalAlignment = xlCenter
    
    wsLaporan.Range("B4:D4").Merge
    wsLaporan.Range("B4").Value = "Pengelola: " & namaPengelola
    wsLaporan.Range("B4").Font.Size = 10
    wsLaporan.Range("B4").HorizontalAlignment = xlCenter
    
    ' Garis Pembatas Header
    wsLaporan.Range("B5:D5").Borders(xlEdgeBottom).LineStyle = xlDouble
    wsLaporan.Range("B5:D5").Borders(xlEdgeBottom).Weight = xlThick
    
    ' JUDUL LAPORAN
    wsLaporan.Range("B6:D6").Merge
    wsLaporan.Range("B6").Value = "LAPORAN RUGI LABA & BAGI HASIL"
    wsLaporan.Range("B6").Font.Size = 13
    wsLaporan.Range("B6").Font.Bold = True
    wsLaporan.Range("B6").HorizontalAlignment = xlCenter
    
    wsLaporan.Range("B7:D7").Merge
    wsLaporan.Range("B7").Value = "Periode Transaksi s/d " & Format(Date, "dd mmmm yyyy")
    wsLaporan.Range("B7").Font.Size = 10
    wsLaporan.Range("B7").HorizontalAlignment = xlCenter
    
    wsLaporan.Range("B8:D8").Borders(xlEdgeBottom).LineStyle = xlContinuous
    
    ' TABEL 1: REKAPITULASI RUGI LABA
    wsLaporan.Range("B10").Value = "1. Pendapatan Penjualan Total (Part + Jasa)"
    wsLaporan.Range("B10").Font.Bold = True
    wsLaporan.Range("C10").Value = ":"
    wsLaporan.Range("D10").Value = totalPenjualan
    wsLaporan.Range("D10").Font.Bold = True
    wsLaporan.Range("D10").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B11").Value = "   - Penjualan Sparepart (Part)"
    wsLaporan.Range("C11").Value = ":"
    wsLaporan.Range("D11").Value = totalPart
    wsLaporan.Range("D11").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B12").Value = "   - Pendapatan Biaya Jasa (Margin 100%)"
    wsLaporan.Range("C12").Value = ":"
    wsLaporan.Range("D12").Value = totalJasa
    wsLaporan.Range("D12").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B13").Value = "2. Total HPP (Hanya Modal Sparepart)"
    wsLaporan.Range("C13").Value = ":"
    wsLaporan.Range("D13").Value = totalHPP
    wsLaporan.Range("D13").NumberFormat = """Rp ""#,##0"
    
    ' Garis Pengurangan
    wsLaporan.Range("B14:D14").Borders(xlEdgeBottom).LineStyle = xlContinuous
    wsLaporan.Range("D14").Value = "(-)"
    wsLaporan.Range("D14").HorizontalAlignment = xlRight
    
    wsLaporan.Range("B15").Value = "   LABA KOTOR (GROSS PROFIT)"
    wsLaporan.Range("B15").Font.Bold = True
    wsLaporan.Range("C15").Value = ":"
    wsLaporan.Range("D15").Value = labaKotor
    wsLaporan.Range("D15").Font.Bold = True
    wsLaporan.Range("D15").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B17").Value = "3. Total Beban / Pengeluaran Operasional"
    wsLaporan.Range("C17").Value = ":"
    wsLaporan.Range("D17").Value = totalPengeluaran
    wsLaporan.Range("D17").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B18:D18").Borders(xlEdgeBottom).LineStyle = xlContinuous
    wsLaporan.Range("D18").Value = "(-)"
    wsLaporan.Range("D18").HorizontalAlignment = xlRight
    
    wsLaporan.Range("B19").Value = "   LABA BERSIH (NET PROFIT)"
    wsLaporan.Range("B19").Font.Bold = True
    wsLaporan.Range("B19").Interior.Color = RGB(235, 245, 255)
    wsLaporan.Range("C19").Value = ":"
    wsLaporan.Range("D19").Value = labaBersih
    wsLaporan.Range("D19").Font.Bold = True
    wsLaporan.Range("D19").Interior.Color = RGB(235, 245, 255)
    wsLaporan.Range("D19").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B20:D20").Borders(xlEdgeBottom).LineStyle = xlDouble
    
    ' TABEL 2: RINCIAN BAGI HASIL KEUNTUNGAN
    wsLaporan.Range("B22").Value = "RINCIAN BAGI HASIL KEUNTUNGAN:"
    wsLaporan.Range("B22").Font.Bold = True
    
    wsLaporan.Range("B23").Value = "- Bagian Pemilik Modal (" & Format(pctPemilik, "0%") & ")"
    wsLaporan.Range("C23").Value = ":"
    wsLaporan.Range("D23").Value = nominalPemilik
    wsLaporan.Range("D23").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B24").Value = "- Bagian Pengelola (" & Format(pctPengelola, "0%") & ")"
    wsLaporan.Range("C24").Value = ":"
    wsLaporan.Range("D24").Value = nominalPengelola
    wsLaporan.Range("D24").NumberFormat = """Rp ""#,##0"
    
    wsLaporan.Range("B25:D25").Borders(xlEdgeBottom).LineStyle = xlContinuous
    
    wsLaporan.Range("B26").Value = "TOTAL BAGI HASIL (100%)"
    wsLaporan.Range("B26").Font.Bold = True
    wsLaporan.Range("C26").Value = ":"
    wsLaporan.Range("D26").Value = (nominalPemilik + nominalPengelola)
    wsLaporan.Range("D26").Font.Bold = True
    wsLaporan.Range("D26").NumberFormat = """Rp ""#,##0"
    
    ' FOOTER / TANDA TANGAN PERSETUJUAN
    Dim rowTTD As Long
    rowTTD = 29
    
    wsLaporan.Cells(rowTTD, "D").Value = kotaBengkel & ", " & Format(Date, "dd mmmm yyyy")
    wsLaporan.Cells(rowTTD, "D").HorizontalAlignment = xlCenter
    
    wsLaporan.Cells(rowTTD + 1, "B").Value = "Disetujui Oleh (Pemilik),"
    wsLaporan.Cells(rowTTD + 1, "B").HorizontalAlignment = xlCenter
    
    wsLaporan.Cells(rowTTD + 1, "D").Value = "Dibuat Oleh (Pengelola),"
    wsLaporan.Cells(rowTTD + 1, "D").HorizontalAlignment = xlCenter
    
    ' Ruang Tanda Tangan
    wsLaporan.Cells(rowTTD + 5, "B").Value = "( " & namaPemilik & " )"
    wsLaporan.Cells(rowTTD + 5, "B").Font.Bold = True
    wsLaporan.Cells(rowTTD + 5, "B").HorizontalAlignment = xlCenter
    
    wsLaporan.Cells(rowTTD + 5, "D").Value = "( " & namaPengelola & " )"
    wsLaporan.Cells(rowTTD + 5, "D").Font.Bold = True
    wsLaporan.Cells(rowTTD + 5, "D").HorizontalAlignment = xlCenter
    
    ' Marking Hak Cipta & Watermark Footer di Lembar Cetak
    wsLaporan.Range("B" & (rowTTD + 7) & ":D" & (rowTTD + 7)).Merge
    wsLaporan.Range("B" & (rowTTD + 7)).Value = "System Developed by Rycko | Licensed Material"
    wsLaporan.Range("B" & (rowTTD + 7)).Font.Size = 9
    wsLaporan.Range("B" & (rowTTD + 7)).Font.Italic = True
    wsLaporan.Range("B" & (rowTTD + 7)).Font.Color = RGB(128, 128, 128)
    wsLaporan.Range("B" & (rowTTD + 7)).HorizontalAlignment = xlCenter
    
    Application.ScreenUpdating = True
    wsLaporan.Activate
    
    ' Langsung jalankan cetak / preview PDF
    Call CetakLaporanPDF
End Sub

Sub CetakLaporanPDF()
    Dim wsLaporan As Worksheet
    Dim namaFilePDF As String
    Dim pathFolder As String
    
    Set wsLaporan = ThisWorkbook.Sheets("Laporan_Keuangan")
    
    ' Pengaturan Halaman Siap Cetak A4 Portrait Fit 1 Page + Footer Lisensi
    With wsLaporan.PageSetup
        .Orientation = xlPortrait
        .PaperSize = xlPaperA4
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = 1
        .PrintGridlines = False
        .CenterHorizontally = True
        .TopMargin = Application.InchesToPoints(0.5)
        .BottomMargin = Application.InchesToPoints(0.5)
        .LeftMargin = Application.InchesToPoints(0.5)
        .RightMargin = Application.InchesToPoints(0.5)
        .CenterFooter = "System Developed by Rycko | Licensed Material"
    End With
    
    pathFolder = ThisWorkbook.Path
    If pathFolder = "" Then pathFolder = Environ("USERPROFILE") & "\Documents"
    
    namaFilePDF = pathFolder & "\Laporan_Keuangan_Bengkel_" & Format(Date, "yyyymmdd") & ".pdf"
    
    On Error Resume Next
    wsLaporan.ExportAsFixedFormat _
        Type:=xlTypePDF, _
        Filename:=namaFilePDF, _
        Quality:=xlQualityStandard, _
        IncludeDocProperties:=True, _
        IgnorePrintAreas:=False, _
        OpenAfterPublish:=True
        
    If Err.Number = 0 Then
        MsgBox "Laporan Keuangan & Bagi Hasil Berhasil Dicetak ke PDF!" & vbCrLf & _
               "Lokasi File: " & namaFilePDF, vbInformation, "Cetak PDF Berhasil"
    Else
        ' Jika export PDF gagal (misal file sedang dibuka), gunakan PrintPreview
        wsLaporan.PrintPreview
    End If
    On Error GoTo 0
End Sub
`
  },
{
    id: 'modul_setup',
    title: '3. Modul_SetupDatabase.bas (Setup Database & Sheet)',
    type: 'Module',
    filename: 'Modul_SetupDatabase.bas',
    description: 'Macro untuk membuat 6 sheet secara otomatis dengan header, format border, lebar kolom, dan formula default.',
    code: `' =========================================================================
' NAMA MODUL : Modul_SetupDatabase
' DESKRIPSI  : Otomatisasi Pembuatan 6 Sheet, Format Tabel & Layout Config
' =========================================================================
Option Explicit

Sub SetupStrukturSheetAwal()
    Dim wb As Workbook
    Dim ws As Worksheet
    Dim arrSheets As Variant
    Dim sheetName As Variant
    
    Set wb = ThisWorkbook
    Application.ScreenUpdating = False
    
    ' Daftar 6 Sheet Utama
    arrSheets = Array("Database_Barang", "Pembelian", "Penjualan", "Pengeluaran", "Laporan_Keuangan", "Config")
    
    ' Buat sheet jika belum ada
    For Each sheetName In arrSheets
        On Error Resume Next
        Set ws = wb.Sheets(CStr(sheetName))
        On Error GoTo 0
        If ws Is Nothing Then
            Set ws = wb.Sheets.Add(After:=wb.Sheets(wb.Sheets.Count))
            ws.Name = CStr(sheetName)
        End If
        Set ws = Nothing
    Next sheetName
    
    ' 1. SETUP SHEET CONFIG (Layout Sesuai Permintaan)
    With wb.Sheets("Config")
        .Cells.Clear
        .Range("A1:C1").Merge
        .Range("A1").Value = "PENGATURAN IDENTITAS BENGKEL & LISENSI ADMIN"
        .Range("A1").Font.Bold = True
        .Range("A1").Interior.Color = RGB(220, 230, 242)
        
        .Range("A2").Value = "Status Lisensi"
        .Range("B2").Value = "ACTIVE"       ' Nilai: ACTIVE / LOCKED
        .Range("A3").Value = "Master Key Admin"
        .Range("B3").Value = "*#rycko#*"
        
        .Range("A4").Value = "Nama Bengkel"
        .Range("B4").Value = "BENGKEL MAJU JAYA"
        
        .Range("A5").Value = "Alamat Bengkel"
        .Range("B5").Value = "Jl. Raya Industri No. 123, Bekasi"
        
        .Range("A6").Value = "Nama Pengelola"
        .Range("B6").Value = "Bp. Ahmad Pengelola"
        
        .Range("A7").Value = "Bagi Hasil Pemilik (%)"
        .Range("B7").Value = 0.60
        .Range("B7").NumberFormat = "0%"
        
        .Range("A8").Value = "Bagi Hasil Pengelola (%)"
        .Range("B8").Value = 0.40
        .Range("B8").NumberFormat = "0%"
        
        .Range("A9").Value = "Nama Pemilik Modal"
        .Range("B9").Value = "Bp. Hendra Pemilik Modal"
        
        .Range("A10").Value = "Kota Domisili"
        .Range("B10").Value = "Bekasi"
        
        .Columns("A").ColumnWidth = 28
        .Columns("B").ColumnWidth = 40
        .Range("A2:B10").Borders.LineStyle = xlContinuous
    End With
    
    ' 2. SETUP SHEET DATABASE_BARANG
    With wb.Sheets("Database_Barang")
        .Range("A1:H1").Value = Array("Kode_Barang", "Nama_Barang", "Jenis_Kendaraan", "Harga_Modal", "Harga_Jual", "Stok_Saat_Ini", "Minimal_Stok", "Status_Stok")
        .Range("A1:H1").Font.Bold = True
        .Range("A1:H1").Interior.Color = RGB(70, 130, 180)
        .Range("A1:H1").Font.Color = RGB(255, 255, 255)
        .Columns("A").ColumnWidth = 14
        .Columns("B").ColumnWidth = 32
        .Columns("C").ColumnWidth = 20
        .Columns("D").ColumnWidth = 16
        .Columns("E").ColumnWidth = 16
        .Columns("F").ColumnWidth = 14
        .Columns("G").ColumnWidth = 14
        .Columns("H").ColumnWidth = 26
    End With
    
    ' 3. SETUP SHEET PEMBELIAN
    With wb.Sheets("Pembelian")
        .Range("A1:H1").Value = Array("No_Transaksi", "Tanggal", "Kode_Barang", "Nama_Barang", "Jenis_Kendaraan", "Qty", "Harga_Modal", "Total_Harga")
        .Range("A1:H1").Font.Bold = True
        .Range("A1:H1").Interior.Color = RGB(46, 139, 87)
        .Range("A1:H1").Font.Color = RGB(255, 255, 255)
        .Columns("A").ColumnWidth = 18
        .Columns("B").ColumnWidth = 14
        .Columns("C").ColumnWidth = 14
        .Columns("D").ColumnWidth = 32
        .Columns("E").ColumnWidth = 20
        .Columns("F").ColumnWidth = 10
        .Columns("G").ColumnWidth = 16
        .Columns("H").ColumnWidth = 18
    End With
    
    ' 4. SETUP SHEET PENJUALAN
    With wb.Sheets("Penjualan")
        .Range("A1:L1").Value = Array("No_Transaksi", "Tanggal", "Kode_Barang", "Nama_Barang", "Jenis_Kendaraan", "Qty", "Harga_Jual_Part", "Total_Part", "Harga_Jasa", "Total_Penjualan", "Total_HPP", "Laba_Kotor")
        .Range("A1:L1").Font.Bold = True
        .Range("A1:L1").Interior.Color = RGB(205, 92, 92)
        .Range("A1:L1").Font.Color = RGB(255, 255, 255)
        .Columns("A").ColumnWidth = 18
        .Columns("B").ColumnWidth = 14
        .Columns("C").ColumnWidth = 14
        .Columns("D").ColumnWidth = 30
        .Columns("E").ColumnWidth = 18
        .Columns("F").ColumnWidth = 8
        .Columns("G").ColumnWidth = 16
        .Columns("H").ColumnWidth = 16
        .Columns("I").ColumnWidth = 16
        .Columns("J").ColumnWidth = 18
        .Columns("K").ColumnWidth = 16
        .Columns("L").ColumnWidth = 18
    End With
    
    ' 5. SETUP SHEET PENGELUARAN
    With wb.Sheets("Pengeluaran")
        .Range("A1:E1").Value = Array("No_Transaksi", "Tanggal", "Kategori", "Keterangan", "Jumlah_Pengeluaran")
        .Range("A1:E1").Font.Bold = True
        .Range("A1:E1").Interior.Color = RGB(138, 43, 226)
        .Range("A1:E1").Font.Color = RGB(255, 255, 255)
        .Columns("A").ColumnWidth = 18
        .Columns("B").ColumnWidth = 14
        .Columns("C").ColumnWidth = 20
        .Columns("D").ColumnWidth = 38
        .Columns("E").ColumnWidth = 20
    End With
    
    Application.ScreenUpdating = True
    MsgBox "Setup Struktur 6 Sheet dan Tabel Pembukuan Bengkel Berhasil!" & vbCrLf & _
           "Kolom [Jenis_Kendaraan] & [Harga_Jasa] telah disematkan pada sheet dan formula siap digunakan.", vbInformation, "Setup Selesai"
End Sub
`
  },
{
    id: 'userform_profil',
    title: '4. Userform_ProfilBengkel.frm (Profil Bengkel & Bagi Hasil)',
    type: 'UserForm',
    filename: 'Userform_ProfilBengkel.frm',
    description: 'Form pengaturan identitas bengkel (nama, alamat, pengelola) dan persentase bagi hasil pemilik & pengelola ke Sheet Config B4:B8.',
    formControls: [
      { controlName: 'txtNamaBengkel', controlType: 'TextBox', captionOrLabel: 'Nama Usaha Bengkel', description: 'Menyimpan nama bengkel ke Config B4' },
      { controlName: 'txtAlamat', controlType: 'TextBox (Multiline)', captionOrLabel: 'Alamat Lengkap Bengkel', description: 'Menyimpan alamat ke Config B5' },
      { controlName: 'txtPengelola', controlType: 'TextBox', captionOrLabel: 'Nama Pengelola / Penanggung Jawab', description: 'Menyimpan nama pengelola ke Config B6' },
      { controlName: 'txtPctPemilik', controlType: 'TextBox', captionOrLabel: 'Bagi Hasil Pemilik (%)', description: 'Menyimpan % investor (misal 60) ke Config B7' },
      { controlName: 'txtPctPengelola', controlType: 'TextBox', captionOrLabel: 'Bagi Hasil Pengelola (%)', description: 'Menyimpan % pengelola (misal 40) ke Config B8' },
      { controlName: 'btnSimpanProfil', controlType: 'CommandButton', captionOrLabel: 'Simpan Profil & Pengaturan', description: 'Validasi total persentase = 100% dan simpan' },
      { controlName: 'btnTutup', controlType: 'CommandButton', captionOrLabel: 'Tutup', description: 'Menutup form' },
      { controlName: 'lblCopyright', controlType: 'Label (Footer)', captionOrLabel: 'Developer & System Owner: Rycko Computer / IT Solution', description: 'Marking hak cipta resmi di bagian bawah UserForm' },
    ],
    code: `' =========================================================================
' FORM        : UserForm_ProfilBengkel
' KONTROL     : txtNamaBengkel, txtAlamat, txtPengelola, txtPctPemilik,
'               txtPctPengelola, btnSimpanProfil, btnTutup
' =========================================================================
Option Explicit

Private Sub UserForm_Initialize()
    Dim wsConfig As Worksheet
    Set wsConfig = ThisWorkbook.Sheets("Config")
    
    ' Muat data tersimpan saat UserForm dibuka
    On Error Resume Next
    Me.txtNamaBengkel.Value = wsConfig.Range("B4").Value
    Me.txtAlamat.Value = wsConfig.Range("B5").Value
    Me.txtPengelola.Value = wsConfig.Range("B6").Value
    
    ' Format persentase ke angka bulat (misal 60%)
    Dim pPemilik As Double, pPengelola As Double
    pPemilik = CDbl(wsConfig.Range("B7").Value)
    If pPemilik <= 1 And pPemilik > 0 Then pPemilik = pPemilik * 100
    Me.txtPctPemilik.Value = pPemilik
    
    pPengelola = CDbl(wsConfig.Range("B8").Value)
    If pPengelola <= 1 And pPengelola > 0 Then pPengelola = pPengelola * 100
    Me.txtPctPengelola.Value = pPengelola
    On Error GoTo 0
End Sub

Private Sub btnSimpanProfil_Click()
    Dim wsConfig As Worksheet
    Dim pct1 As Double, pct2 As Double
    
    Set wsConfig = ThisWorkbook.Sheets("Config")
    
    ' Validasi Input Wajib Diisi
    If Trim(Me.txtNamaBengkel.Value) = "" Then
        MsgBox "Nama Bengkel wajib diisi!", vbExclamation, "Validasi Gagal"
        Me.txtNamaBengkel.SetFocus
        Exit Sub
    End If
    
    If Trim(Me.txtAlamat.Value) = "" Then
        MsgBox "Alamat Bengkel wajib diisi!", vbExclamation, "Validasi Gagal"
        Me.txtAlamat.SetFocus
        Exit Sub
    End If
    
    If Trim(Me.txtPengelola.Value) = "" Then
        MsgBox "Nama Pengelola / Penanggung Jawab wajib diisi!", vbExclamation, "Validasi Gagal"
        Me.txtPengelola.SetFocus
        Exit Sub
    End If
    
    ' Validasi Angka Persentase
    If Not IsNumeric(Me.txtPctPemilik.Value) Or Not IsNumeric(Me.txtPctPengelola.Value) Then
        MsgBox "Persentase bagi hasil harus berupa angka valid!", vbExclamation, "Validasi Gagal"
        Exit Sub
    End If
    
    pct1 = CDbl(Me.txtPctPemilik.Value)
    pct2 = CDbl(Me.txtPctPengelola.Value)
    
    If (pct1 + pct2) <> 100 Then
        If MsgBox("Total persentase Pemilik (" & pct1 & "%) + Pengelola (" & pct2 & "%) = " & (pct1 + pct2) & "%." & vbCrLf & _
                  "Total tidak sama dengan 100%. Apakah tetap ingin menyimpan?", _
                  vbYesNo + vbQuestion, "Konfirmasi Persentase") = vbNo Then
            Exit Sub
        End If
    End If
    
    ' Simpan ke Sheet Config
    With wsConfig
        .Range("B4").Value = Trim(Me.txtNamaBengkel.Value)
        .Range("B5").Value = Trim(Me.txtAlamat.Value)
        .Range("B6").Value = Trim(Me.txtPengelola.Value)
        .Range("B7").Value = pct1 / 100
        .Range("B8").Value = pct2 / 100
    End With
    
    ThisWorkbook.Save
    MsgBox "Identitas Bengkel & Pengaturan Bagi Hasil Berhasil Disimpan!", vbInformation, "Sukses"
    Unload Me
End Sub

Private Sub btnTutup_Click()
    Unload Me
End Sub
`
  },
{
    id: 'userform_penjualan',
    title: '5. Userform_Penjualan.frm (Penjualan Sparepart & Jasa Kasir)',
    type: 'UserForm',
    filename: 'Userform_Penjualan.frm',
    description: 'Pencarian kode barang otomatis, auto-fill Nama Barang & Jenis Kendaraan, ambil harga jual read-only, input biaya jasa bengkel, hitung total part + jasa otomatis, potong stok di Database_Barang, dan perbarui reminder stok.',
    formControls: [
      { controlName: 'txtKodeBarang', controlType: 'ComboBox / TextBox', captionOrLabel: 'Pilih / Cari Kode Barang', description: 'Dropdown kode barang terdaftar' },
      { controlName: 'txtNamaBarang', controlType: 'TextBox (Locked)', captionOrLabel: 'Nama Barang', description: 'Otomatis terisi dari Database_Barang (Kolom B)' },
      { controlName: 'txtJenisKendaraan', controlType: 'TextBox (Locked)', captionOrLabel: 'Jenis Kendaraan', description: 'Otomatis terisi dari Database_Barang (Kolom C)' },
      { controlName: 'txtHargaJual', controlType: 'TextBox (Locked)', captionOrLabel: 'Harga Jual Satuan (Rp)', description: 'Otomatis terisi format Rupiah' },
      { controlName: 'txtStokTersedia', controlType: 'TextBox (Locked)', captionOrLabel: 'Stok Tersedia', description: 'Menampilkan stok real-time (Kolom F)' },
      { controlName: 'txtQty', controlType: 'TextBox', captionOrLabel: 'Jumlah (Qty)', description: 'Jumlah dibeli, validasi jika stok kurang' },
      { controlName: 'txtTotalPart', controlType: 'TextBox (Locked)', captionOrLabel: 'Total Part (Rp)', description: 'Otomatis Qty * Harga Jual Part' },
      { controlName: 'txtHargaJasa', controlType: 'TextBox', captionOrLabel: 'Biaya / Harga Jasa (Rp)', description: 'Input biaya servis, pasang, tune up, dll.' },
      { controlName: 'txtTotalPenjualan', controlType: 'TextBox (Locked)', captionOrLabel: 'Total Penjualan (Rp)', description: 'Otomatis Total Part + Biaya Jasa' },
      { controlName: 'btnSimpan', controlType: 'CommandButton', captionOrLabel: 'Simpan Transaksi (F2)', description: 'Simpan ke Penjualan & potong stok otomatis' },
      { controlName: 'btnReset', controlType: 'CommandButton', captionOrLabel: 'Reset Form', description: 'Mengosongkan input' },
      { controlName: 'lblCopyright', controlType: 'Label (Footer)', captionOrLabel: 'Developer & System Owner: Rycko Computer / IT Solution', description: 'Marking hak cipta resmi di bagian bawah UserForm' },
    ],
    code: `' =========================================================================
' FORM        : UserForm_Penjualan
' KONTROL     : txtKodeBarang (ComboBox), txtNamaBarang, txtJenisKendaraan,
'               txtHargaJual, txtStokTersedia, txtQty, txtTotalPart, txtHargaJasa,
'               txtTotalPenjualan, btnSimpan, btnReset
' LOGIKA      : Auto-lookup database, penambahan biaya jasa servis (0% HPP),
'               potong stok otomatis, reminder reorder
' =========================================================================
Option Explicit

Dim wsBarang As Worksheet
Dim wsPenjualan As Worksheet
Dim hargaModalCurrent As Double

Private Sub UserForm_Initialize()
    Dim lastRow As Long, i As Long
    
    Set wsBarang = ThisWorkbook.Sheets("Database_Barang")
    Set wsPenjualan = ThisWorkbook.Sheets("Penjualan")
    
    ' Kunci kontrol Read-Only
    Me.txtNamaBarang.Locked = True
    Me.txtJenisKendaraan.Locked = True
    Me.txtHargaJual.Locked = True
    Me.txtStokTersedia.Locked = True
    Me.txtTotalPart.Locked = True
    Me.txtTotalPenjualan.Locked = True
    
    ' Populate ComboBox txtKodeBarang dengan daftar barang
    Me.txtKodeBarang.Clear
    lastRow = wsBarang.Cells(wsBarang.Rows.Count, "A").End(xlUp).Row
    
    For i = 2 To lastRow
        If Trim(wsBarang.Cells(i, 1).Value) <> "" Then
            Me.txtKodeBarang.AddItem wsBarang.Cells(i, 1).Value
        End If
    Next i
    
    Me.txtQty.Value = "1"
    Me.txtHargaJasa.Value = "0"
    hargaModalCurrent = 0
End Sub

Private Sub txtKodeBarang_Change()
    Dim kode As String
    Dim foundCell As Range
    Dim rowItem As Long
    
    kode = Trim(Me.txtKodeBarang.Value)
    If kode = "" Then
        Call ResetFields
        Exit Sub
    End If
    
    ' Cari baris barang di sheet Database_Barang kolom A
    Set foundCell = wsBarang.Range("A:A").Find(What:=kode, LookIn:=xlValues, LookAt:=xlWhole)
    
    If Not foundCell Is Nothing Then
        rowItem = foundCell.Row
        Me.txtNamaBarang.Value = wsBarang.Cells(rowItem, 2).Value          ' [B] Nama_Barang
        Me.txtJenisKendaraan.Value = wsBarang.Cells(rowItem, 3).Value      ' [C] Jenis_Kendaraan
        hargaModalCurrent = CDbl(wsBarang.Cells(rowItem, 4).Value)        ' [D] Harga_Modal
        Me.txtHargaJual.Value = Format(wsBarang.Cells(rowItem, 5).Value, "#,##0") ' [E] Harga_Jual
        Me.txtStokTersedia.Value = wsBarang.Cells(rowItem, 6).Value       ' [F] Stok_Saat_Ini
        
        Call RecalculateTotal
    Else
        Me.txtNamaBarang.Value = "Barang tidak ditemukan!"
        Me.txtJenisKendaraan.Value = ""
        Me.txtHargaJual.Value = ""
        Me.txtStokTersedia.Value = ""
        Me.txtTotalPart.Value = ""
        Me.txtTotalPenjualan.Value = ""
        hargaModalCurrent = 0
    End If
End Sub

Private Sub txtQty_Change()
    Call RecalculateTotal
End Sub

Private Sub txtHargaJasa_Change()
    Call RecalculateTotal
End Sub

' Event saat jumlah Qty, Harga Jual Part, atau Harga Jasa berubah
Private Sub RecalculateTotal()
    Dim Qty As Double
    Dim HargaPart As Double
    Dim HargaJasa As Double
    Dim TotalPart As Double
    
    Qty = Val(Me.txtQty.Text)
    HargaPart = Val(Replace(Me.txtHargaJual.Text, ",", ""))
    HargaJasa = Val(Replace(Me.txtHargaJasa.Text, ",", ""))
    
    TotalPart = Qty * HargaPart
    Me.txtTotalPart.Text = Format(TotalPart, "#,##0")
    
    ' Total Keseluruhan = Total Part + Biaya Jasa
    Me.txtTotalPenjualan.Text = Format(TotalPart + HargaJasa, "#,##0")
End Sub

Private Sub btnSimpan_Click()
    Dim kode As String
    Dim foundCell As Range
    Dim rowItem As Long
    Dim stokSekarang As Long, minStok As Long, sisaStok As Long
    Dim qtyBeli As Long
    Dim nextRow As Long
    Dim noTrans As String
    Dim totalPart As Double, hargaJasaVal As Double, totalPenjualan As Double
    Dim totalHPP As Double, labaKotor As Double
    Dim hargaJualVal As Double
    
    kode = Trim(Me.txtKodeBarang.Value)
    If kode = "" Then
        MsgBox "Silakan pilih Kode Barang terlebih dahulu!", vbExclamation, "Validasi"
        Exit Sub
    End If
    
    If Not IsNumeric(Me.txtQty.Value) Or Val(Me.txtQty.Value) <= 0 Then
        MsgBox "Jumlah Qty harus berupa angka lebih dari 0!", vbExclamation, "Validasi"
        Me.txtQty.SetFocus
        Exit Sub
    End If
    
    qtyBeli = CLng(Me.txtQty.Value)
    
    ' Validasi Stok di Database_Barang
    Set foundCell = wsBarang.Range("A:A").Find(What:=kode, LookIn:=xlValues, LookAt:=xlWhole)
    If foundCell Is Nothing Then
        MsgBox "Barang tidak valid dalam database!", vbCritical, "Error"
        Exit Sub
    End If
    
    rowItem = foundCell.Row
    stokSekarang = CLng(wsBarang.Cells(rowItem, 6).Value)  ' Kolom F (Stok_Saat_Ini)
    minStok = CLng(wsBarang.Cells(rowItem, 7).Value)       ' Kolom G (Minimal_Stok)
    
    If qtyBeli > stokSekarang Then
        MsgBox "Stok tidak mencukupi!" & vbCrLf & _
               "Stok saat ini hanya tersisa: " & stokSekarang & " pcs.", _
               vbCritical, "Stok Kurang"
        Exit Sub
    End If
    
    ' Generate No Transaksi Unik
    nextRow = wsPenjualan.Cells(wsPenjualan.Rows.Count, "A").End(xlUp).Row + 1
    noTrans = "PJ-" & Format(Now, "yyyymmdd") & "-" & Format(nextRow - 1, "000")
    
    hargaJualVal = CDbl(wsBarang.Cells(rowItem, 5).Value) ' Kolom E (Harga_Jual)
    totalPart = qtyBeli * hargaJualVal
    hargaJasaVal = Val(Replace(Me.txtHargaJasa.Text, ",", ""))
    totalPenjualan = totalPart + hargaJasaVal
    totalHPP = qtyBeli * hargaModalCurrent ' Biaya jasa 0% HPP / 100% laba bersih
    labaKotor = totalPenjualan - totalHPP
    
    ' 1. SIMPAN KE SHEET PENJUALAN (12 KOLOM)
    ' Struktur Penjualan:
    ' [A]No_Trans, [B]Tgl, [C]Kode, [D]Nama, [E]Jenis_Kendaraan, [F]Qty, [G]Harga_Jual_Part,
    ' [H]Total_Part, [I]Harga_Jasa, [J]Total_Penjualan, [K]Total_HPP, [L]Laba_Kotor
    With wsPenjualan
        .Cells(nextRow, 1).Value = noTrans
        .Cells(nextRow, 2).Value = Format(Date, "yyyy-mm-dd")
        .Cells(nextRow, 3).Value = kode
        .Cells(nextRow, 4).Value = wsBarang.Cells(rowItem, 2).Value
        .Cells(nextRow, 5).Value = wsBarang.Cells(rowItem, 3).Value ' Jenis Kendaraan
        .Cells(nextRow, 6).Value = qtyBeli
        .Cells(nextRow, 7).Value = hargaJualVal
        .Cells(nextRow, 8).Value = totalPart
        .Cells(nextRow, 9).Value = hargaJasaVal
        .Cells(nextRow, 10).Value = totalPenjualan
        .Cells(nextRow, 11).Value = totalHPP
        .Cells(nextRow, 12).Value = labaKotor
        
        ' Format Rupiah
        .Range(.Cells(nextRow, 7), .Cells(nextRow, 12)).NumberFormat = """Rp ""#,##0"
    End With
    
    ' 2. POTONG STOK DI DATABASE_BARANG
    sisaStok = stokSekarang - qtyBeli
    wsBarang.Cells(rowItem, 6).Value = sisaStok ' Kolom F
    
    ' 3. OTOMATISASI REMINDER REORDER
    If sisaStok <= minStok Then
        wsBarang.Cells(rowItem, 8).Value = "⚠️ REORDER (Sisa " & sisaStok & " pcs)" ' Kolom H
        wsBarang.Cells(rowItem, 8).Interior.Color = RGB(255, 230, 230)
        wsBarang.Cells(rowItem, 8).Font.Color = RGB(200, 0, 0)
        wsBarang.Cells(rowItem, 8).Font.Bold = True
        
        MsgBox "Transaksi " & noTrans & " Berhasil Disimpan!" & vbCrLf & vbCrLf & _
               "Total Part : Rp " & Format(totalPart, "#,##0") & vbCrLf & _
               "Biaya Jasa : Rp " & Format(hargaJasaVal, "#,##0") & vbCrLf & _
               "Total Bayar: Rp " & Format(totalPenjualan, "#,##0") & vbCrLf & vbCrLf & _
               "⚠️ PERINGATAN RESTOK:" & vbCrLf & _
               "Stok barang [" & wsBarang.Cells(rowItem, 2).Value & " - " & wsBarang.Cells(rowItem, 3).Value & "] tersisa " & sisaStok & " pcs!" & vbCrLf & _
               "Batas minimal stok adalah " & minStok & " pcs. Segera lakukan pemesanan ulang.", _
               vbExclamation, "Peringatan Reorder Stok"
    Else
        wsBarang.Cells(rowItem, 8).Value = "AMAN"
        wsBarang.Cells(rowItem, 8).Interior.Color = RGB(230, 255, 230)
        wsBarang.Cells(rowItem, 8).Font.Color = RGB(0, 130, 0)
        wsBarang.Cells(rowItem, 8).Font.Bold = False
        
        MsgBox "Transaksi " & noTrans & " Berhasil Disimpan!" & vbCrLf & _
               "Total Part : Rp " & Format(totalPart, "#,##0") & vbCrLf & _
               "Biaya Jasa : Rp " & Format(hargaJasaVal, "#,##0") & vbCrLf & _
               "Total Bayar: Rp " & Format(totalPenjualan, "#,##0"), vbInformation, "Sukses"
    End If
    
    Call ResetFields
End Sub

Private Sub ResetFields()
    Me.txtKodeBarang.Value = ""
    Me.txtNamaBarang.Value = ""
    Me.txtJenisKendaraan.Value = ""
    Me.txtHargaJual.Value = ""
    Me.txtStokTersedia.Value = ""
    Me.txtQty.Value = "1"
    Me.txtTotalPart.Value = ""
    Me.txtHargaJasa.Value = "0"
    Me.txtTotalPenjualan.Value = ""
    hargaModalCurrent = 0
End Sub

Private Sub btnReset_Click()
    Call ResetFields
End Sub
`
  },
{
    id: 'userform_pengeluaran',
    title: '6. Userform_Pengeluaran.frm (Pengeluaran Beban Operasional)',
    type: 'UserForm',
    filename: 'Userform_Pengeluaran.frm',
    description: 'Pencatatan beban operasional dengan dropdown kategori (Operasional, Gaji, Sewa, Listrik/Air, Sparepart/Alat, Lainnya).',
    formControls: [
      { controlName: 'cmbKategori', controlType: 'ComboBox', captionOrLabel: 'Kategori Pengeluaran', description: 'Pilihan 6 kategori pengeluaran bengkel' },
      { controlName: 'txtKeterangan', controlType: 'TextBox', captionOrLabel: 'Keterangan Pengeluaran', description: 'Rincian detail keperluan transaksi' },
      { controlName: 'txtJumlah', controlType: 'TextBox', captionOrLabel: 'Jumlah Pengeluaran (Rp)', description: 'Nominal biaya yang dikeluarkan' },
      { controlName: 'btnSimpan', controlType: 'CommandButton', captionOrLabel: 'Simpan Pengeluaran', description: 'Menuliskan catatan ke Sheet Pengeluaran' },
      { controlName: 'lblCopyright', controlType: 'Label (Footer)', captionOrLabel: 'Developer & System Owner: Rycko Computer / IT Solution', description: 'Marking hak cipta resmi di bagian bawah UserForm' },
    ],
    code: `' =========================================================================
' FORM        : UserForm_Pengeluaran
' KONTROL     : cmbKategori, txtKeterangan, txtJumlah, btnSimpan
' =========================================================================
Option Explicit

Private Sub UserForm_Initialize()
    ' Isi Dropdown Kategori Pengeluaran
    With Me.cmbKategori
        .Clear
        .AddItem "Operasional"
        .AddItem "Gaji"
        .AddItem "Sewa"
        .AddItem "Listrik/Air"
        .AddItem "Sparepart/Alat"
        .AddItem "Lainnya"
        .ListIndex = 0
    End With
    
    Me.txtKeterangan.Value = ""
    Me.txtJumlah.Value = ""
End Sub

Private Sub btnSimpan_Click()
    Dim wsPengeluaran As Worksheet
    Dim nextRow As Long
    Dim noTrans As String
    Dim jumlahVal As Double
    
    Set wsPengeluaran = ThisWorkbook.Sheets("Pengeluaran")
    
    ' Validasi Input
    If Trim(Me.cmbKategori.Value) = "" Then
        MsgBox "Silakan pilih Kategori Pengeluaran!", vbExclamation, "Validasi"
        Exit Sub
    End If
    
    If Trim(Me.txtKeterangan.Value) = "" Then
        MsgBox "Keterangan pengeluaran wajib diisi!", vbExclamation, "Validasi"
        Me.txtKeterangan.SetFocus
        Exit Sub
    End If
    
    If Not IsNumeric(Me.txtJumlah.Value) Or Val(Me.txtJumlah.Value) <= 0 Then
        MsgBox "Jumlah pengeluaran harus berupa nominal angka lebih dari 0!", vbExclamation, "Validasi"
        Me.txtJumlah.SetFocus
        Exit Sub
    End If
    
    jumlahVal = CDbl(Me.txtJumlah.Value)
    
    ' Generate Nomor Transaksi Pengeluaran
    nextRow = wsPengeluaran.Cells(wsPengeluaran.Rows.Count, "A").End(xlUp).Row + 1
    noTrans = "PG-" & Format(Now, "yyyymmdd") & "-" & Format(nextRow - 1, "000")
    
    ' Simpan ke Sheet Pengeluaran
    With wsPengeluaran
        .Cells(nextRow, 1).Value = noTrans
        .Cells(nextRow, 2).Value = Format(Date, "yyyy-mm-dd")
        .Cells(nextRow, 3).Value = Me.cmbKategori.Value
        .Cells(nextRow, 4).Value = Trim(Me.txtKeterangan.Value)
        .Cells(nextRow, 5).Value = jumlahVal
        .Cells(nextRow, 5).NumberFormat = """Rp ""#,##0"
    End With
    
    MsgBox "Pengeluaran " & noTrans & " Berhasil Disimpan!" & vbCrLf & _
           "Jumlah: Rp " & Format(jumlahVal, "#,##0"), vbInformation, "Sukses"
           
    ' Reset Form
    Me.txtKeterangan.Value = ""
    Me.txtJumlah.Value = ""
    Me.cmbKategori.ListIndex = 0
End Sub
`
  },
{
    id: 'userform_pembelian',
    title: '7. Userform_Pembelian.frm (Pembelian & Restok Sparepart)',
    type: 'UserForm',
    filename: 'Userform_Pembelian.frm',
    description: 'Form input pembelian faktur restok sparepart dengan auto-fill Nama Barang & Jenis Kendaraan, penyesuaian harga modal, hitung total kulakan, dan auto tambah stok.',
    formControls: [
      { controlName: 'txtKodeBarang', controlType: 'ComboBox / TextBox', captionOrLabel: 'Pilih / Cari Kode Barang', description: 'Dropdown kode barang terdaftar' },
      { controlName: 'txtNamaBarang', controlType: 'TextBox (Locked)', captionOrLabel: 'Nama Barang', description: 'Auto-fill dari Database_Barang (Kolom B)' },
      { controlName: 'txtJenisKendaraan', controlType: 'TextBox (Locked)', captionOrLabel: 'Jenis Kendaraan', description: 'Auto-fill dari Database_Barang (Kolom C)' },
      { controlName: 'txtHargaModal', controlType: 'TextBox', captionOrLabel: 'Harga Modal Satuan (Rp)', description: 'Harga modal kulakan baru (bisa disesuaikan)' },
      { controlName: 'txtQty', controlType: 'TextBox', captionOrLabel: 'Jumlah Masuk (Qty)', description: 'Jumlah unit sparepart yang dibeli' },
      { controlName: 'txtTotal', controlType: 'TextBox (Locked)', captionOrLabel: 'Total Harga Pembelian (Rp)', description: 'Otomatis Qty * Harga Modal' },
      { controlName: 'btnSimpan', controlType: 'CommandButton', captionOrLabel: 'Simpan Pembelian', description: 'Simpan ke sheet Pembelian & tambahkan stok otomatis' },
      { controlName: 'btnReset', controlType: 'CommandButton', captionOrLabel: 'Reset Form', description: 'Mengosongkan input form' },
      { controlName: 'lblCopyright', controlType: 'Label (Footer)', captionOrLabel: 'Developer & System Owner: Rycko Computer / IT Solution', description: 'Marking hak cipta resmi di bagian bawah UserForm' },
    ],
    code: `' =========================================================================
' FORM        : UserForm_Pembelian
' KONTROL     : txtKodeBarang (ComboBox), txtNamaBarang, txtJenisKendaraan,
'               txtHargaModal, txtQty, txtTotal, btnSimpan, btnReset
' LOGIKA      : Auto-lookup database, tambah stok otomatis, auto reminder update
' DEVELOPER   : Rycko Computer / IT Solution
' =========================================================================
Option Explicit

Dim wsBarang As Worksheet
Dim wsPembelian As Worksheet

Private Sub UserForm_Initialize()
    Dim lastRow As Long, i As Long
    
    Set wsBarang = ThisWorkbook.Sheets("Database_Barang")
    Set wsPembelian = ThisWorkbook.Sheets("Pembelian")
    
    ' Kunci kontrol Read-Only
    Me.txtNamaBarang.Locked = True
    Me.txtJenisKendaraan.Locked = True
    Me.txtTotal.Locked = True
    
    ' Populate ComboBox txtKodeBarang
    Me.txtKodeBarang.Clear
    lastRow = wsBarang.Cells(wsBarang.Rows.Count, "A").End(xlUp).Row
    For i = 2 To lastRow
        If Trim(wsBarang.Cells(i, 1).Value) <> "" Then
            Me.txtKodeBarang.AddItem wsBarang.Cells(i, 1).Value
        End If
    Next i
    
    Me.txtQty.Value = "10"
End Sub

Private Sub txtKodeBarang_Change()
    Dim kode As String
    Dim foundCell As Range
    Dim rowItem As Long
    
    kode = Trim(Me.txtKodeBarang.Value)
    If kode = "" Then
        Call ResetFields
        Exit Sub
    End If
    
    Set foundCell = wsBarang.Range("A:A").Find(What:=kode, LookIn:=xlValues, LookAt:=xlWhole)
    If Not foundCell Is Nothing Then
        rowItem = foundCell.Row
        Me.txtNamaBarang.Value = wsBarang.Cells(rowItem, 2).Value          ' [B] Nama_Barang
        Me.txtJenisKendaraan.Value = wsBarang.Cells(rowItem, 3).Value      ' [C] Jenis_Kendaraan
        Me.txtHargaModal.Value = Format(wsBarang.Cells(rowItem, 4).Value, "#,##0") ' [D] Harga_Modal
        Call HitungSubtotal
    Else
        Me.txtNamaBarang.Value = "Barang tidak ditemukan!"
        Me.txtJenisKendaraan.Value = ""
        Me.txtHargaModal.Value = ""
        Me.txtTotal.Value = ""
    End If
End Sub

Private Sub txtQty_Change()
    Call HitungSubtotal
End Sub

Private Sub txtHargaModal_Change()
    Call HitungSubtotal
End Sub

Private Sub HitungSubtotal()
    Dim qty As Double, harga As Double
    
    If IsNumeric(Me.txtQty.Value) And IsNumeric(Replace(Me.txtHargaModal.Value, ",", "")) Then
        qty = CDbl(Me.txtQty.Value)
        harga = CDbl(Replace(Me.txtHargaModal.Value, ",", ""))
        Me.txtTotal.Value = Format(qty * harga, "#,##0")
    Else
        Me.txtTotal.Value = "0"
    End If
End Sub

Private Sub btnSimpan_Click()
    Dim kode As String, rowItem As Long
    Dim foundCell As Range
    Dim nextRow As Long
    Dim noTrans As String
    Dim qtyMasuk As Long, stokAwal As Long, stokAkhir As Long, minStok As Long
    Dim hrgModal As Double, totalBeli As Double
    
    kode = Trim(Me.txtKodeBarang.Value)
    If kode = "" Then
        MsgBox "Pilih Kode Barang terlebih dahulu!", vbExclamation, "Validasi"
        Exit Sub
    End If
    
    If Not IsNumeric(Me.txtQty.Value) Or Val(Me.txtQty.Value) <= 0 Then
        MsgBox "Jumlah Qty harus berupa angka lebih dari 0!", vbExclamation, "Validasi"
        Me.txtQty.SetFocus
        Exit Sub
    End If
    
    qtyMasuk = CLng(Me.txtQty.Value)
    hrgModal = CDbl(Replace(Me.txtHargaModal.Value, ",", ""))
    totalBeli = qtyMasuk * hrgModal
    
    Set foundCell = wsBarang.Range("A:A").Find(What:=kode, LookIn:=xlValues, LookAt:=xlWhole)
    If foundCell Is Nothing Then
        Dim answer As VbMsgBoxResult
        answer = MsgBox("Kode Barang [" & kode & "] belum terdaftar di Database_Barang." & vbCrLf & _
                        "Daftarkan sebagai Sparepart Baru sekarang?", vbYesNo + vbQuestion, "Sparepart Baru")
        If answer = vbYes Then
            Dim nextBarangRow As Long
            Dim inputNama As String, inputJenis As String, inputJual As String
            
            inputNama = InputBox("Masukkan Nama Sparepart Baru:", "Daftar Barang Baru", Me.txtNamaBarang.Value)
            If Trim(inputNama) = "" Then Exit Sub
            
            inputJenis = InputBox("Jenis Kendaraan (Matic/Bebek/Sport/Universal):", "Jenis Kendaraan", "Matic")
            inputJual = InputBox("Harga Jual Konsumen (Rp):", "Harga Jual", Format(hrgModal * 1.3, "0"))
            
            nextBarangRow = wsBarang.Cells(wsBarang.Rows.Count, "A").End(xlUp).Row + 1
            wsBarang.Cells(nextBarangRow, 1).Value = kode
            wsBarang.Cells(nextBarangRow, 2).Value = inputNama
            wsBarang.Cells(nextBarangRow, 3).Value = inputJenis
            wsBarang.Cells(nextBarangRow, 4).Value = hrgModal
            wsBarang.Cells(nextBarangRow, 5).Value = Val(Replace(inputJual, ",", ""))
            wsBarang.Cells(nextBarangRow, 6).Value = 0
            wsBarang.Cells(nextBarangRow, 7).Value = 3
            wsBarang.Cells(nextBarangRow, 8).Value = "AMAN"
            
            Set foundCell = wsBarang.Cells(nextBarangRow, 1)
        Else
            Exit Sub
        End If
    End If
    
    rowItem = foundCell.Row
    stokAwal = CLng(wsBarang.Cells(rowItem, 6).Value) ' Kolom F (Stok_Saat_Ini)
    minStok = CLng(wsBarang.Cells(rowItem, 7).Value)  ' Kolom G (Minimal_Stok)
    
    ' Generate No Transaksi Pembelian
    nextRow = wsPembelian.Cells(wsPembelian.Rows.Count, "A").End(xlUp).Row + 1
    noTrans = "PB-" & Format(Now, "yyyymmdd") & "-" & Format(nextRow - 1, "000")
    
    ' 1. SIMPAN KE SHEET PEMBELIAN
    ' Struktur Pembelian: [A]No_Trans, [B]Tgl, [C]Kode, [D]Nama, [E]Jenis_Kendaraan, [F]Qty, [G]Harga_Modal, [H]Total_Harga
    With wsPembelian
        .Cells(nextRow, 1).Value = noTrans
        .Cells(nextRow, 2).Value = Format(Date, "yyyy-mm-dd")
        .Cells(nextRow, 3).Value = kode
        .Cells(nextRow, 4).Value = wsBarang.Cells(rowItem, 2).Value
        .Cells(nextRow, 5).Value = wsBarang.Cells(rowItem, 3).Value
        .Cells(nextRow, 6).Value = qtyMasuk
        .Cells(nextRow, 7).Value = hrgModal
        .Cells(nextRow, 8).Value = totalBeli
        
        .Range(.Cells(nextRow, 7), .Cells(nextRow, 8)).NumberFormat = """Rp ""#,##0"
    End With
    
    ' 2. TAMBAH STOK DI DATABASE_BARANG
    stokAkhir = stokAwal + qtyMasuk
    wsBarang.Cells(rowItem, 6).Value = stokAkhir ' Kolom F
    wsBarang.Cells(rowItem, 4).Value = hrgModal   ' Update harga modal jika ada perubahan
    
    ' 3. PERBARUI STATUS STOK DI KOLOM H
    If stokAkhir <= minStok Then
        wsBarang.Cells(rowItem, 8).Value = "⚠️ REORDER (Sisa " & stokAkhir & " pcs)"
        wsBarang.Cells(rowItem, 8).Interior.Color = RGB(255, 230, 230)
        wsBarang.Cells(rowItem, 8).Font.Color = RGB(200, 0, 0)
        wsBarang.Cells(rowItem, 8).Font.Bold = True
    Else
        wsBarang.Cells(rowItem, 8).Value = "AMAN"
        wsBarang.Cells(rowItem, 8).Interior.Color = RGB(230, 255, 230)
        wsBarang.Cells(rowItem, 8).Font.Color = RGB(0, 130, 0)
        wsBarang.Cells(rowItem, 8).Font.Bold = False
    End If
    
    MsgBox "Pembelian & Restok Berhasil Disimpan!" & vbCrLf & _
           "No Transaksi : " & noTrans & vbCrLf & _
           "Barang       : " & wsBarang.Cells(rowItem, 2).Value & " [" & wsBarang.Cells(rowItem, 3).Value & "]" & vbCrLf & _
           "Stok Baru    : " & stokAkhir & " pcs" & vbCrLf & _
           "Total Biaya  : Rp " & Format(totalBeli, "#,##0"), vbInformation, "Restok Sukses"
           
    Call ResetFields
End Sub

Private Sub ResetFields()
    Me.txtKodeBarang.Value = ""
    Me.txtNamaBarang.Value = ""
    Me.txtJenisKendaraan.Value = ""
    Me.txtHargaModal.Value = ""
    Me.txtQty.Value = "10"
    Me.txtTotal.Value = ""
End Sub

Private Sub btnReset_Click()
    Call ResetFields
End Sub
`
  },
{
    id: 'sheet_penjualan_event',
    title: '8. Sheet3_Penjualan.cls (Auto-Fill Lembar Penjualan)',
    type: 'Sheet',
    filename: 'Sheet3_Penjualan.cls',
    description: 'Event Worksheet_Change pada sheet Penjualan untuk auto-fill Nama Barang (Kolom D), Jenis Kendaraan (Kolom E), Harga Jual Part (Kolom G), serta perhitungan Total Part, Biaya Jasa, Total Penjualan, HPP, dan Laba Kotor.',
    code: `' =========================================================================
' SHEET       : Sheet3 (Penjualan)
' DESKRIPSI   : Otomatisasi Auto-Fill saat Kode Barang Diketik Manual di Sheet
' EVENT       : Worksheet_Change
' DEVELOPER   : Rycko Computer / IT Solution
' =========================================================================
Option Explicit

Private Sub Worksheet_Change(ByVal Target As Range)
    Dim KeyVal As String
    Dim FoundCell As Range
    
    ' Berjalan hanya jika mengisi / mengubah Kode Barang di Kolom C (baris 2 ke bawah)
    If Not Intersect(Target, Me.Range("C2:C1000")) Is Nothing Then
        If Target.Cells.Count = 1 And Target.Value <> "" Then
            KeyVal = Trim(Target.Value)
            Set FoundCell = Sheets("Database_Barang").Range("A:A").Find(What:=KeyVal, LookIn:=xlValues, LookAt:=xlWhole)
            
            If Not FoundCell Is Nothing Then
                Application.EnableEvents = False
                
                ' Auto-fill data dari Database_Barang:
                ' FoundCell.Offset(0, 1) = [B] Nama Barang
                ' FoundCell.Offset(0, 2) = [C] Jenis Kendaraan
                ' FoundCell.Offset(0, 4) = [E] Harga Jual
                Me.Cells(Target.Row, "D").Value = FoundCell.Offset(0, 1).Value ' [D] Nama Barang
                Me.Cells(Target.Row, "E").Value = FoundCell.Offset(0, 2).Value ' [E] Jenis Kendaraan
                Me.Cells(Target.Row, "G").Value = FoundCell.Offset(0, 4).Value ' [G] Harga Jual Part
                
                ' Jika Qty belum diisi, set default 1
                If Me.Cells(Target.Row, "F").Value = "" Then
                    Me.Cells(Target.Row, "F").Value = 1
                End If
                
                ' Jika Harga Jasa belum diisi, set default 0
                If Me.Cells(Target.Row, "I").Value = "" Then
                    Me.Cells(Target.Row, "I").Value = 0
                End If
                
                ' Hitung Total Part, Total Penjualan, Total HPP, dan Laba Kotor
                Dim qtyVal As Double, hrgJual As Double, hrgJasa As Double, hrgModal As Double
                Dim totPart As Double, totPenjualan As Double, totHPP As Double
                
                qtyVal = CDbl(Me.Cells(Target.Row, "F").Value)
                hrgJual = CDbl(FoundCell.Offset(0, 4).Value)
                hrgJasa = CDbl(Me.Cells(Target.Row, "I").Value)
                hrgModal = CDbl(FoundCell.Offset(0, 3).Value) ' [D] Harga Modal
                
                totPart = qtyVal * hrgJual
                totPenjualan = totPart + hrgJasa
                totHPP = qtyVal * hrgModal
                
                Me.Cells(Target.Row, "H").Value = totPart                         ' [H] Total Part (Qty * Harga Jual)
                Me.Cells(Target.Row, "J").Value = totPenjualan                    ' [J] Total Penjualan (Total Part + Jasa)
                Me.Cells(Target.Row, "K").Value = totHPP                          ' [K] Total HPP (Qty * Modal)
                Me.Cells(Target.Row, "L").Value = totPenjualan - totHPP           ' [L] Laba Kotor
                
                Me.Range(Me.Cells(Target.Row, "G"), Me.Cells(Target.Row, "L")).NumberFormat = """Rp ""#,##0"
                
                Application.EnableEvents = True
            Else
                MsgBox "Kode Barang [" & KeyVal & "] tidak ditemukan di Database_Barang!", vbExclamation, "Kode Tidak Valid"
            End If
        End If
    End If
End Sub
`
  },
  {
    id: 'modul_navigator',
    title: '9. Modul_TombolMenu.bas (Shortcut Tombol & Navigasi)',
    type: 'Module',
    filename: 'Modul_TombolMenu.bas',
    description: 'Sub-routine untuk dipasangkan ke Shape/Button di Sheet Excel agar UserForm dan Laporan bisa dibuka dengan 1 klik.',
    code: `' =========================================================================
' NAMA MODUL : Modul_TombolMenu
' DESKRIPSI  : Macro Shortcut untuk Tombol di Sheet Excel
' =========================================================================
Option Explicit

Sub BukaFormPenjualan()
    UserForm_Penjualan.Show
End Sub

Sub BukaFormPembelian()
    UserForm_Pembelian.Show
End Sub

Sub BukaFormPengeluaran()
    UserForm_Pengeluaran.Show
End Sub

Sub BukaFormProfilBengkel()
    UserForm_ProfilBengkel.Show
End Sub

Sub CetakLaporanLangsung()
    Call GenerateLaporanKeuanganAndPrint
End Sub

Sub CekReminderStokSemua()
    Dim wsBarang As Worksheet
    Dim lastRow As Long, i As Long
    Dim stok As Long, minStok As Long
    Dim countAlert As Long
    Dim daftarAlert As String
    
    Set wsBarang = ThisWorkbook.Sheets("Database_Barang")
    lastRow = wsBarang.Cells(wsBarang.Rows.Count, "A").End(xlUp).Row
    
    countAlert = 0
    daftarAlert = ""
    
    For i = 2 To lastRow
        If Trim(wsBarang.Cells(i, 1).Value) <> "" Then
            stok = CLng(wsBarang.Cells(i, 6).Value)     ' [F] Stok_Saat_Ini
            minStok = CLng(wsBarang.Cells(i, 7).Value)  ' [G] Minimal_Stok
            
            If stok <= minStok Then
                wsBarang.Cells(i, 8).Value = "⚠️ REORDER (Sisa " & stok & " pcs)" ' [H] Status_Stok
                wsBarang.Cells(i, 8).Interior.Color = RGB(255, 230, 230)
                wsBarang.Cells(i, 8).Font.Color = RGB(200, 0, 0)
                wsBarang.Cells(i, 8).Font.Bold = True
                
                countAlert = countAlert + 1
                daftarAlert = daftarAlert & "- " & wsBarang.Cells(i, 2).Value & " [" & wsBarang.Cells(i, 3).Value & "] (Sisa: " & stok & " pcs)" & vbCrLf
            Else
                wsBarang.Cells(i, 8).Value = "AMAN"
                wsBarang.Cells(i, 8).Interior.Color = RGB(230, 255, 230)
                wsBarang.Cells(i, 8).Font.Color = RGB(0, 130, 0)
                wsBarang.Cells(i, 8).Font.Bold = False
            End If
        End If
    Next i
    
    If countAlert > 0 Then
        MsgBox "PERHATIAN: Ada " & countAlert & " item sparepart yang harus di-REORDER:" & vbCrLf & vbCrLf & _
               daftarAlert, vbExclamation, "Peringatan Stok Rendah"
    Else
        MsgBox "Semua stok sparepart dalam kondisi aman!", vbInformation, "Stok Aman"
    End If
End Sub
`
  }
];

export const configSheetGuide = {
  sheetName: 'Config',
  cells: [
    { cell: 'B1', label: 'Judul Header', value: 'Pengaturan Bengkel & Lisensi', note: 'Judul sheet' },
    { cell: 'B2', label: 'Status Lisensi', value: 'ACTIVE', note: 'Nilai "ACTIVE" atau "LOCKED" untuk aktivasi admin' },
    { cell: 'B3', label: 'Master Key Admin', value: '*#rycko#*', note: 'Kunci sandi aktivasi workbook resmi (Rycko System)' },
    { cell: 'B4', label: 'Nama Bengkel', value: 'BENGKEL MAJU JAYA', note: 'Tampil di header laporan & struk' },
    { cell: 'B5', label: 'Alamat Bengkel', value: 'Jl. Raya Industri No. 123, Bekasi', note: 'Tampil di sub-header' },
    { cell: 'B6', label: 'Nama Pengelola', value: 'Bp. Ahmad Pengelola', note: 'Tanda tangan pembuat laporan' },
    { cell: 'B7', label: '% Pemilik Modal', value: '60% (0.60)', note: 'Pengali laba bersih porsi pemilik' },
    { cell: 'B8', label: '% Pengelola Bengkel', value: '40% (0.40)', note: 'Pengali laba bersih porsi pengelola' },
    { cell: 'B9', label: 'Nama Pemilik Modal', value: 'Bp. Hendra Pemilik Modal', note: 'Tanda tangan persetujuan pemilik' },
    { cell: 'B10', label: 'Kota Bengkel', value: 'Bekasi', note: 'Tanggal & domisili tanda tangan' },
  ],
  formulas: [
    { target: 'Database_Barang Col F (Stok)', formula: '=SUMIF(Pembelian!C:C, A2, Pembelian!F:F) - SUMIF(Penjualan!C:C, A2, Penjualan!F:F)', desc: 'Stok Saat Ini = Total Pembelian Masuk - Total Penjualan Keluar' },
    { target: 'Database_Barang Col G (Min Stok)', formula: '3', desc: 'Ambang batas batas minimal stok (Default 3 pcs)' },
    { target: 'Database_Barang Col H (Status)', formula: '=IF(F2<=G2, "⚠️ REORDER (Sisa " & F2 & " pcs)", "Aman")', desc: 'Status Reminder Stok Otomatis' },
    { target: 'Penjualan Col H (Total Penjualan)', formula: '=F2*G2', desc: 'Total Penjualan = Qty (F2) * Harga Jual (G2)' },
    { target: 'Penjualan Col I (Total HPP)', formula: '=VLOOKUP(C2, Database_Barang!A:D, 4, FALSE)*F2', desc: 'Total HPP = Harga Modal (Database_Barang Kolom D) * Qty (F2)' },
    { target: 'Penjualan Col J (Laba Kotor)', formula: '=H2-I2', desc: 'Laba Kotor = Total Penjualan (H2) - Total HPP (I2)' },
    { target: 'Laba Bersih', formula: '=SUM(Penjualan!J:J) - SUM(Pengeluaran!E:E)', desc: 'Laba Bersih = Total Laba Kotor - Total Pengeluaran' },
    { target: 'Nominal Pemilik', formula: '=Laba_Bersih * Config!B7', desc: 'Bagi hasil pemilik modal' },
    { target: 'Nominal Pengelola', formula: '=Laba_Bersih * Config!B8', desc: 'Bagi hasil pengelola usaha' },
  ]
};
