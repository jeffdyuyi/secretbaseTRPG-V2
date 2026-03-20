# 成都高校面团公共约团系统 — 后端技术方案

## 1. 业务背景与角色定义

系统旨在服务两类用户群体，通过注册环节的**邀请码**进行身份识别：

- **社会人 (Social)**：只能访问“俱乐部”页面。
- **学生党 (Student)**：拥有双重权限，可同时访问“俱乐部”和“高校面团”页面。

## 2. 核心技术栈建议

- **语言/框架**：Node.js (NestJS/Express) 或 Python (FastAPI/Django)
- **数据库**：PostgreSQL 或 MySQL (存储用户信息及邀请码)
- **缓存**：Redis (存储 JWT 黑名单或频率限制)
- **认证**：JWT (JSON Web Token)
- **前端对接**：现有 React 前端扩展 Tab 逻辑

## 3. 数据库设计 (ER 简图)

### 3.1 用户表 (Users)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| id | UUID/Int | 主键 |
| username | String | 唯一账号 |
| password_hash | String | 加密后的密码 |
| role | Enum | `social` 或 `student` |
| university | String | (可选) 所属学校，仅学生有效 |
| created_at | DateTime | 注册时间 |

### 3.2 邀请码表 (InvitationCodes)
| 字段名 | 类型 | 说明 |
| :--- | :--- | :--- |
| code | String | 唯一码 (如: STU-XXXX, SOC-XXXX) |
| type | Enum | `student_invite` 或 `social_invite` |
| is_used | Boolean | 是否已使用 |
| used_by | UserID | 被哪个用户使用 |
| expires_at | DateTime | 过期时间 |

## 4. 关键流程设计

### 4.1 注册流程
1. 用户提交：账号、密码、**邀请码**。
2. 后端校验邀请码：
   - 匹配 `STU-` 开头且未使用的码：赋予 `student` 角色。
   - 匹配 `SOC-` 开头且未使用的码：赋予 `social` 角色。
   - 校验失败：返回 403 错误。
3. 注册成功：标记邀请码为“已使用”。

### 4.2 鉴权与下发
1. 登录成功后，后端返回 JWT。
2. **Payload 包含 `role` 字段**。
3. 前端解析角色，决定 UI 的 Tab 开关：
   - `role === 'student'` -> 显示“高校约团” + “俱乐部日程”
   - `role === 'social'` -> 仅显示“俱乐部日程”

## 5. 前后端数据流 (Vika 集成)

虽然引入了管理用户的后端，但**团务数据**建议继续保留在 Vika，以复用现有的制卡和导出逻辑：

1. **配置隔离**：
   - 为“高校约团”在 Vika 新建一个独立的 `university_datasheet_id`。
   - 前端根据 `activeTab` 动态切换调用的 `datasheetId`。
2. **读写分离**：
   - 只有 `role='student'` 的用户在前端能向高校表发送写请求。

## 6. API 接口规范 (核心)

### 用户模块
- `POST /api/register`：注册 (需传邀请码)。
- `POST /api/login`：登录，返回 Token 及 Role。
- `GET /api/me`：获取个人信息及权限。

### 管理员模块 (GM 专用)
- `POST /api/admin/invite-codes` => 批量生成学生/社会人邀请码。

## 7. 安全策略

- **CORS 配置**：仅允许受信任的前端域名访问。
- **密码存储**：使用 `bcrypt` 或 `argon2` 进行哈希加盐。
- **邀请码防炸**：对注册接口实施频率限制 (Rate Limiting)。
- **Token 过期**：设置合理的失效时间，配合 Refresh Token 机制。

## 8. 部署建议 (腾讯云)

- **后端**：使用腾讯云容器服务 (TKE) 或 轻量应用服务器。
- **网关**：使用 Nginx 开启 HTTPS，并将 `/api` 转发至后端服务。
- **数据**：使用腾讯云云数据库 (CDB)。
