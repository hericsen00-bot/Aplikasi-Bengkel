import React, { useState } from 'react';
import { 
  FileCode, 
  Copy, 
  Check, 
  Download, 
  Layers, 
  FileSpreadsheet,
  Archive,
  FileText,
  ExternalLink,
  Code2,
  FolderDown
} from 'lucide-react';
import { vbaModules, configSheetGuide } from '../data/vbaCode';
import { VbaModule } from '../types';
import { downloadTextFile } from '../utils/formatters';
import { downloadVbaZipArchive, downloadIndividualVbaFile } from '../utils/vbaDownloader';

interface VbaCodeViewerProps {
  workshopName?: string;
  onDownloadAll?: () => void;
}

export const VbaCodeViewer: React.FC<VbaCodeViewerProps> = ({ 
  workshopName = 'Bengkel',
  onDownloadAll 
}) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>(vbaModules[0].id);
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadingZip, setDownloadingZip] = useState<boolean>(false);

  const currentModule: VbaModule = 
    vbaModules.find((m) => m.id === selectedModuleId) || vbaModules[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(currentModule.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = (mod?: VbaModule) => {
    const target = mod || currentModule;
    downloadIndividualVbaFile(target.filename, target.code);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      await downloadVbaZipArchive(vbaModules, workshopName);
    } catch (err) {
      console.error('Download ZIP error:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadCombinedText = () => {
    if (onDownloadAll) {
      onDownloadAll();
    } else {
      let combined = `''' =========================================================================\n`;
      combined += `''' BUNDLE KODE VBA EXCEL - SISTEM PEMBUKUAN USAHA BENGKEL\n`;
      combined += `''' Generated for: ${workshopName}\n`;
      combined += `''' =========================================================================\n\n`;

      vbaModules.forEach((mod, idx) => {
        combined += `\n' #########################################################################\n`;
        combined += `' FILE ${idx + 1}: ${mod.filename} (${mod.title})\n`;
        combined += `' TIPE: ${mod.type}\n`;
        combined += `' DESKRIPSI: ${mod.description}\n`;
        combined += `' #########################################################################\n\n`;
        combined += mod.code;
        combined += `\n\n`;
      });

      downloadTextFile(`VBA_Pembukuan_Bengkel_9_File.txt`, combined);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Download Actions */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-2xl border border-slate-700 shadow-md text-white flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
            <Archive className="w-3.5 h-3.5" />
            9 File Modul VBA Excel Siap Pakai
          </div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Pusat Download Modul VBA Excel (Macro .xlsm)</span>
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Unduh 9 file makro VBA secara individual (.cls, .bas, .frm) atau unduh sekaligus dalam satu file arsip .ZIP lengkap dengan panduan impor ke Microsoft Excel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
            title="Download semua 9 file VBA dalam format arsip .ZIP"
          >
            <FolderDown className="w-4 h-4" />
            <span>{downloadingZip ? 'Mengemas ZIP...' : 'Download ZIP (Semua 9 File)'}</span>
          </button>

          <button
            onClick={handleDownloadCombinedText}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold rounded-xl transition-all cursor-pointer"
            title="Download semua modul digabung dalam 1 file .txt"
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Download .TXT Gabungan</span>
          </button>
        </div>
      </div>

      {/* Grid of 9 Requested Files for Direct Download */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Daftar 9 File Modul VBA Siap Download:</span>
          </h3>
          <span className="text-xs text-slate-500">
            Klik tombol unduh pada setiap file untuk mengunduh secara terpisah
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vbaModules.map((mod, index) => {
            const isSelected = mod.id === selectedModuleId;
            const fileExt = mod.filename.split('.').pop()?.toUpperCase() || 'VBA';

            let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
            if (fileExt === 'CLS') badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
            if (fileExt === 'FRM') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
            if (fileExt === 'BAS') badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';

            return (
              <div 
                key={mod.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                  isSelected 
                    ? 'bg-blue-50/70 border-blue-400 shadow-xs' 
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeColor}`}>
                      .{fileExt}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-mono text-xs font-bold text-slate-900 truncate" title={mod.filename}>
                      {mod.filename}
                    </h4>
                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                      {mod.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleDownloadSingle(mod)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    title={`Download ${mod.filename}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => setSelectedModuleId(mod.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-200 text-blue-900 border-blue-300 font-bold' 
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                    title="Buka kode di viewer bawah"
                  >
                    <Code2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Code Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
        {/* Sidebar Modules List */}
        <div className="lg:col-span-1 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
            Pilih Modul untuk Dilihat:
          </div>

          <div className="space-y-1.5">
            {vbaModules.map((m, idx) => {
              const isSelected = m.id === selectedModuleId;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelectedModuleId(m.id)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs font-medium transition-all flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-mono flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="truncate">
                    <div className="truncate">{m.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      {m.filename}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Sheet Config Quick Reference Card */}
          <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Pemetaan Sel Sheet &quot;Config&quot;</span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-0.5 font-mono">
              <li><strong>B2:</strong> Status Lisensi (&quot;ACTIVE&quot;)</li>
              <li><strong>B3:</strong> Master Key (&quot;*#rycko#*&quot;)</li>
              <li><strong>B4:</strong> Nama Bengkel</li>
              <li><strong>B5:</strong> Alamat Lengkap</li>
              <li><strong>B6:</strong> Nama Pengelola</li>
              <li><strong>B7:</strong> % Pemilik (60% / 0.60)</li>
              <li><strong>B8:</strong> % Pengelola (40% / 0.40)</li>
            </ul>
          </div>
        </div>

        {/* Code & Documentation Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Module Header Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white">
                  {currentModule.title}
                </h3>
                <span className="font-mono text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  {currentModule.filename}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {currentModule.description}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>

              <button
                onClick={() => handleDownloadSingle(currentModule)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh {currentModule.filename}</span>
              </button>
            </div>
          </div>

          {/* If UserForm, show GUI Control Specification Table */}
          {currentModule.formControls && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                <span>Susunan Kontrol / Komponen UserForm (VBA Toolbox)</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Buat kontrol berikut pada UserForm di jendela VBA Editor (Alt + F11) dengan properti (Name) yang sama:
              </p>

              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-3 py-1.5 font-mono">Control Name (ID)</th>
                      <th className="px-3 py-1.5">Jenis Kontrol</th>
                      <th className="px-3 py-1.5">Caption / Label</th>
                      <th className="px-3 py-1.5">Fungsi &amp; Logika</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {currentModule.formControls.map((fc) => (
                      <tr key={fc.controlName} className="hover:bg-slate-50">
                        <td className="px-3 py-1.5 font-bold text-blue-700">{fc.controlName}</td>
                        <td className="px-3 py-1.5 font-sans text-slate-700">{fc.controlType}</td>
                        <td className="px-3 py-1.5 font-sans font-medium text-slate-900">{fc.captionOrLabel}</td>
                        <td className="px-3 py-1.5 font-sans text-slate-600">{fc.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Syntax Highlighted Code Viewer */}
          <div className="bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 shadow-inner overflow-x-auto">
            <pre className="font-mono text-xs leading-relaxed selection:bg-blue-900 selection:text-white">
              <code>{currentModule.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
