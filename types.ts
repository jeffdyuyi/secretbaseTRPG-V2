
export type RoomId = 'D4' | 'D6' | 'D8' | 'D10' | 'D12' | 'D20' | 'D100' | '大厅';

export const ROOM_IDS: RoomId[] = ['D4', 'D6', 'D8', 'D10', 'D12', 'D20', 'D100', '大厅'];

export type SessionType = '俱乐部团' | '活动团' | '商团' | '高校团';
export type SessionStatus = '招募中' | '计划中' | '已满员' | '已取消' | '拼车中' | '已结团' | '卫星';

export type UserRole = 'social' | 'student';

export interface User {
  id: string;
  username: string;
  contact: string;
  sysRole: 'player' | 'admin'; // For the backend system role
}

export interface EnrolledUser {
  userId: string;
  username: string;
  contact: string;
}

export interface SessionData {
  id: string;
  recordId?: string; // Vika Record ID for cloud sync
  _sourceDatasheetId?: string; // Runtime tracking: which datasheet did this come from?
  ruleSystem: string;
  moduleName: string;
  gmName: string;
  gmContact: string;
  date: string; // YYYY-MM-DD or Free text for Satellite
  startTime: string; // HH:mm or Free text for Satellite
  weekday: string; // Calculated
  currentPlayers: number;
  maxPlayers: number;
  description: string;
  tags: string[];
  notes: string;
  roomId: RoomId;
  customLocation?: string; // For University mode
  sessionType: SessionType;
  status: SessionStatus;
  isExploded?: boolean;
  moduleFontSize?: number; // UI font size for module name
  ruleFontSize?: number; // UI font size for rule system
  enrolledUsers?: EnrolledUser[]; // Array of users enrolled in this session
}

export interface GMProfile {
  id: string;
  name: string;
  contact: string;
}

export interface CardTemplate {
  id: string;
  name: string; // User defined name for the template
  data: SessionData;
}

export interface CloudConfig {
  apiToken: string;
  datasheetId: string; // Main schedule table
  satelliteDatasheetId?: string; // Optional separate table for satellites
  universityDatasheetId?: string; // New table for university groups
  publicShareUrl?: string; // New field for the public read-only link
  enabled: boolean;
}

export const INITIAL_SESSION: SessionData = {
  id: '',
  ruleSystem: 'D&D 5E',
  moduleName: '矿坑的失落回声',
  gmName: '',
  gmContact: '',
  date: new Date().toISOString().split('T')[0],
  startTime: '19:30',
  weekday: '',
  currentPlayers: 1,
  maxPlayers: 4,
  description: '在一个被遗忘的矿坑深处，回声不仅仅是声音的反射...',
  tags: ['新手友好', '重解谜', '微恐怖'],
  notes: '请自备人物卡，可以使用扩展内容。',
  roomId: 'D20',
  sessionType: '俱乐部团',
  status: '招募中',
  moduleFontSize: 30,
  ruleFontSize: 14
};

export const INITIAL_UNIVERSITY_SESSION: SessionData = {
  ...INITIAL_SESSION,
  roomId: '大厅', // Placeholder
  customLocation: '四川大学望江校区XX教室',
  sessionType: '高校团'
};
