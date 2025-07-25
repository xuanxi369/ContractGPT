# ContractGPT
合同分析工具，专门用于分析合同，规避一份合同的风险点，让您对自己的合同更加了解

体验网址：https://cap.45246326.xyz/

-------------------------------

# 合同分析网站部署文档（ContractGPT）

本项目为一个合同分析网站，
结合前端页面和后端 AI 接口，
实现上传合同、查看风险、与 AI 对话等功能。
部署方式基于 Cloudflare Pages + Workers，
后端调用 DeepSeek 大模型 API。

---

## 🧰 环境准备

### 1. 注册并登录 Cloudflare

- 打开：https://dash.cloudflare.com/
- 注册账号并登录

### 2. 安装 Node.js 和 npm （CMD开启管理员权限）

访问 [Node.js 官网](https://nodejs.org/zh-cn) 安装最新版，安装完成后验证：

```bash
node -v
npm -v
```

### 3. 安装 Wrangler（用于管理 Cloudflare Workers）（CMD开启管理员权限）

```bash
npm install -g wrangler
```

---

## 📁 项目结构说明

```
contractgpt/
├── index.html                 # ✅ 前端主页面
├── css/
│   └── style.css              # ✅ 样式文件（原来的 style.css 移到 css 文件夹）
├── js/
│   └── script.js              # ✅ 前端逻辑脚本（原来的 script.js 移到 js 文件夹）
├── contractgpt-worker/        # ✅ Cloudflare Worker 中转 API 逻辑目录（Worker 脚本放这里）
│   ├── index.js               # 示例：主 Worker 脚本
│   ├── wrangler.toml          # ✅ Worker 配置文件（仍然保留在根目录）
│   ├── utils.js               # 可选：辅助模块
└──       .....          
```

---

## ✅ 前端部署：Cloudflare Pages

### Step 1：准备项目目录  

确保你已有如下文件：

- `index.html`
- `styles.css`
- `script.js`

将它们放入一个文件夹，如 `contractgpt-frontend/`。

### Step 2：部署到 Cloudflare Pages

#### 方法一：通过 Cloudflare 网页操作（推荐给小白）

1. 访问 [Cloudflare Pages 控制台](https://dash.cloudflare.com/?to=/:account/pages)
2. 点击 **"Create Application"**
3. 选择 **"Direct Upload"**，点击 **"Continue without Git"**
4. 填写项目名称：`contractgpt-pages`
5. 上传整个文件夹（包含 index.html）
6. 设置构建配置：

   - **Framework preset**: None
   - **Build command**: *留空*
   - **Build output directory**: `./`

7. 点击部署，几秒后即可访问你的网站

#### 方法二：使用 Wrangler 命令行（适合进阶） （以下命令运行时：CMD开启管理员权限）

```bash
cd contractgpt-frontend
wrangler pages publish . --project-name contractgpt-pages
```

---

## ✅ 后端部署：Cloudflare Workers

Worker 用于处理上传的合同文本并调用 DeepSeek API 返回 AI 分析结果。

### Step 1：初始化 Worker

```bash
wrangler init contractgpt-worker
```
按提示选择：

- `Hello World`
- `Worker only`
- `JavaScript`

### Step 2：修改 Worker 逻辑

编辑 `src/index.js`，替换为你的处理逻辑：

  详细index.js文件内容，见项目文件 contractgpt-worker/src/index.js
 
### Step 3：配置 wrangler.toml

```toml
name = "contractgpt-worker"
type = "javascript"
compatibility_date = "2025-07-15"
```

### Step 4：登录 Cloudflare 并部署 

```bash
wrangler login
wrangler deploy
```

部署完成后，将返回如下地址：

```
https://contractgpt-worker.你的账号.workers.dev
```

---

## ✅ 前后端联调

1. 在 `script.js` 中修改后端 API 地址：

```js
fetch("https://contractgpt-worker.xxx.workers.dev", { ... })
```

2. 本地打开 `index.html` 测试：上传合同、输入提问、查看 AI 回复。

---

## ✅ 错误记录与解决方案

| 问题 | 说明 | 解决方式 |
|------|------|----------|
| 文件上传后乱码 | 仅支持 TXT 文件 | 引入 `pdf.js` 和 `mammoth.js` 支持 `.pdf` 和 `.docx` |
| doc 文件无法识别 | 浏览器不支持 `.doc` 格式 | 暂不支持 `.doc`，推荐转换为 `.docx` |
| Failed to fetch | 后端未部署/未启用 | 检查 Worker 是否部署成功，并检查 API Key 有无欠费 |
| DeepSeek 无响应 | 剩余额度为 0 | 登录 DeepSeek 后台购买或充值额度 |

---

## ✅ 项目总结

项目部署到现在，网站支持：

- 上传合同（PDF/DOCX/TXT）
- 合同文本预览
- 风险条款识别
- AI 智能问答（DeepSeek）

---

## 🔗 参考链接

- Cloudflare Pages: https://pages.cloudflare.com/
- Cloudflare Workers: https://workers.cloudflare.com/
- DeepSeek API: https://deepseek.com/

