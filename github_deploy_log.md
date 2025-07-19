
# GitHub 项目部署记录文档

## 📁 项目背景

由于 GitHub 网页上传存在文件数和大小限制，不能通过网页一次性上传包含大量文件的文件夹。因此采用 Git 命令行的方式进行项目部署和推送。

---

## ✅ 操作步骤

### 1. 克隆仓库

```bash
git clone https://github.com/xuanxi369/ContractGPT.git
cd ContractGPT
```

### 2. 复制大文件夹

将本地的大文件夹 `contractgpt-worker` 复制到项目目录中：

```bash
cp -r "D:/1.1.1.1/bz/contractgpt-worker" ./contractgpt-worker
```

> 注意：路径要使用 `/` 而非 `\`，并用引号包裹路径。

### 3. 添加、提交更改

```bash
git add contractgpt-worker
git commit -m "添加大文件夹 contractgpt-worker"
```

⚠️ Windows 上可能会提示：

```bash
warning: LF will be replaced by CRLF ...
```

这是换行符提示（LF 是 Linux 风格，CRLF 是 Windows 风格），**可忽略**，不影响上传。

### 4. 推送到 GitHub

```bash
git push origin main
```

---

## ✅ 结果确认

推送成功后，文件夹已出现在 GitHub 项目中，可以在网页端查看。

---

## 🧠 提示：如何避免 LF/CRLF 警告

可设置 Git 换行符策略：

```bash
git config --global core.autocrlf true
```

---

## 📌 下一步可选操作

- 生成 `.gitignore` 文件排除不必要内容
- 添加自动部署脚本
- 配置 GitHub Actions / Pages
- 配合 Cloudflare Worker 实现前端部署

---

## ✅ 当前状态总结

| 步骤 | 状态 | 说明 |
|------|------|------|
| 克隆仓库 | ✅ 成功 | 从 GitHub 拉取仓库到本地 |
| 复制文件夹 | ✅ 成功 | 成功将大文件夹复制到项目中 |
| Git 添加提交 | ✅ 成功 | 提交文件并生成提交记录 |
| 推送到 GitHub | ✅ 成功 | 成功将大文件夹推送到远程仓库 |

---

以上为本次部署过程完整记录。
