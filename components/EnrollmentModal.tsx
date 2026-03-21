import React from 'react';
import { User, SessionData } from '../types';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';

interface EnrollmentModalProps {
    session: SessionData;
    user: User;
    onConfirm: () => void;
    onCancel: () => void;
    isEnrolled: boolean;
}

export const EnrollmentModal: React.FC<EnrollmentModalProps> = ({ session, user, onConfirm, onCancel, isEnrolled }) => {
    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        {isEnrolled ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                        {isEnrolled ? '取消报名确认' : '报名参团确认'}
                    </h3>
                    <button onClick={onCancel} className="text-indigo-200 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">目标团务</div>
                        <div className="font-bold text-slate-800 text-lg">{session.moduleName}</div>
                        <div className="text-sm text-slate-600 mt-1">
                            {session.date} {session.startTime} · {session.roomId}
                        </div>
                    </div>

                    {!isEnrolled ? (
                        <>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                您即将报名该团。为了方便主持人（<span className="font-bold">{session.gmName}</span>）与您联系，系统将自动提交您的以下注册信息。
                                <strong className="text-red-500 ml-1">该操作不可逆转更改联系信息（需取消后重新报名）</strong>。
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">您的用户名</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={user.username}
                                        className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-slate-600 cursor-not-allowed outline-none font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">您的联系方式</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={user.contact}
                                        className="w-full bg-slate-100 border border-slate-200 rounded-lg p-3 text-slate-600 cursor-not-allowed outline-none font-medium"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1">此信息仅该团的创建者可见，其他玩家无法查看。</p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <p className="text-sm text-slate-600 leading-relaxed text-center py-4">
                            您确定要 <strong className="text-red-500">取消报名</strong> 该团吗？<br />
                            取消后您的位置将被释放，其他人可以报名。
                        </p>
                    )}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-5 py-2 font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        返回操作
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`px-5 py-2 font-bold text-white rounded-lg transition-colors shadow-sm ${isEnrolled ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        {isEnrolled ? '确认退出' : '确认报名信息并提交'}
                    </button>
                </div>
            </div>
        </div>
    );
};
