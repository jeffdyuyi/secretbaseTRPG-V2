import React, { forwardRef } from 'react';
import { SessionData } from '../types';
import { Calendar, Clock, User, Users, MapPin, Info, MessageCircle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { renderRichText } from '../utils/textFormat';

interface PreviewCardProps {
    data: SessionData;
}

export const PreviewCard = forwardRef<HTMLDivElement, PreviewCardProps>(({ data }, ref) => {
    // Safe date parsing for Satellite status where date might be text "TBA"
    let weekdayStr = '';
    let formattedDate = data.date;

    if (data.status !== '卫星') {
        try {
            const dateObj = parseISO(data.date);
            if (isValid(dateObj)) {
                weekdayStr = format(dateObj, 'EEEE', { locale: zhCN });
                formattedDate = format(dateObj, 'yyyy/MM/dd');
            }
        } catch (e) {
            // Fallback to raw string if parsing fails
        }
    } else {
        weekdayStr = '卫星'; // Or just leave empty
    }

    // Theme Colors based on Session Type
    const themeColors: Record<string, string> = {
        '俱乐部团': 'border-t-purple-500',
        '活动团': 'border-t-pink-500',
        '商团': 'border-t-amber-500'
    };

    const badgeColors: Record<string, string> = {
        '俱乐部团': 'bg-purple-100 text-purple-700 border-purple-200',
        '活动团': 'bg-pink-100 text-pink-700 border-pink-200',
        '商团': 'bg-amber-100 text-amber-700 border-amber-200'
    };

    const statusColors: Record<string, string> = {
        '招募中': 'bg-green-500',
        '计划中': 'bg-blue-500',
        '已满员': 'bg-red-500',
        '已取消': 'bg-slate-400',
        '拼车中': 'bg-orange-500',
        '已结团': 'bg-gray-800',
        '卫星': 'bg-sky-400'
    };

    return (
        <div ref={ref} className="w-[480px] bg-slate-100 p-6 flex flex-col items-center justify-center font-sans">
            {/* Ticket Container */}
            <div className={`w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative border-t-[8px] ${themeColors[data.sessionType] || 'border-t-indigo-500'}`}>

                {/* Header Section */}
                <div className="bg-slate-900 p-6 pb-8 relative text-white">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex-1 mr-4">
                            <h1 className="text-lg font-black tracking-widest text-white">成都秘密基地</h1>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${badgeColors[data.sessionType] || 'bg-slate-700 text-white'}`}>
                                {data.sessionType}
                            </span>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400">状态</span>
                                <span className={`h-2 w-2 rounded-full ${statusColors[data.status] || 'bg-slate-500'}`}></span>
                                <span className="text-xs font-bold">{data.status}</span>
                            </div>
                        </div>
                    </div>

                    {/* Title */}
                    <div className="relative z-10 flex flex-col items-start gap-2">
                        <h1
                            className="font-black leading-tight text-white drop-shadow-sm"
                            style={{ fontSize: `${data.moduleFontSize || 30}px`, lineHeight: 1.2 }}
                        >
                            {data.moduleName}
                        </h1>
                        <div
                            className="inline-block px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded font-bold text-indigo-200 border border-white/10"
                            style={{ fontSize: `${data.ruleFontSize || 14}px` }}
                        >
                            {data.ruleSystem}
                        </div>
                    </div>

                    {/* Decorative background pattern */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                </div>

                {/* Middle Info Bar (Date/Time/Room) */}
                <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 grid grid-cols-3 gap-4">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">日期</span>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <Calendar size={14} className="text-indigo-500" />
                            <span className={data.status === '卫星' ? 'text-sm' : ''}>{formattedDate}</span>
                        </div>
                        {weekdayStr && <span className="text-[10px] text-slate-400 font-medium pl-5">{weekdayStr}</span>}
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">时间</span>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <Clock size={14} className="text-indigo-500" />
                            <span className="font-mono">{data.startTime}</span>
                        </div>
                    </div>
                    <div className="flex flex-col border-l border-slate-200 pl-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">地点</span>
                        <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                            <MapPin size={14} className="text-indigo-500" />
                            <span>{data.roomId}</span>
                        </div>
                    </div>
                </div>

                {/* Dashed Line / Punch Holes */}
                <div className="relative flex items-center justify-center">
                    <div className="absolute left-0 -ml-3 w-6 h-6 bg-slate-100 rounded-full"></div>
                    <div className="absolute right-0 -mr-3 w-6 h-6 bg-slate-100 rounded-full"></div>
                    <div className="w-full border-b-2 border-dashed border-slate-200 mx-4"></div>
                </div>

                {/* Main Content Body */}
                <div className="p-6 pt-4">
                    {/* Personnel */}
                    <div className="flex justify-between items-start mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">游戏主持</span>
                            <div className="flex items-center gap-2">
                                <User size={16} className="text-slate-700" />
                                <span className="font-bold text-slate-900">{data.gmName}</span>
                            </div>
                            {data.gmContact && (
                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                    <MessageCircle size={10} />
                                    <span>{data.gmContact}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">玩家人数</span>
                            <div className="flex items-center gap-2">
                                <span className="text-lg font-black text-slate-900">{data.currentPlayers}</span>
                                <span className="text-sm text-slate-400 font-bold">/</span>
                                <span className="text-lg font-black text-slate-400">{data.maxPlayers}</span>
                                <Users size={16} className="text-slate-400 ml-1" />
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    <div className="mb-5">
                        <div className="flex items-center gap-2 mb-2">
                            <Info size={14} className="text-indigo-500" />
                            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wide">团务详情</span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 text-justify whitespace-pre-wrap font-medium">
                            {renderRichText(data.description)}
                        </p>
                    </div>

                    {/* Notes (Warning Style) */}
                    {data.notes && (
                        <div className="mb-5 relative pl-3">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-full"></div>
                            <h4 className="text-[10px] font-bold text-amber-600 uppercase mb-0.5">注意事项 Note</h4>
                            <p className="text-[10px] text-slate-500 leading-normal whitespace-pre-wrap">{renderRichText(data.notes)}</p>
                        </div>
                    )}

                    {/* Tags */}
                    <div className="flex flex-wrap gap-2">
                        {data.tags.map((tag, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-md border border-slate-200 whitespace-nowrap break-keep">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">卡牌设计 不咕鸟</span>
                        <span className="text-[8px] text-slate-400 font-mono">QQ: 442348584</span>
                    </div>
                    <div className="flex gap-1">
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                        <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
});

PreviewCard.displayName = 'PreviewCard';