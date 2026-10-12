# 教学助手 (Teaching Assistant)

面向独立教培老师的一站式教学管理 Web 应用，覆盖备课、教研、知识点库、题库与试卷、学生档案、课程表六大核心场景。

## 功能特性

- **📝 备课管理**：富文本备课，关联知识点，上传教案附件，按课程筛选
- **🔬 教研笔记**：教研记录与反思，标签分类，关联知识点
- **🧠 知识点库**：学科 > 章节 > 知识点三级树形结构，全文搜索
- **❓ 题库管理**：题目录入（富文本题干/答案/解析），按知识点和难度筛选
- **📄 试卷组卷**：手动选题或按知识点自动组卷，一键打印试卷
- **👨‍🎓 学生档案**：学生信息管理，学习记录时间线，跟踪学习进度
- **📅 课程表**：周视图排课，支持每周重复，关联学生
- **📦 数据备份**：一键导出数据库和附件压缩包

## 技术栈

- 后端：Node.js + Express + better-sqlite3（单文件 SQLite 数据库）
- 前端：原生 HTML/CSS/JavaScript（无框架依赖，轻量）
- 文件上传：Multer
- 数据导出：Archiver（zip 打包）

## 快速开始

### 环境要求

- Node.js 18+

### 安装与运行

```bash
# 安装依赖
npm install

# 启动应用
npm start
```

启动后浏览器访问：http://localhost:3000

### 自定义端口

```bash
PORT=8080 npm start
```

## 部署

本应用为单进程 Node.js 应用，已支持 PWA（可安装到手机/电脑桌面，像 App 一样使用）。

### 方式一：Render 一键部署（推荐，免费）

Render 提供免费托管，支持持久化磁盘（SQLite 需要）。

1. 将代码推送到 GitHub 仓库
2. 访问 https://render.com ，用 GitHub 登录
3. 点击「New +」→「Web Service」→ 选择你的 GitHub 仓库
4. 配置：
   - **Build Command**: `npm install --omit=dev`
   - **Start Command**: `node server.js`
   - 选择 **Free** 套餐
5. 点击「Advanced」→「Add Disk」，挂载到 `/opt/render/project/src/data`，大小 1GB
6. 点击「Create Web Service」，等待部署完成

> 也可直接使用项目中的 `render.yaml` 配置文件。

### 方式二：Railway 部署

1. 访问 https://railway.app ，用 GitHub 登录
2. 「New Project」→「Deploy from GitHub repo」→ 选择仓库
3. 添加变量：`NODE_ENV=production`
4. 「Settings」→「Networking」→ 生成公网域名
5. 在「Volumes」中挂载 `/app/data` 以持久化数据

### 方式三：VPS 部署（最稳定，约 $5/月）

```bash
# 1. 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. 上传代码到服务器
scp -r ./ user@your-server:/opt/teaching-assistant

# 3. 安装依赖并启动
cd /opt/teaching-assistant
npm install --omit=dev
node server.js

# 4.（可选）用 pm2 保持后台运行
npm install -g pm2
pm2 start server.js --name teaching-assistant
pm2 save
```

配置 Nginx 反向代理（可选，支持 HTTPS）：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

### 方式四：Docker 部署

```bash
docker build -t teaching-assistant .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data teaching-assistant
```

## PWA 安装（像 App 一样使用）

部署到云端后，在手机或电脑浏览器中打开应用地址：

- **Android/Chrome**：浏览器菜单 →「添加到主屏幕」→ 桌面出现「教学助手」图标，点击全屏运行
- **iOS/Safari**：分享按钮 →「添加到主屏幕」
- **桌面 Chrome/Edge**：地址栏右侧会出现「安装」图标

安装后可脱离浏览器全屏使用，体验接近原生 App。

## 数据备份

进入应用 **设置** 页面，点击「导出全部数据」，下载包含数据库和附件的 zip 压缩包。

恢复时将压缩包中的 `app.db` 和 `uploads/` 目录放回 `data/` 目录即可。

## 项目结构

```
├── server.js              # 应用入口
├── package.json
├── Dockerfile             # Docker 部署配置
├── render.yaml            # Render 部署配置
├── data/                  # 数据目录（运行时生成）
│   ├── app.db            # SQLite 数据库
│   └── uploads/          # 附件存储
├── src/
│   ├── db.js             # 数据库连接与 Schema
│   ├── utils/
│   │   └── response.js   # 统一响应格式
│   └── routes/           # 各模块 API 路由
│       ├── knowledge.js
│       ├── questions.js
│       ├── papers.js
│       ├── lessonPlans.js
│       ├── research.js
│       ├── students.js
│       ├── courses.js
│       ├── attachments.js
│       └── export.js
└── public/               # 前端静态资源
    ├── index.html
    ├── manifest.json     # PWA 应用清单
    ├── sw.js             # Service Worker（离线缓存）
    ├── icon.svg          # 应用图标
    ├── css/style.css
    └── js/
        ├── api.js        # API 请求封装
        ├── common.js     # 通用工具（编辑器、模态框等）
        ├── app.js        # 路由与应用入口
        └── pages/        # 各页面模块
            ├── dashboard.js
            ├── knowledge.js
            ├── questions.js
            ├── papers.js
            ├── lessonPlans.js
            ├── research.js
            ├── students.js
            ├── courses.js
            └── settings.js
```

## 许可证

MIT
