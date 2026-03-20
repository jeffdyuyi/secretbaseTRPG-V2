
import { SessionData, CloudConfig } from '../types';

// Vika API Base URL
const BASE_URL = 'https://api.vika.cn/fusion/v1';

// Helper to handle API errors
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Cloud Sync Error');
  }
  return response.json();
};

export const VikaService = {
  // 1. Fetch sessions from a SPECIFIC datasheet
  async fetchSessions(apiToken: string, datasheetId: string): Promise<SessionData[]> {
    if (!apiToken || !datasheetId) return [];

    const url = `${BASE_URL}/datasheets/${datasheetId}/records?fieldKey=name`;
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${apiToken}` }
    });
    
    const json = await handleResponse(response);
    if (json.success) {
      return json.data.records.map((record: any) => {
        try {
            const rawJson = record.fields['data'] || record.fields['元数据'];
            if (!rawJson) return null;
            const parsed = JSON.parse(rawJson);
            // Attach Vika Record ID AND the Source Datasheet ID for logic handling
            return { 
                ...parsed, 
                recordId: record.recordId,
                _sourceDatasheetId: datasheetId 
            };
        } catch (e) {
            console.warn('Failed to parse record', record.recordId);
            return null;
        }
      }).filter(Boolean);
    }
    return [];
  },

  // 2. Create a new session in a SPECIFIC datasheet
  async createSession(config: CloudConfig, session: SessionData, targetDatasheetId?: string): Promise<string> {
    const datasheetId = targetDatasheetId || config.datasheetId;
    if (!datasheetId) throw new Error("No datasheet ID provided");

    const url = `${BASE_URL}/datasheets/${datasheetId}/records`;
    
    // Prepare payload
    const recordValues = {
      "title": `${session.date} ${session.startTime} - ${session.moduleName}`,
      "data": JSON.stringify(session),
      
      // Visual Columns
      "模组": session.moduleName || '',
      "规则": session.ruleSystem || '',
      "GM": session.gmName || '',
      "状态": session.status,
      "类型": session.sessionType || '',
      "房间": session.roomId || '',
      "日期": session.date || '',
      "时间": session.startTime || '',
      "人数进度": `${session.currentPlayers}/${session.maxPlayers}`,
      "标签": Array.isArray(session.tags) ? session.tags.join(', ') : '',
      "简介": session.description || '',
      "联系方式": session.gmContact || ''
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        fieldKey: "name",
        records: [{ fields: recordValues }] 
      })
    });

    const json = await handleResponse(response);
    if (json.success && json.data.records.length > 0) {
        return json.data.records[0].recordId;
    }
    throw new Error('Create failed');
  },

  // 3. Update an existing session (Must know which datasheet it belongs to)
  async updateSession(config: CloudConfig, session: SessionData, targetDatasheetId?: string): Promise<void> {
    if (!session.recordId) throw new Error('Missing Cloud ID');
    const datasheetId = targetDatasheetId || session._sourceDatasheetId || config.datasheetId;
    
    const url = `${BASE_URL}/datasheets/${datasheetId}/records`;
    
    const recordValues = {
        "title": `${session.date} ${session.startTime} - ${session.moduleName}`,
        "data": JSON.stringify(session),
        
        "模组": session.moduleName || '',
        "规则": session.ruleSystem || '',
        "GM": session.gmName || '',
        "状态": session.status,
        "类型": session.sessionType || '',
        "房间": session.roomId || '',
        "日期": session.date || '',
        "时间": session.startTime || '',
        "人数进度": `${session.currentPlayers}/${session.maxPlayers}`,
        "标签": Array.isArray(session.tags) ? session.tags.join(', ') : '',
        "简介": session.description || '',
        "联系方式": session.gmContact || ''
    };

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        fieldKey: "name",
        records: [{ recordId: session.recordId, fields: recordValues }] 
      })
    });
    
    await handleResponse(response);
  },

  // 4. Delete a session
  async deleteSession(config: CloudConfig, recordId: string, targetDatasheetId?: string): Promise<void> {
    const datasheetId = targetDatasheetId || config.datasheetId;
    const url = `${BASE_URL}/datasheets/${datasheetId}/records?recordIds=${recordId}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${config.apiToken}` }
    });
    await handleResponse(response);
  }
};
