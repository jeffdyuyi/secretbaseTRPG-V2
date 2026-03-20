import React from 'react';
import { SessionData } from '../types';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Copy, Check } from 'lucide-react';

interface MarkdownPreviewProps {
  data: SessionData;
}

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ data }) => {
  const [copied, setCopied] = React.useState(false);

  const dateObj = parseISO(data.date);
  const weekdayStr = format(dateObj, 'EEEE', { locale: zhCN });
  const tagsStr = data.tags.map(t => `#${t}`).join(' ');

  const text = `**【${data.ruleSystem}】${data.moduleName}**
> GM：${data.gmName}
> 时间：${data.date} (${weekdayStr}) ${data.startTime}
> 地点：${data.roomId} 房间
> 人数：${data.currentPlayers}/${data.maxPlayers}
> 风格：${tagsStr}

**简介：**
${data.description}

**注意事项：**
${data.notes}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 bg-slate-800 rounded-lg p-4 relative group">
      <button 
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 bg-slate-700 hover:bg-slate-600 rounded-md text-slate-300 transition-colors"
        title="Copy Markdown"
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
      </button>
      <pre className="font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
        {text}
      </pre>
    </div>
  );
};