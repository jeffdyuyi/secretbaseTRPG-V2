import React, { useState } from 'react';
import { SessionData } from '../types';
import { Trash2, Copy, Check } from 'lucide-react';

interface DataPanelProps {
  data: SessionData[];
  onImport: (data: SessionData[]) => void;
  onClose: () => void;
}

export const DataPanel: React.FC<DataPanelProps> = ({ data, onImport, onClose }) => {
  const [importString, setImportString] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleImport = () => {
    if (!importString.trim()) return;
    try {
      const parsed = JSON.parse(importString);
      if (!Array.isArray(parsed)) throw new Error('Invalid format');
      if (confirm(`确定要导入 ${parsed.length} 条数据吗？这可能会覆盖当前显示。`)) {
          onImport(parsed);
          setImportString('');
          onClose();
      }
    } catch (e) {
      alert('数据格式无效，请检查 JSON 代码。');
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 shadow-inner border border-slate-700 text-slate-300 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
        {/* Export */}
        <div className="space-y-2">
            <div className="flex justify-between items-center h-6">
                <span className="text-xs font-bold uppercase">备份数据 (JSON Export)</span>
                {copied && <span className="text-xs text-green-400 flex items-center gap-1"><Check size={12}/> 已复制</span>}
            </div>
            <div className="relative group">
                <textarea 
                    readOnly 
                    value={JSON.stringify(data, null, 2)} 
                    className="w-full h-24 bg-slate-900 border-slate-600 rounded text-[10px] font-mono p-2 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <button 
                    onClick={handleCopy} 
                    className="absolute bottom-2 right-2 px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded shadow-sm transition-all"
                >
                    <Copy size={12} className="inline mr-1"/>复制
                </button>
            </div>
        </div>
        
        {/* Import */}
        <div className="space-y-2">
            <div className="flex justify-between items-center h-6">
                <span className="text-xs font-bold uppercase">恢复数据 (JSON Import)</span>
                <button 
                    onClick={() => { if(confirm('确定要清空当前视图中的所有数据吗？')) onImport([]); }} 
                    className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors"
                >
                    <Trash2 size={12}/> 清空列表
                </button>
            </div>
            <div className="flex gap-2 h-24">
                <textarea 
                    value={importString} 
                    onChange={e => setImportString(e.target.value)} 
                    placeholder="在此粘贴 JSON 备份代码..." 
                    className="flex-1 bg-slate-100 text-slate-900 border-slate-300 rounded text-xs font-mono p-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button 
                    onClick={handleImport} 
                    disabled={!importString} 
                    className="w-16 bg-indigo-600 text-white rounded font-bold text-xs hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    导入
                </button>
            </div>
        </div>
    </div>
  );
};