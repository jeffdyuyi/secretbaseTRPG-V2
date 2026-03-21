# 成都秘密基地 TRPG 俱乐部 — 综合后端技术设计文档 (V4)

基于现存的前端工具链（V4版本）及用户在腾讯云独立部署后端的需求，特精细化梳理本技术规格说明书。

## 1. 架构概览与现阶段平滑过渡

### 1.1 核心边界界定
当前该工具采用纯前端直连 **Vika (维格表)** 的 Serverless 架构。
引入腾讯云自有后端后，架构将拆分为**双轨制**：
1. **认证与权限轨 (自建后端核心职责)**：负责用户的注册、登录、邀请码核验、角色下发 (`student` / `social`)。
2. **团务数据轨 (Vika 维格表)**：继续复用 Vika 强大的行列权限和 API，前端获取到身份后，带着对应的角色权限向 Vika 发起日程或卫星状态的增删改查。自建后端在此轨道中**可暂时不介入**（即不作为数据代理转发），以保证功能的纯净性并降低初期接入成本。

### 1.2 前端预留的整合接口 (过渡态机制)
目前前端在 `App.tsx` 和 `SessionForm.tsx` 中使用 `localStorage.getItem('trpg_user_role')` 作为开发期的 Mock（占位符）。
**后端接入期：**
前端只需移除 `localStorage` 的硬编码设置逻辑，将登录页面获取到的 JWT 解析出 `role` 字段并存入全局 Context 状态管理即可无缝对接，原有业务逻辑**零干扰**。

---

## 2. 核心后端业务：角色与邀请码系统

### 2.1 角色定义
| 角色标识 | 权限说明 | 业务表现 |
| :--- | :--- | :--- |
| `social` | 社会人玩家 | 仅可查看和发起“俱乐部团”、“活动团”、“商团”，绑定标准 `roomId` 体系。 |
| `student` | 学生党玩家 | 不仅可访问俱乐部体系，同时解锁“成都高校公共约团”页面，并且获得“高校团”特有发起权限（自动关联 `customLocation` 和专属字体渲染）。 |

### 2.2 数据库设计概念 (ER 模型建议)

#### User 表 (用户信息表)
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'social', -- 'social' 或 'student'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Invitation_Code 表 (邀请码池)
```sql
CREATE TABLE invitation_codes (
    code VARCHAR(20) PRIMARY KEY, -- 格式如：STU-8X9A2, SOC-B4Y71
    role_type VARCHAR(20) NOT NULL, -- 该码对应下发的角色 ('student', 'social')
    is_used BOOLEAN DEFAULT FALSE,
    used_by UUID REFERENCES users(id),
    expires_at TIMESTAMP
);
```

---

## 3. 后端 API 接口规范 (RESTful)

### 3.1 开放层 (认证接入点)
- `POST /api/auth/register`
  - **Req**: `{ "username": "...", "password": "...", "inviteCode": "STU-12345" }`
  - **Res**: 校验验证码 -> 创建用户并将 `is_used` 置为 true -> 返回 `201 Created`
- `POST /api/auth/login`
  - **Req**: `{ "username": "...", "password": "..." }`
  - **Res**: 返回 JWT，Payload 内需包裹 `{ "sub": "uuid", "role": "student" }`

### 3.2 鉴权测试层
- `GET /api/user/me`
  - **Req**: Header 携带 `Authorization: Bearer <token>`
  - **Res**: `{ "username": "xxx", "role": "student" }`

### 3.3 管理员层 (仅受保护的环境或超管可访问)
- `POST /api/admin/generate-codes`
  - **Req**: `{ "role_type": "student", "count": 10 }`
  - **Res**: 返回 10 条新的邀请码列表

---

## 4. 有线数据结构的最新兼容性说明

若未来您打算**彻底废弃 Vika**，让自己的后端来全盘接管排班数据存储，请务必参考目前工具已高度依赖的 JSON 结构规范设计您的数据库：

### 4.1 SessionData (核心排班数据主体模型)
若自建数据库，对应的表结构建议包含以下字段（需支持 Nullable）：
- **基础排班**：`ruleSystem`, `moduleName`, `gmName`, `date`, `startTime`, `roomId`
- **人数与信息**：`currentPlayers`, `maxPlayers`, `description`, `notes`, `tags` (JSON 数组)
- **核心分路器**：
  - `sessionType`: Enum ("俱乐部团" | "活动团" | "商团" | "高校团")
  - `status`: Enum ("招募中" | "计划中" | "已满员" | "已结团" | "已取消" | "卫星")
- **高校专用扩展**：
  - `customLocation`: VARCHAR (高校团专用，因高校不开设标准 RoomId)
- **视觉控制扩展 (V4新增)**：
  - `moduleFontSize`: INT (控制标题字体大小，通常在 16~60 之间)
  - `ruleFontSize`: INT (控制规则系统字体大小，默认 14)

---

## 5. 腾讯云部署与实施指南

### 5.1 推荐架构
由于本项目属于典型的 I/O 密集型的轻量验证接口，推荐如下微服务部署方案：

1. **计算层 (Node.js/Python)**
   - 使用轻量应用服务器 (Lighthouse) 或云服务器 (CVM)。
   - 使用 PM2 进行守护进程管理，或使用 Docker 容器化部署以隔离环境。
2. **接入层 (Nginx)**
   - 配置反向代理：
     - `/api/*` -> 转发至本机 `localhost:3000` (后端服务)
     - `/` -> 代理到前端 React 的静态构建产物包 (`dist/`)
3. **存储层 (云数据库 / 本地数据库)**
   - 前期可直接在服务器内搭建 PostgreSQL 或 MySQL 容器。
   - 数据量提升后，推荐平滑迁移至 腾讯云 TDSQL-C 或 云数据库 MySQL 实例。

### 5.2 核心安全加固
- **密码学：** 后端禁止明文存密码，必须使用 `bcrypt` 配合 Salt 哈希加密。
- **跨域安全 (CORS)：** 由于前后端部署在同一机器并由 Nginx 代理，后端 CORS 应将其设为受限的同源策略。
- **防暴力撞库：** 针对 `/api/auth/login` 与 `/api/auth/register` 提供 IP 级别的 Rate Limit 频控策略 (例如使用 `express-rate-limit` 中间件，每分钟最多尝试 5 次)。

---

## 总结
目前的工具源码是**极度后端友好**的。您只需用任意熟悉的语言（Go, Python, Node, Java）实现本设计文档中的 **[API接口规范]** 第三章的三个接口，前端即可在不到 10 行代码的修改下（将 `localStorage` 读取替换成您的 `axios.post('/login')`），瞬间盘活完整的用户认证生态。
