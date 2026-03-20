import React, { useState } from 'react';
import { SessionData } from '../types';
import { Copy, Upload, AlertCircle, Check, Image as ImageIcon, FileJson } from 'lucide-react';

interface CodeManagerProps {
  data: SessionData;
  onImport: (data: SessionData) => void;
}

export const CodeManager: React.FC<CodeManagerProps> = ({ data, onImport }) => {
  const [copied, setCopied] = useState(false);
  const [importString, setImportString] = useState('');
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleCopy = () => {
    const code = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const validateAndImport = (jsonString: string) => {
    try {
        const parsed = JSON.parse(jsonString);
        if (!parsed.moduleName || !parsed.ruleSystem) {
          throw new Error("Invalid card data");
        }
        onImport(parsed);
        setError('');
        setImportString('');
        alert('卡牌数据已成功读取！');
    } catch (e) {
        setError('无法解析数据，请检查文件是否包含有效的 TRPG 卡牌信息。');
    }
  };

  const handleTextImport = () => {
    if (!importString.trim()) return;
    validateAndImport(importString);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        processFile(file);
    }
    // Reset input
    e.target.value = '';
  };

  const processFile = async (file: File) => {
      try {
          // Use modern file.text() to read content. This works even for binary files like PNG
          // as long as we are just looking for a string appended at the end.
          const text = await file.text();
          const delimiter = "====TRPG_DATA====";
          
          if (text.includes(delimiter)) {
              const parts = text.split(delimiter);
              // The JSON should be the last part
              const jsonPart = parts[parts.length - 1];
              validateAndImport(jsonPart);
          } else {
              setError('这张图片中没有包含隐藏的卡牌数据，或者是原图已被压缩。');
          }
      } catch (err) {
          console.error(err);
          setError('读取文件失败');
      }
  };

  // Drag and Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       processFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-6 w-full">
        <h3 className="text-sm font-bold text-slate-500 uppercase border-b border-slate-200 pb-2">数据工具</h3>
        
        {/* Upload Section (Image or Code) */}
        <div 
            className={`
                border-2 border-dashed rounded-xl p-6 transition-all text-center
                flex flex-col items-center justify-center gap-3
                ${dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-white hover:border-indigo-300'}
            `}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-indigo-500">
                <ImageIcon size={24} />
            </div>
            <div>
                <p className="text-sm font-bold text-slate-700">上传带有数据的图片</p>
                <p className="text-xs text-slate-400 mt-1">或者拖拽图片到这里 (支持 Steganography)</p>
            </div>
            
            <label className="mt-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded cursor-pointer hover:bg-indigo-700 transition-colors shadow-sm">
                选择图片文件
                <input type="file" accept="image/png" className="hidden" onChange={handleImageUpload} />
            </label>

            {error && (
                <div className="flex items-center gap-1 text-red-500 text-xs mt-2 bg-red-50 px-3 py-1.5 rounded">
                    <AlertCircle size={12} />
                    <span>{error}</span>
                </div>
            )}
        </div>

        {/* Text Code Fallback */}
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
             <div className="flex items-center gap-2 mb-3">
                <FileJson size={16} className="text-slate-500"/>
                <span className="text-xs font-bold text-slate-600 uppercase">JSON 代码导入/导出</span>
            </div>
            
            {/* Export */}
            <div className="relative group mb-3">
                <div className="absolute top-2 right-2">
                    <button 
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-50 shadow-sm"
                    >
                        {copied ? <Check size={10}/> : <Copy size={10} />}
                        {copied ? '已复制' : '复制'}
                    </button>
                </div>
                <textarea 
                    readOnly
                    value={JSON.stringify(data, null, 2)}
                    className="w-full h-16 bg-white border border-slate-200 rounded p-2 text-[10px] font-mono text-slate-400 resize-none focus:outline-none"
                />
            </div>
            
            {/* Import Text */}
            <div className="flex gap-2">
                <input
                    type="text"
                    value={importString}
                    onChange={(e) => setImportString(e.target.value)}
                    placeholder="粘贴 JSON 代码..."
                    className="flex-1 p-2 text-xs font-mono border border-slate-200 rounded focus:outline-none focus:border-indigo-500"
                />
                <button 
                    onClick={handleTextImport}
                    disabled={!importString}
                    className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-bold rounded hover:bg-slate-300 disabled:opacity-50"
                >
                    导入
                </button>
            </div>
        </div>
    </div>
  );
};