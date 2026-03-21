import React, { useState, useEffect, useRef } from 'react';
import { SessionData, INITIAL_SESSION, INITIAL_UNIVERSITY_SESSION, CloudConfig, UserRole } from './types';
import { SessionForm } from './components/SessionForm';
import { PreviewCard } from './components/PreviewCard';
import { CodeManager } from './components/CodeManager';
import { ScheduleGrid } from './components/ScheduleGrid';
import { UniversityScheduleGrid } from './components/UniversityScheduleGrid';
import { SatelliteGrid } from './components/SatelliteGrid';
import { VikaService } from './utils/vika';
import { useAuth } from './contexts/AuthContext';
import { toBlob } from 'html-to-image';
import { FileText, Download, Calendar as CalendarIcon, Dice5, Copy, Check, AlertTriangle, Rocket, Cloud, RefreshCw, Settings, Share2, Upload, Database, Plus } from 'lucide-react';
import { startOfWeek, format, subDays, addDays, parseISO } from 'date-fns';

function App() {
    const { user, login, logout } = useAuth();
    const [activeTab, setActiveTab] = useState<'generator' | 'schedule' | 'university' | 'satellite' | 'settings'>('generator');
    const [formData, setFormData] = useState<SessionData>(INITIAL_SESSION);

    // --- USER IDENTITY & ROLE ---
    // [BACKEND INTEGRATION POINT]: In production, replace this local state
    // with a call to your Tencent Cloud API (e.g., GET /api/me) after login.
    const [userRole, setUserRole] = useState<UserRole>(() => {
        return (localStorage.getItem('trpg_user_role') as UserRole) || 'social';
    });

    // Data Stores
    const [sessions, setSessions] = useState<SessionData[]>([]);
    const [universitySessions, setUniversitySessions] = useState<SessionData[]>([]);
    const [satellites, setSatellites] = useState<SessionData[]>([]);

    // Cloud Configuration
    const [cloudConfig, setCloudConfig] = useState<CloudConfig>(() => {
        const saved = localStorage.getItem('trpg_cloud_config');
        const defaultConf = { apiToken: '', datasheetId: '', satelliteDatasheetId: '', universityDatasheetId: '', publicShareUrl: '', enabled: false };
        return saved ? { ...defaultConf, ...JSON.parse(saved) } : defaultConf;
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const [cloudError, setCloudError] = useState('');
    const [shareCopied, setShareCopied] = useState(false);

    // Local Data Stats (for Migration)
    const [localDataCount, setLocalDataCount] = useState(0);

    const cardRef = useRef<HTMLDivElement>(null);
    const [isCopying, setIsCopying] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // --- Initialization & Sync Logic ---

    // Check for local data existence
    useEffect(() => {
        const localSess = JSON.parse(localStorage.getItem('trpg_sessions') || '[]');
        const localSat = JSON.parse(localStorage.getItem('trpg_satellites') || '[]');
        setLocalDataCount(localSess.length + localSat.length);
    }, [sessions, satellites, activeTab]);

    // 1. Initial Load (Local or Cloud)
    useEffect(() => {
        if (cloudConfig.enabled) {
            refreshCloudData();
        } else {
            loadLocalData();
        }

        // Load Form Draft
        const savedForm = localStorage.getItem('trpg_form_data');
        if (savedForm) {
            try { setFormData(JSON.parse(savedForm)); } catch (e) { console.error(e); }
        }
    }, [cloudConfig.enabled]);

    // 2. Persist Local Changes (Only if cloud is disabled)
    useEffect(() => {
        if (!cloudConfig.enabled) {
            localStorage.setItem('trpg_sessions', JSON.stringify(sessions));
        }
    }, [sessions, cloudConfig.enabled]);

    useEffect(() => {
        if (!cloudConfig.enabled) {
            localStorage.setItem('trpg_satellites', JSON.stringify(satellites));
        }
    }, [satellites, cloudConfig.enabled]);

    useEffect(() => { localStorage.setItem('trpg_form_data', JSON.stringify(formData)); }, [formData]);

    useEffect(() => {
        localStorage.setItem('trpg_cloud_config', JSON.stringify(cloudConfig));
    }, [cloudConfig]);

    useEffect(() => {
        localStorage.setItem('trpg_user_role', userRole);
    }, [userRole]);

    const loadLocalData = () => {
        const savedSessions = localStorage.getItem('trpg_sessions');
        if (savedSessions) {
            try { setSessions(JSON.parse(savedSessions)); } catch (e) { }
        }
        const savedSatellites = localStorage.getItem('trpg_satellites');
        if (savedSatellites) {
            try { setSatellites(JSON.parse(savedSatellites)); } catch (e) { }
        }
    };

    const refreshCloudData = async () => {
        if (!cloudConfig.enabled || !cloudConfig.datasheetId) return;
        setIsSyncing(true);
        setCloudError('');
        try {
            // 1. Fetch Main Schedule Table
            const mainData = await VikaService.fetchSessions(cloudConfig.apiToken, cloudConfig.datasheetId);

            let satelliteData: SessionData[] = [];

            // 3. Fetch University Table (if configured)
            let universityData: SessionData[] = [];
            if (cloudConfig.universityDatasheetId) {
                try {
                    universityData = await VikaService.fetchSessions(cloudConfig.apiToken, cloudConfig.universityDatasheetId);
                } catch (e) {
                    console.warn("Failed to fetch university table", e);
                }
            }

            // 4. Logic:
            // 'sessions' should be non-satellites from Main table.
            // 'satellites' should be:
            //    - All items from Satellite Table
            //    - PLUS any items in Main Table that are marked as '卫星' (Legacy compatibility)

            const legacySatellites = mainData.filter(s => s.status === '卫星');
            const cleanSessions = mainData.filter(s => s.status !== '卫星');

            setUniversitySessions(universityData);

            if (cloudConfig.satelliteDatasheetId) {
                setSessions(cleanSessions);
                setSatellites([...satelliteData, ...legacySatellites]);
            } else {
                // Single table mode
                setSessions(cleanSessions);
                setSatellites(legacySatellites);
            }

        } catch (e: any) {
            console.error(e);
            setCloudError('同步失败: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // --- Migration Tool ---
    const handleMigrateLocalToCloud = async () => {
        if (!cloudConfig.enabled || !confirm(`确定要将本地的 ${localDataCount} 条数据上传到云端吗？\n\n注意：为防止报错，上传将强制排队执行（约每秒1条），请耐心等待，切勿关闭页面。`)) return;

        setIsSyncing(true);
        try {
            const localSess = JSON.parse(localStorage.getItem('trpg_sessions') || '[]');
            const localSat = JSON.parse(localStorage.getItem('trpg_satellites') || '[]');

            let successCount = 0;

            // Helper: Rate Limited Upload
            const uploadItem = async (item: SessionData, targetTableId: string) => {
                const newItem = { ...item, recordId: undefined, _sourceDatasheetId: undefined };
                await VikaService.createSession(cloudConfig, newItem, targetTableId);
                successCount++;
                // CRITICAL FIX: Rate limiting to prevent 429 errors
                await new Promise(r => setTimeout(r, 1000));
            };

            // Upload Schedule items to Main Table
            for (const item of localSess) {
                await uploadItem(item, cloudConfig.datasheetId);
            }

            // Upload Satellite items to Satellite Table (if exists) or Main Table
            const satTargetId = cloudConfig.satelliteDatasheetId || cloudConfig.datasheetId;
            for (const item of localSat) {
                await uploadItem(item, satTargetId);
            }

            alert(`成功上传 ${successCount} 条数据！`);

            if (confirm('上传完成。是否清空本地旧数据？(推荐清空)')) {
                localStorage.setItem('trpg_sessions', '[]');
                localStorage.setItem('trpg_satellites', '[]');
                setLocalDataCount(0);
            }

            await refreshCloudData();

        } catch (e: any) {
            alert('上传过程中出错: ' + e.message);
        } finally {
            setIsSyncing(false);
        }
    };

    // --- CRUD Operations (Unified Local/Cloud) ---

    const handleSaveSession = async (mode: 'create' | 'update') => {
        const isSatellite = formData.status === '卫星';
        let newId = editingId;
        let newSession = { ...formData };

        if (mode === 'create' || !newId) {
            newId = Date.now().toString();
            newSession.id = newId;
        } else {
            newSession.id = newId;
        }

        // -- CLOUD LOGIC --
        if (cloudConfig.enabled) {
            setIsSyncing(true);
            try {
                // Determine Target Table
                const isUniversity = activeTab === 'university' || newSession.sessionType === '高校团';
                let targetTableId = cloudConfig.datasheetId;

                if (isUniversity) {
                    targetTableId = cloudConfig.universityDatasheetId || cloudConfig.datasheetId;
                } else if (isSatellite && cloudConfig.satelliteDatasheetId) {
                    targetTableId = cloudConfig.satelliteDatasheetId;
                }

                // Handle Move Logic (Delete from Old Table -> Create in New Table)
                // If updating an existing record, check if it needs to move.
                if (mode === 'update' && newSession.recordId && newSession._sourceDatasheetId) {
                    if (newSession._sourceDatasheetId !== targetTableId) {
                        // It moved! (e.g. Schedule -> Satellite)
                        // 1. Delete from old source
                        await VikaService.deleteSession(cloudConfig, newSession.recordId, newSession._sourceDatasheetId);
                        // 2. Create in new target (Reset recordId to null so createSession treats it as new)
                        newSession.recordId = undefined;
                        await VikaService.createSession(cloudConfig, newSession, targetTableId);

                        alert('数据已迁移到对应的分类表中！');
                        await refreshCloudData();
                        setEditingId(null);
                        setIsSyncing(false);
                        return;
                    }
                }

                // Standard Create/Update (No Table Change)
                if (mode === 'create' || !newSession.recordId) {
                    const recordId = await VikaService.createSession(cloudConfig, newSession, targetTableId);
                    newSession.recordId = recordId;
                } else {
                    await VikaService.updateSession(cloudConfig, newSession, targetTableId);
                }

                await refreshCloudData();
                let msg = '已同步到云端日程！';
                if (isUniversity) msg = '已同步到高校约团页面！';
                else if (isSatellite) msg = '已同步到云端卫星站！';
                alert(msg);
                setEditingId(null);
            } catch (e: any) {
                alert('保存到云端失败: ' + e.message);
            } finally {
                setIsSyncing(false);
            }
            return;
        }

        // -- LOCAL LOGIC --
        if (isSatellite) {
            if (mode === 'update' && editingId) {
                // Check if it was in Sessions before (Move logic for local)
                const wasInSessions = sessions.some(s => s.id === editingId);
                if (wasInSessions) setSessions(prev => prev.filter(s => s.id !== editingId));

                setSatellites(prev => {
                    const exists = prev.some(s => s.id === editingId);
                    return exists ? prev.map(s => s.id === editingId ? newSession : s) : [...prev, newSession];
                });
            } else {
                setSatellites(prev => [...prev, newSession]);
            }
            alert('已保存到本地卫星站！');
        } else {
            if (mode === 'update' && editingId) {
                // Check if it was in Satellites before
                const wasInSatellites = satellites.some(s => s.id === editingId);
                if (wasInSatellites) setSatellites(prev => prev.filter(s => s.id !== editingId));

                setSessions(prev => {
                    const exists = prev.some(s => s.id === editingId);
                    return exists ? prev.map(s => s.id === editingId ? newSession : s) : [...prev, newSession];
                });
            } else {
                setSessions(prev => [...prev, newSession]);
            }
            alert('已添加到本地日程表！');
        }
        setEditingId(null);
    };

    // --- MOCK ENROLLMENT LOGIC ---
    const handleEnrollSession = async (sessionId: string, action: 'enroll' | 'cancel') => {
        if (!user) {
            alert('请先登录！');
            return;
        }

        const updateDataStore = (
            dataStore: SessionData[],
            setDataStore: React.Dispatch<React.SetStateAction<SessionData[]>>
        ) => {
            let found = false;
            const newData = dataStore.map(s => {
                if (s.id === sessionId) {
                    found = true;
                    const enrolledUsers = s.enrolledUsers || [];
                    if (action === 'enroll') {
                        if (enrolledUsers.some(u => u.userId === user.id)) return s; // Already enrolled
                        if (s.currentPlayers >= s.maxPlayers) {
                            alert('人数已满！');
                            return s;
                        }
                        return {
                            ...s,
                            currentPlayers: s.currentPlayers + 1,
                            enrolledUsers: [...enrolledUsers, { userId: user.id, username: user.username, contact: user.contact }]
                        };
                    } else {
                        return {
                            ...s,
                            currentPlayers: Math.max(0, s.currentPlayers - 1),
                            enrolledUsers: enrolledUsers.filter(u => u.userId !== user.id)
                        };
                    }
                }
                return s;
            });
            if (found) setDataStore(newData);
            return found;
        };

        const foundInSessions = updateDataStore(sessions, setSessions);
        if (!foundInSessions) {
            updateDataStore(universitySessions, setUniversitySessions);
        }

        // Note: In a real system, we'd also sync this back to Vika/Backend here via an API call.
        // For testing, local state update is sufficient.
    };

    const handleExplodeSession = async (id: string) => {
        if (cloudConfig.enabled) {
            const target = [...sessions, ...satellites].find(s => s.id === id);
            if (target) {
                const updated = { ...target, isExploded: !target.isExploded };
                setIsSyncing(true);
                try {
                    // Pass _sourceDatasheetId so we update the correct table
                    await VikaService.updateSession(cloudConfig, updated, target._sourceDatasheetId);
                    await refreshCloudData();
                } catch (e: any) { alert(e.message) }
                finally { setIsSyncing(false); }
            }
            return;
        }

        // Local
        if (sessions.some(s => s.id === id)) {
            setSessions(prev => prev.map(s => s.id === id ? { ...s, isExploded: !s.isExploded } : s));
        } else if (satellites.some(s => s.id === id)) {
            setSatellites(prev => prev.map(s => s.id === id ? { ...s, isExploded: !s.isExploded } : s));
        }
    };

    const handleEditSession = (id: string) => {
        const target = sessions.find(s => s.id === id) || satellites.find(s => s.id === id) || universitySessions.find(s => s.id === id);
        if (target) {
            setFormData(target);
            setEditingId(id);
            setActiveTab('generator');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ ...INITIAL_SESSION, date: formData.date });
        alert('已退出编辑模式');
    };

    // --- Util Handlers ---
    const handleCopyFromLastWeek = async () => {
        if (!confirm('确定要从上周复制？这将在云端创建新记录。')) return;

        const today = new Date();
        const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
        const lastWeekStart = subDays(currentWeekStart, 7);
        const lastWeekEnd = subDays(currentWeekStart, 1);
        const lastWeekStartStr = format(lastWeekStart, 'yyyy-MM-dd');
        const lastWeekEndStr = format(lastWeekEnd, 'yyyy-MM-dd');

        const sourceSessions = sessions.filter(s =>
            s.date >= lastWeekStartStr && s.date <= lastWeekEndStr && s.status !== '卫星' && !s.isExploded
        );

        if (sourceSessions.length === 0) { alert('没找到上周数据'); return; }

        if (cloudConfig.enabled) {
            setIsSyncing(true);
            try {
                // Sequential with Delay to prevent 429
                let count = 0;
                for (const s of sourceSessions) {
                    const newDate = addDays(parseISO(s.date), 7);
                    const newSession = {
                        ...s,
                        id: Date.now().toString() + Math.random().toString().slice(2, 6),
                        recordId: undefined, // Clear Cloud ID
                        _sourceDatasheetId: undefined,
                        date: format(newDate, 'yyyy-MM-dd'),
                        status: '招募中' as const,
                        currentPlayers: 1,
                        isExploded: false
                    };
                    // Copy implies a Schedule item, so use main datasheetId
                    await VikaService.createSession(cloudConfig, newSession, cloudConfig.datasheetId);
                    // Safe delay
                    await new Promise(r => setTimeout(r, 600));
                    count++;
                }

                await refreshCloudData();
                alert(`成功复制 ${count} 个团到本周！`);
            } catch (e: any) {
                alert('复制失败: ' + e.message);
            } finally {
                setIsSyncing(false);
            }
        } else {
            // Local Copy Logic
            const newSessions = sourceSessions.map((s, index) => {
                const newDate = addDays(parseISO(s.date), 7);
                return {
                    ...s,
                    id: (Date.now() + index).toString(),
                    date: format(newDate, 'yyyy-MM-dd'),
                    status: '招募中' as const,
                    currentPlayers: 1,
                    isExploded: false
                };
            });
            setSessions(prev => [...prev, ...newSessions]);
            alert(`本地复制成功: ${newSessions.length} 个`);
        }
    };

    const handleImportSchedule = (data: SessionData[]) => {
        if (cloudConfig.enabled) {
            alert('云端模式下不支持直接导入覆盖，请使用"添加新团"功能。');
            return;
        }
        if (Array.isArray(data)) {
            const satImport = data.filter(s => s.status === '卫星');
            const schedImport = data.filter(s => s.status !== '卫星');
            if (schedImport.length > 0) setSessions(schedImport);
            if (satImport.length > 0) setSatellites(satImport);
            alert(`导入成功!`);
        }
    };

    // --- Image Gen ---
    const downloadSmartImage = async () => {
        if (cardRef.current) {
            setIsDownloading(true);
            try {
                const imageBlob = await toBlob(cardRef.current, {
                    cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff',
                    fetchRequestInit: { mode: 'cors' }
                });
                if (!imageBlob) throw new Error('Blob generation failed');
                const delimiter = "\n\n====TRPG_DATA====\n";
                const jsonString = JSON.stringify(formData);
                const smartBlob = new Blob([imageBlob, delimiter, jsonString], { type: 'image/png' });
                const url = URL.createObjectURL(smartBlob);
                const link = document.createElement('a');
                link.download = `trpg-${formData.moduleName}.png`;
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                console.error('Failed to generate image', err);
                alert('生成图片失败，请重试。');
            } finally {
                setIsDownloading(false);
            }
        }
    };

    const copyImageToClipboard = async () => {
        if (!cardRef.current) return;
        setIsCopying(true);
        try {
            if (!navigator.clipboard || !navigator.clipboard.write) throw new Error("Browser not supported");
            const blob = await toBlob(cardRef.current, {
                cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff',
                fetchRequestInit: { mode: 'cors' }
            });
            if (blob) await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        } catch (err: any) {
            alert(`复制失败: ${err.message}`);
        } finally {
            setTimeout(() => setIsCopying(false), 2000);
        }
    };

    const handleShareLink = () => {
        if (!cloudConfig.publicShareUrl) {
            alert("请先在【设置】中配置维格表的公开分享链接。");
            setActiveTab('settings');
            return;
        }
        navigator.clipboard.writeText(cloudConfig.publicShareUrl);
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
            <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                                <Dice5 size={20} />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-slate-900 hidden sm:inline">成都秘密基地 <span className="text-indigo-600">CardGen</span></span>
                            <span className="font-bold text-lg text-indigo-600 sm:hidden">CardGen</span>
                        </div>

                        {/* Status Indicator & Share */}
                        <div className="flex-1 flex justify-end px-4 gap-2 items-center">
                            {user ? (
                                <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-full border border-slate-200">
                                    <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
                                        {user.username.charAt(0)}
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">{user.username}</span>
                                    <div className="w-px h-4 bg-slate-200"></div>
                                    <button onClick={logout} className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors">退出</button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => login({ id: 'u_12345', username: '模拟玩家', contact: 'QQ: 88888', sysRole: 'player' })}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-full transition-colors border border-indigo-100"
                                    title="模拟用户登录以测试报名功能"
                                >
                                    模拟登录
                                </button>
                            )}

                            {cloudConfig.enabled && (
                                <>
                                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                                        <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-green-500'}`}></div>
                                        <span className="text-xs font-bold text-indigo-700 hidden md:inline">
                                            {isSyncing ? '同步中' : '已联网'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleShareLink}
                                        className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 text-xs font-bold hover:bg-green-100 transition-colors"
                                        title="复制公开链接发给玩家"
                                    >
                                        {shareCopied ? <Check size={14} /> : <Share2 size={14} />}
                                        <span className="hidden sm:inline">{shareCopied ? '已复制' : '分享链接'}</span>
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="flex space-x-1 sm:space-x-2 items-center">
                            <button onClick={() => setActiveTab('generator')} className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'generator' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                <FileText size={18} className="sm:mr-2 inline" /> <span className="hidden sm:inline">制卡</span>
                            </button>
                            <button onClick={() => setActiveTab('schedule')} className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'schedule' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                <CalendarIcon size={18} className="sm:mr-2 inline" /> <span className="hidden sm:inline">俱乐部日程</span>
                            </button>
                            {userRole === 'student' && (
                                <button onClick={() => setActiveTab('university')} className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'university' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                    <CalendarIcon size={18} className="sm:mr-2 inline" /> <span className="hidden sm:inline">高校约团</span>
                                </button>
                            )}
                            <button onClick={() => setActiveTab('satellite')} className={`p-2 sm:px-3 sm:py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'satellite' ? 'bg-sky-50 text-sky-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                <Rocket size={18} className="sm:mr-2 inline" /> <span className="hidden sm:inline">卫星</span>
                            </button>
                            <div className="w-px h-6 bg-slate-200 mx-1"></div>
                            <button onClick={() => setActiveTab('settings')} className={`p-2 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-slate-50 ${activeTab === 'settings' ? 'text-indigo-600 bg-indigo-50' : ''}`}>
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* SETTINGS TAB */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                                <div className="bg-indigo-100 p-2.5 rounded-lg text-indigo-600">
                                    <Cloud size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800">云端同步设置 (测试版)</h2>
                                    <p className="text-sm text-slate-500">连接 <a href="https://vika.cn" target="_blank" className="text-indigo-600 hover:underline">维格表 (Vika)</a> 实现多人在线协作</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 leading-relaxed">
                                    <p className="font-bold mb-2">如何配置？</p>
                                    <ol className="list-decimal pl-5 space-y-1">
                                        <li>注册并登录 <a href="https://vika.cn" target="_blank" className="underline">vika.cn</a>。</li>
                                        <li>新建 <strong>2 个表格</strong>（建议）。一个叫“日程表”，一个叫“卫星站”。</li>
                                        <li>将首列重命名为 <code>title</code>，新建长文本列 <code>data</code>。</li>
                                        <li>获取 Token 和 两个表格的 ID 填入下方。</li>
                                    </ol>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">API Token (仅管理员)</label>
                                    <input
                                        type="password"
                                        value={cloudConfig.apiToken}
                                        onChange={e => setCloudConfig(prev => ({ ...prev, apiToken: e.target.value }))}
                                        placeholder="usk..."
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">日程表 ID (俱乐部团)</label>
                                        <input
                                            type="text"
                                            value={cloudConfig.datasheetId}
                                            onChange={e => setCloudConfig(prev => ({ ...prev, datasheetId: e.target.value }))}
                                            placeholder="dst..."
                                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">高校约团 ID (学生限定)</label>
                                        <input
                                            type="text"
                                            value={cloudConfig.universityDatasheetId || ''}
                                            onChange={e => setCloudConfig(prev => ({ ...prev, universityDatasheetId: e.target.value }))}
                                            placeholder="dst..."
                                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1">
                                            卫星站 ID (可选)
                                            <span className="ml-1 text-[10px] text-indigo-600 bg-indigo-50 px-1 rounded">推荐分离</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={cloudConfig.satelliteDatasheetId || ''}
                                            onChange={e => setCloudConfig(prev => ({ ...prev, satelliteDatasheetId: e.target.value }))}
                                            placeholder="dst... (分离存储)"
                                            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                        />
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
                                            开发人员选项 / 身份模拟
                                        </label>
                                        <div className="flex gap-2">
                                            {(['social', 'student'] as UserRole[]).map(role => (
                                                <button
                                                    key={role}
                                                    onClick={() => setUserRole(role)}
                                                    className={`flex-1 py-2 rounded font-bold text-xs border transition-all ${userRole === role ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    {role === 'social' ? '社会人身份' : '学生党身份'}
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 italic">
                                            提示：后端接入后，此处的角色应由服务器通过 API 下发，而非手动切换。
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1">
                                        玩家公开阅读链接
                                        <span className="ml-2 text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded">推荐配置</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={cloudConfig.publicShareUrl || ''}
                                        onChange={e => setCloudConfig(prev => ({ ...prev, publicShareUrl: e.target.value }))}
                                        placeholder="https://vika.cn/share/..."
                                        className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">配置后，点击右上角的“分享链接”按钮即可快速发给群友。</p>
                                </div>

                                <div className="pt-4 flex items-center justify-between border-t border-slate-100 mt-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-700">启用云端同步</span>
                                        <button
                                            onClick={() => setCloudConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                                            className={`w-12 h-6 rounded-full transition-colors relative ${cloudConfig.enabled ? 'bg-green-500' : 'bg-slate-300'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${cloudConfig.enabled ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    <button onClick={refreshCloudData} disabled={!cloudConfig.enabled || isSyncing} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg font-bold hover:bg-indigo-100 disabled:opacity-50">
                                        <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
                                        测试连接 / 立即同步
                                    </button>
                                </div>

                                {/* Migration Tool - Only shows if Cloud is enabled and local data exists */}
                                {cloudConfig.enabled && localDataCount > 0 && (
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex gap-3">
                                            <div className="bg-amber-100 p-2 rounded-lg h-fit text-amber-600"><Database size={20} /></div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-amber-800 text-sm">检测到本地残留数据</h3>
                                                <p className="text-xs text-amber-700 mt-1 mb-3">
                                                    您的浏览器本地缓存中还有 {localDataCount} 条团务记录。
                                                </p>
                                                <button
                                                    onClick={handleMigrateLocalToCloud}
                                                    disabled={isSyncing}
                                                    className="bg-amber-600 text-white px-3 py-2 rounded text-xs font-bold hover:bg-amber-700 flex items-center gap-2 transition shadow-sm disabled:opacity-50"
                                                >
                                                    {isSyncing ? <span className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" /> : <Upload size={14} />}
                                                    一键上传本地数据到云端
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {cloudError && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded text-sm flex items-center gap-2">
                                        <AlertTriangle size={16} /> {cloudError}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* GENERATOR TAB */}
                {activeTab === 'generator' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        <div className="lg:col-span-5 space-y-6">
                            <SessionForm
                                data={formData}
                                onChange={setFormData}
                                onSave={handleSaveSession}
                                isEditing={!!editingId}
                                onCancelEdit={handleCancelEdit}
                                isUniversityMode={activeTab === 'university'}
                            />
                        </div>
                        <div className="lg:col-span-7 flex flex-col items-center">
                            <div className="sticky top-24 space-y-6 flex flex-col items-center w-full">
                                <div className="bg-slate-200 p-8 rounded-xl shadow-inner flex justify-center overflow-hidden w-full max-w-[550px]">
                                    <PreviewCard ref={cardRef} data={formData} />
                                </div>
                                <div className="flex gap-3 w-full max-w-[500px]">
                                    <button onClick={copyImageToClipboard} disabled={isCopying} className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
                                        {isCopying ? <Check size={18} className="text-green-600" /> : <Copy size={18} />} {isCopying ? '已复制' : '复制预览图'}
                                    </button>
                                    <button onClick={downloadSmartImage} disabled={isDownloading} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-indigo-200">
                                        {isDownloading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : <Download size={18} />} {isDownloading ? '生成中...' : '下载招募图 (含数据)'}
                                    </button>
                                </div>
                                {cloudConfig.enabled ? (
                                    <div className="flex items-start gap-2 bg-green-50 border border-green-100 p-3 rounded-lg w-full max-w-[500px]">
                                        <Cloud size={16} className="text-green-600 shrink-0 mt-0.5" />
                                        <div className="text-xs text-green-800">
                                            <p className="font-bold mb-1">云端同步已开启</p>
                                            {cloudConfig.satelliteDatasheetId ? '双表模式运行中：日程表与卫星站已分离存储。' : '当前为单表模式，建议在设置中配置独立的卫星站ID以获得更好的体验。'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 p-3 rounded-lg w-full max-w-[500px]">
                                        <AlertTriangle size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                                        <div className="text-xs text-indigo-800">
                                            <p className="font-bold mb-1">本地模式 (单机)</p>
                                            数据仅保存在此浏览器。如需多人协作，请前往设置开启云端同步。
                                        </div>
                                    </div>
                                )}
                                <div className="w-full max-w-[500px]"><CodeManager data={formData} onImport={setFormData} /></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SCHEDULE TAB */}
                {activeTab === 'schedule' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900">俱乐部日程</h2>
                                    {cloudConfig.enabled && <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded font-bold">CLOUD</span>}
                                </div>
                                <p className="text-slate-500 text-sm mt-1">
                                    {cloudConfig.enabled ? '正在显示俱乐部云端日程' : '正在显示本地数据'}
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={refreshCloudData} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600" title="刷新数据">
                                    <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
                                </button>
                                <button onClick={() => setActiveTab('generator')} className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-medium hover:bg-indigo-100 transition-colors">
                                    <Plus size={14} /> 添加新团
                                </button>
                            </div>
                        </div>
                        <ScheduleGrid
                            sessions={sessions}
                            satellites={satellites}
                            onExplode={handleExplodeSession}
                            onEdit={handleEditSession}
                            onImport={handleImportSchedule}
                            onCopyLastWeek={handleCopyFromLastWeek}
                            onEnroll={handleEnrollSession}
                        />
                    </div>
                )}

                {/* UNIVERSITY TAB */}
                {activeTab === 'university' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-end">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">成都高校公共约团</h2>
                                    <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded font-bold uppercase tracking-widest">Open Community</span>
                                </div>
                                <p className="text-slate-500 text-sm mt-1">
                                    本页面由各大高校跑团社团维护，所有团务均在校内或周边进行。
                                    <br className="my-1" />
                                    <span className="inline-block mt-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-100 font-medium">免责声明：本页面系成都秘密基地TRPG俱乐部为支持各大高校TRPG社群而无偿提供的公共信息发布平台。俱乐部不对本平台中由任何主持人、参与者及活动场地之间产生的任何经济纠纷或意外损失承担法律责任。请各位玩家自行甄别活动信息，注意人身及财产安全。</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={refreshCloudData} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600" title="刷新数据">
                                    <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
                                </button>
                                <button onClick={() => { setActiveTab('generator'); setFormData({ ...INITIAL_UNIVERSITY_SESSION, date: formData.date }); }} className="flex items-center gap-1 text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium hover:bg-emerald-100 transition-colors">
                                    <Plus size={14} /> 发布高校团
                                </button>
                            </div>
                        </div>
                        <UniversityScheduleGrid
                            sessions={universitySessions}
                            onExplode={handleExplodeSession}
                            onEdit={handleEditSession}
                            onEnroll={handleEnrollSession}
                            onImport={handleImportSchedule}
                        />
                    </div>
                )}

                {/* SATELLITE TAB */}
                {activeTab === 'satellite' && (
                    <div className="space-y-6">
                        <SatelliteGrid
                            satellites={satellites}
                            onExplode={handleExplodeSession}
                            onEdit={handleEditSession}
                            onImport={handleImportSchedule}
                        />
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;