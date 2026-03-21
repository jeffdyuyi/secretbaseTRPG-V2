import React, { useState, useEffect } from 'react';
import { SessionData, ROOM_IDS, RoomId, SessionType, SessionStatus, GMProfile, CardTemplate } from '../types';
import { Plus, X, BookOpen, Trash2, ChevronDown, RefreshCw, Copy, RotateCcw } from 'lucide-react';

interface SessionFormProps {
  data: SessionData;
  onChange: (data: SessionData) => void;
  onSave: (mode: 'create' | 'update') => void;
  isEditing: boolean;
  onCancelEdit: () => void;
  isUniversityMode?: boolean;
}

export const SessionForm: React.FC<SessionFormProps> = ({ data, onChange, onSave, isEditing, onCancelEdit, isUniversityMode }) => {
  const [gmProfiles, setGmProfiles] = useState<GMProfile[]>([]);
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    const savedGms = localStorage.getItem('trpg_gm_profiles');
    if (savedGms) setGmProfiles(JSON.parse(savedGms));

    const savedTemplates = localStorage.getItem('trpg_card_templates');
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
  }, []);

  const saveGmProfile = (name: string, contact: string) => {
    if (!name.trim() || !contact.trim()) return;
    const exists = gmProfiles.some(p => p.name === name.trim() && p.contact === contact.trim());
    if (!exists) {
      const newProfile = { id: Date.now().toString(), name: name.trim(), contact: contact.trim() };
      const updated = [...gmProfiles, newProfile];
      setGmProfiles(updated);
      localStorage.setItem('trpg_gm_profiles', JSON.stringify(updated));
    }
  };

  const handleSaveClick = (mode: 'create' | 'update') => {
    if (!data.gmName.trim() || !data.gmContact.trim()) {
      alert("请填写主持人姓名和联系方式。");
      return;
    }
    saveGmProfile(data.gmName, data.gmContact);
    onSave(mode);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) { alert('请输入模板名称'); return; }
    if (!data.gmName.trim() || !data.gmContact.trim()) { alert("请先填写主持人信息。"); return; }

    const newTemplate: CardTemplate = {
      id: Date.now().toString(),
      name: templateName,
      data: { ...data }
    };
    const updated = [...templates, newTemplate];
    setTemplates(updated);
    localStorage.setItem('trpg_card_templates', JSON.stringify(updated));
    setTemplateName('');
    saveGmProfile(data.gmName, data.gmContact);
    alert('卡牌模板已保存！');
  };

  const handleLoadTemplate = (t: CardTemplate) => {
    if (confirm(`加载模板 "${t.name}" ?`)) {
      onChange({
        ...t.data,
        id: '',
        date: new Date().toISOString().split('T')[0],
        status: '招募中'
      });
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('删除此模板？')) {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem('trpg_card_templates', JSON.stringify(updated));
    }
  };

  const handleSelectGm = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profile = gmProfiles.find(p => p.id === e.target.value);
    if (profile) onChange({ ...data, gmName: profile.name, gmContact: profile.contact });
  };

  const handleDeleteGm = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (confirm('删除此主持人信息？')) {
      const updated = gmProfiles.filter(p => p.id !== id);
      setGmProfiles(updated);
      localStorage.setItem('trpg_gm_profiles', JSON.stringify(updated));
    }
  };

  const handleChange = (field: keyof SessionData, value: any) => {
    // Logic for '商团' exclusive '拼车中'
    if (field === 'sessionType' && value !== '商团' && data.status === '拼车中') {
      onChange({ ...data, [field]: value, status: '招募中' });
    } else if (field === 'status' && value === '卫星') {
      // Reset date/time to text friendly defaults if switching to Satellite
      onChange({ ...data, [field]: value, date: '待定', startTime: '人满即开' });
    } else if (field === 'status' && data.status === '卫星' && value !== '卫星') {
      // Reset to date format if switching FROM Satellite
      onChange({ ...data, [field]: value, date: new Date().toISOString().split('T')[0], startTime: '19:30' });
    } else {
      onChange({ ...data, [field]: value });
    }
  };

  const handleFormat = (field: 'description' | 'notes', prefix: string, suffix: string) => {
    const el = document.getElementById(`${field}-textarea`) as HTMLTextAreaElement;
    if (el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const text = data[field];
      const selectedText = text.substring(start, end) || (field === 'description' ? '描述文字' : '备注文字');
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      handleChange(field, newText);

      // Delay focus and selection sync
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      }, 0);
    } else {
      // Fallback if no selection
      handleChange(field, data[field] + prefix + (field === 'description' ? '描述文字' : '备注文字') + suffix);
    }
  };

  const handleTagAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = e.currentTarget.value.trim();
      if (val && !data.tags.includes(val)) {
        handleChange('tags', [...data.tags, val]);
        e.currentTarget.value = '';
      }
    }
  };

  const isSatellite = data.status === '卫星';

  return (
    <div className="space-y-5 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex items-center justify-between border-b pb-3 mb-2">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          团务信息编辑
          {isEditing && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold animate-pulse">EDITING</span>}
        </h2>
        <button onClick={() => setShowLibrary(!showLibrary)} className="text-xs flex items-center gap-1 text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition">
          <BookOpen size={14} /> {showLibrary ? '关闭库' : '打开模板库'}
        </button>
      </div>

      {showLibrary && (
        <div className="bg-indigo-50/50 p-4 rounded-lg border border-indigo-100 animate-in fade-in slide-in-from-top-2">
          <div className="flex gap-2 mb-3">
            <input type="text" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="新模板名称..." className="flex-1 text-xs p-2 border border-indigo-200 rounded" />
            <button onClick={handleSaveTemplate} className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded hover:bg-indigo-700">保存</button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
            {templates.map(t => (
              <div key={t.id} className="flex items-center justify-between bg-white p-2 rounded border border-indigo-50 shadow-sm group hover:border-indigo-200 transition">
                <span className="text-xs font-bold text-slate-700 truncate">{t.name}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleLoadTemplate(t)} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 rounded font-bold">读取</button>
                  <button onClick={() => handleDeleteTemplate(t.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Type & Status */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 space-y-3">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Session Type</label>
          <div className="flex gap-2">
            {(['俱乐部团', '活动团', '商团', '高校团'] as SessionType[]).map(type => {
              const isStudent = localStorage.getItem('trpg_user_role') === 'student';
              if (type === '高校团' && !isUniversityMode && !isStudent) return null;

              const isActive = data.sessionType === type;
              const activeClass = type === '高校团'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-100'
                : 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-100';

              return (
                <button key={type} onClick={() => handleChange('sessionType', type)}
                  className={`flex-1 py-1.5 rounded text-xs font-bold transition-all border shadow-sm ${isActive ? activeClass : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}>
                  {type}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Status</label>
          <div className="flex flex-wrap gap-2">
            {(['招募中', '计划中', '已满员', '已取消', '已结团', '拼车中', '卫星'] as SessionStatus[]).map(status => {
              if (status === '拼车中' && data.sessionType !== '商团') return null;
              return (
                <button key={status} onClick={() => handleChange('status', status)}
                  className={`py-1 px-3 rounded text-[10px] font-bold border transition-colors ${data.status === status ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200'
                    }`}>
                  {status}
                </button>
              );
            })}
          </div>
          {isSatellite && <p className="text-[10px] text-amber-600 mt-2 font-bold">* 卫星团将保存到独立库中，不占用日程表位置。</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-text">Rule System</label>
          <input type="text" value={data.ruleSystem} onChange={e => handleChange('ruleSystem', e.target.value)} className="input-field" placeholder="D&D 5E" />
        </div>
        <div>
          <label className="label-text">Module Name</label>
          <input type="text" value={data.moduleName} onChange={e => handleChange('moduleName', e.target.value)} className="input-field font-bold" />
        </div>
      </div>

      {/* GM Info */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
        <div className="flex justify-between items-center mb-2">
          <label className="label-text">GM Identity</label>
          <div className="relative">
            <select onChange={handleSelectGm} className="text-[10px] p-1 pr-6 bg-white border border-slate-200 rounded appearance-none focus:outline-none" defaultValue="">
              <option value="" disabled>选择存好的身份...</option>
              {gmProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <ChevronDown size={10} className="absolute right-1 top-2 text-slate-400 pointer-events-none" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input type="text" value={data.gmName} onChange={(e) => handleChange('gmName', e.target.value)} className="input-field" placeholder="姓名" />
          <input type="text" value={data.gmContact} onChange={e => handleChange('gmContact', e.target.value)} className={`input-field ${!data.gmContact ? 'bg-amber-50 border-amber-200' : ''}`} placeholder="联系方式 (必填)" />
        </div>
        {gmProfiles.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {gmProfiles.map(p => (
              <span key={p.id} className="text-[9px] bg-white border border-slate-200 rounded px-1.5 py-0.5 text-slate-500 flex items-center gap-1">
                {p.name} <button onClick={(e) => handleDeleteGm(e, p.id)} className="hover:text-red-500"><X size={8} /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Time & Players */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label-text">Date</label>
              {isSatellite ? (
                <input type="text" value={data.date} onChange={e => handleChange('date', e.target.value)} className="input-field" placeholder="日期说明" />
              ) : (
                <input type="date" value={data.date} onChange={e => handleChange('date', e.target.value)} className="input-field" />
              )}
            </div>
            <div>
              <label className="label-text">Time</label>
              {isSatellite ? (
                <input type="text" value={data.startTime} onChange={e => handleChange('startTime', e.target.value)} className="input-field" placeholder="时间说明" />
              ) : (
                <input type="time" value={data.startTime} onChange={e => handleChange('startTime', e.target.value)} className="input-field" />
              )}
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><label className="label-text">Current</label><input type="number" min="0" value={data.currentPlayers} onChange={e => handleChange('currentPlayers', parseInt(e.target.value))} className="input-field" /></div>
            <div><label className="label-text">Max</label><input type="number" min="1" value={data.maxPlayers} onChange={e => handleChange('maxPlayers', parseInt(e.target.value))} className="input-field" /></div>
          </div>
        </div>
      </div>

      <div>
        {(isUniversityMode || data.sessionType === '高校团') ? (
          <>
            <label className="label-text mb-1">地址 (自定义)</label>
            <input
              type="text"
              value={data.customLocation || ''}
              onChange={e => handleChange('customLocation', e.target.value)}
              className="input-field"
              placeholder="请输入详细地址，如：XX大学XX教学楼"
            />
          </>
        ) : (
          <>
            <label className="label-text mb-1">Room</label>
            <select value={data.roomId} onChange={e => handleChange('roomId', e.target.value as RoomId)} className="input-field">
              {ROOM_IDS.map(id => <option key={id} value={id}>{id === '大厅' ? id : `${id} 房间`}</option>)}
            </select>
          </>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="label-text mb-0">Description</label>
            <div className="flex gap-1">
              <button title="加粗 (Ctrl+B)" onClick={(e) => { e.preventDefault(); handleFormat('description', '**', '**'); }} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors border border-slate-200">B</button>
              <button title="斜体 (Ctrl+I)" onClick={(e) => { e.preventDefault(); handleFormat('description', '*', '*'); }} className="text-[10px] italic font-serif bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors border border-slate-200">I</button>
            </div>
          </div>
          <textarea id="description-textarea" rows={3} value={data.description} onChange={e => handleChange('description', e.target.value)} className="input-field text-xs leading-relaxed" />
        </div>
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="label-text mb-0">Notes</label>
            <div className="flex gap-1">
              <button title="加粗 (Ctrl+B)" onClick={(e) => { e.preventDefault(); handleFormat('notes', '**', '**'); }} className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors border border-slate-200">B</button>
              <button title="斜体 (Ctrl+I)" onClick={(e) => { e.preventDefault(); handleFormat('notes', '*', '*'); }} className="text-[10px] italic font-serif bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded transition-colors border border-slate-200">I</button>
            </div>
          </div>
          <textarea id="notes-textarea" rows={2} value={data.notes} onChange={e => handleChange('notes', e.target.value)} className="input-field text-xs leading-relaxed" />
        </div>
      </div>

      <div>
        <label className="label-text mb-2">Tags</label>
        <div className="flex flex-wrap gap-2 mb-2 min-h-[24px]">
          {data.tags.map(tag => (
            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
              #{tag} <button onClick={() => handleChange('tags', data.tags.filter(t => t !== tag))} className="ml-1 hover:text-indigo-900"><X size={10} /></button>
            </span>
          ))}
        </div>
        <input type="text" placeholder="Add tag + Enter..." onKeyDown={handleTagAdd} className="input-field" />
      </div>

      {isEditing ? (
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
          <button onClick={() => handleSaveClick('update')} className="bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow text-sm">
            <RefreshCw size={14} /> 覆盖保存
          </button>
          <button onClick={() => handleSaveClick('create')} className="bg-emerald-600 text-white py-2.5 rounded-lg font-bold hover:bg-emerald-700 flex items-center justify-center gap-2 shadow text-sm">
            <Copy size={14} /> 另存新团
          </button>
          <button onClick={onCancelEdit} className="col-span-2 bg-slate-100 text-slate-500 py-2 rounded-lg font-bold hover:bg-slate-200 flex items-center justify-center gap-2 text-xs">
            <RotateCcw size={12} /> 退出编辑
          </button>
        </div>
      ) : (
        <button onClick={() => handleSaveClick('create')} className={`w-full mt-4 text-white py-3 rounded-lg font-bold transition shadow-lg flex items-center justify-center gap-2 text-sm ${isSatellite ? 'bg-sky-600 hover:bg-sky-700' : 'bg-slate-900 hover:bg-slate-800'}`}>
          <Plus size={16} /> {isSatellite ? '添加到卫星观测站' : '保存到日程表'}
        </button>
      )}

      <style>{`
        .label-text { display: block; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .input-field { width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; outline: none; transition: all; }
        .input-field:focus { border-color: #6366f1; ring: 2px solid #e0e7ff; }
      `}</style>
    </div>
  );
};