# 🎾 TennisTrain 部署手册 (Cloudflare Pages)

本手册将指导您如何将 TennisTrain 项目免费、快速地部署到 Cloudflare 上。

## 第一阶段：准备工作

1.  **注册 Cloudflare 账号**: 访问 [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) 注册。
2.  **创建 GitHub 仓库**:
    *   在 GitHub 上新建一个仓库（私有或公开均可）。
    *   将本项目代码推送（Push）到该仓库。

## 第二阶段：部署前端 (Cloudflare Pages)

1.  **登录 Cloudflare 控制台**: 点击左侧菜单栏的 **Workers & Pages**。
2.  **创建项目**: 点击 **Create application** -> **Pages** -> **Connect to Git**。
3.  **选择仓库**: 选择你刚才上传的 TennisTrain 仓库。
4.  **配置构建设置**:
    *   **Framework preset**: 选择 `Vite`。
    *   **Build command**: `npm run build`。
    *   **Build output directory**: `dist`。
5.  **保存并部署**: 点击 **Save and Deploy**。
    *   Cloudflare 会自动分配一个 `xxx.pages.dev` 的免费域名给你。

## 第三阶段：(可选) 部署 Python 后端 (Cloudflare Workers)

如果您需要使用 Python 处理复杂的弹道计算：

1.  **进入 Workers & Pages**: 点击 **Create application** -> **Workers**。
2.  **创建 Worker**: 给它起个名字（如 `tennis-backend`）。
3.  **上传 Python 代码**:
    *   在控制台中点击 **Edit Code**。
    *   将 `worker/main.py` 的内容粘贴进去。
    *   确保在设置中选择 **Python Runtime**。
4.  **保存并部署**: 点击右上角的 **Deploy**。

## 持续更新流程

今后您只需在本地修改代码并 `git push` 到 GitHub，Cloudflare Pages 会**自动检测并重新构建**网页，几分钟内您的在线页面就会更新。

---

### 💡 贴士
*   **移动端体验**: 部署后，请在手机浏览器中打开该链接，并点击浏览器菜单中的“添加到主屏幕”，即可像原生 App 一样全屏使用。
*   **域名**: 如果你有自己的域名，可以在 Pages 的 **Custom domains** 选项卡中轻松绑定。

