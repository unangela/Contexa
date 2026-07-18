# Contexa 隐私政策 / Privacy Policy

> 本文件为中英双语版。中文在前，英文在后。
> This document is bilingual. Chinese first, English follows.

---

# 隐私政策（中文）

**最后更新：2025 年 7 月**

感谢您使用 Contexa（"本扩展"、"我们"）。我们高度重视您的隐私。本政策说明我们在您使用本 Chrome 扩展时，如何收集、使用和保护信息。

## 1. 我们收集哪些信息

**本扩展不收集任何个人身份信息，不要求注册账号，也不内置任何用户分析或追踪 SDK。**

具体而言：

| 数据类型 | 是否收集 | 说明 |
| --- | --- | --- |
| 标注内容（标题、描述、CSS 选择器） | 仅存本地 | 保存在浏览器的 `chrome.storage.local` 中，不会上传到我们的服务器 |
| 云端 JSON URL | 仅存本地 | 您主动配置的共享链接，保存在 `chrome.storage.local`，仅用于为您加载备注 |
| 浏览历史 / 访问的网页内容 | 不收集 | 本扩展不会读取、记录或传输您访问的页面内容 |
| Cookie / 设备标识 / IP 地址 | 不收集 | 不使用任何 Cookie、设备指纹或广告技术 |

## 2. 数据存储位置

- **标注数据**：完全存储在您本地浏览器的 `chrome.storage.local` 中。卸载扩展将清除这些数据。
- **云端共享数据**：当您使用「云端模式」时，您需自行将导出的 JSON 文件上传到您选择的静态托管服务（如 GitHub Pages、Vercel、阿里云 OSS 等）。**该托管服务由您控制，不受本政策约束**，请参考相应服务的隐私政策。

## 3. 数据如何被使用

- 标注数据仅用于在您授权的网页上显示备注气泡。
- 云端 JSON URL 仅由您的浏览器向该地址发起请求以加载备注，请求通过浏览器扩展后台代理（用于规避跨域限制），**不会经过我们的服务器**。

## 4. 网络访问

本扩展仅在以下情形发起网络请求：

- **加载云端备注**：当您启用云端模式时，向**您配置的** JSON URL 发起请求。出于安全考虑，仅允许公网 `http/https` 地址，本地地址（`localhost`、`127.x`、内网 IP 段）会被拦截。
- 本扩展不与任何第三方分析、广告或追踪服务通信。

## 5. 权限说明

本扩展采用「最小权限、按需授予」模型：

- **安装时**：仅申请 `activeTab`、`sidePanel`、`storage`、`scripting` 权限，**不预先索取任何网站的访问权限**。
- **使用时**：当您在某网站首次标注时，Chrome 会弹出授权提示，**明确显示具体子域名**，由您主动决定是否授权。授权范围精确到子域名，可随时在「域名管理」中撤销。

## 6. 第三方服务

本扩展本身不接入任何第三方服务。当您选择使用云端共享功能时，您自行选择的托管服务（GitHub、Vercel 等）可能有其独立的隐私政策。

## 7. 儿童隐私

本扩展是面向数字产品与网站交付场景的专业工具，不针对 13 岁以下儿童，也不会故意收集儿童信息。

## 8. 政策变更

我们可能更新本政策。重大变更将在本页面公布并更新「最后更新」日期。

## 9. 联系我们

如对本政策有疑问，请通过 GitHub Issues 联系。

---

# Privacy Policy (English)

**Last updated: July 2025**

Thank you for using Contexa (the "Extension", "we"). We take your privacy seriously. This policy explains what information we collect, how we use it, and how we protect it when you use this Chrome extension.

## 1. Information We Collect

**The Extension does not collect any personally identifiable information, does not require account registration, and contains no analytics or tracking SDKs.**

Specifically:

| Data Type | Collected? | Notes |
| --- | --- | --- |
| Annotation content (title, description, CSS selectors) | Local only | Stored in your browser's `chrome.storage.local`; never uploaded to our servers |
| Cloud JSON URL | Local only | The share link you configure, stored in `chrome.storage.local`, used only to load your notes |
| Browsing history / page content you visit | Not collected | The Extension does not read, log, or transmit the content of pages you visit |
| Cookies / device IDs / IP addresses | Not collected | No cookies, device fingerprints, or advertising technologies are used |

## 2. Where Data Is Stored

- **Annotation data**: Stored entirely in your browser's `chrome.storage.local`. Uninstalling the extension removes this data.
- **Cloud-shared data**: When you use "Cloud mode", you upload the exported JSON file to a static hosting service of your choice (e.g., GitHub Pages, Vercel, Alibaba Cloud OSS). **That hosting service is under your control and is not governed by this policy** — please refer to its respective privacy policy.

## 3. How Data Is Used

- Annotation data is used solely to display note bubbles on websites you have authorized.
- The cloud JSON URL is used only by your browser to fetch notes from that address. The request is proxied through the extension's background script (to bypass cross-origin restrictions) and **never passes through our servers**.

## 4. Network Access

The Extension makes network requests only in the following case:

- **Loading cloud notes**: When you enable Cloud mode, it requests the JSON URL **you configured**. For security, only public `http/https` addresses are allowed; local addresses (`localhost`, `127.x`, private IP ranges) are blocked.
- The Extension does not communicate with any third-party analytics, advertising, or tracking services.

## 5. Permissions

The Extension follows a "least privilege, on-demand grant" model:

- **At install**: Requests only `activeTab`, `sidePanel`, `storage`, and `scripting` permissions — **it does not pre-claim access to any website**.
- **In use**: When you annotate a website for the first time, Chrome shows a permission prompt that **clearly displays the specific subdomain**, and you decide whether to grant it. Grants are scoped to exact subdomains and can be revoked anytime in "Domain Management".

## 6. Third-Party Services

The Extension itself integrates no third-party services. When you choose to use the cloud-sharing feature, the hosting service you select (GitHub, Vercel, etc.) may have its own privacy policy.

## 7. Children's Privacy

The Extension is a professional tool for digital product and website delivery workflows. It is not directed at children under 13 and does not knowingly collect information from them.

## 8. Changes to This Policy

We may update this policy. Material changes will be posted on this page with an updated "Last updated" date.

## 9. Contact Us

For questions about this policy, please reach out via GitHub Issues.
