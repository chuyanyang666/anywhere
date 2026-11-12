# ANYWHERE 代码签名策略

更新日期：2026 年 11 月 11 日

## 概述

ANYWHERE Windows 安装包的代码签名通过 **SignPath Foundation**（德国非营利组织，为开源项目提供免费 OV 证书）完成。

## 证书信息

- 证书颁发方：SignPath Foundation
- 证书类型：OV（Organization Validated）代码签名证书
- 证书持有者：SignPath Foundation（开源项目由 SignPath 代持证书，这是免费 OSS 签名的标准做法）
- 时间戳服务：DigiCert（`http://timestamp.digicert.com`），签名永久有效
- 哈希算法：SHA-256

## 签名流程

1. 维护者推送一个符合 `v*.*.*` 格式的 Git tag，或在 GitHub Actions 页面手动触发 Release workflow
2. GitHub Actions 在 **GitHub Hosted Runner** 上构建 Windows NSIS 安装包（`anywhere-setup.exe`）
3. 构建好的未签名安装包作为 artifact 提交给 SignPath GitHub Action（`signpath/github-action-submit-signing-request`）
4. SignPath 在自己的安全签名环境中完成签名，使用时间戳服务加盖时间戳
5. 签好的安装包回传到 GitHub Runner，覆盖原 artifact，重算 `latest.yml`（`sha512` 和文件大小）
6. Release workflow 创建 GitHub Release，上传签好的安装包和 `latest.yml`
7. 用户下载安装包时，Windows SmartScreen 会显示发布者为 **SignPath Foundation**

## 签名范围

- 仅签 **Windows NSIS 安装包**（`anywhere-setup.exe`）
- 不签源码、README、图片等非可执行产物
- 不签第三方运行时（Electron、系统 DLL 等）——这些属于运行时系统库，不在 ANYWHERE 的签名范围内

## 密钥管理

- 签名私钥由 SignPath 在安全环境中托管，维护者**本地无私钥**
- 签名请求通过 SignPath 分配的 CI API Token 发起（存储于 GitHub Repository Secrets，命名为 `SIGNPATH_API_TOKEN`）
- API Token 受 GitHub Secret 保护，仓库外部人员无法查看
- CI API Token 权限仅限于提交签名请求，无法导出私钥

## 触发条件

签名仅在以下条件同时满足时执行：

- 由 `release.yml` workflow 触发（push `v*.*.*` tag 或 workflow_dispatch）
- GitHub Actions 中配置了 4 个 SignPath Secrets：
  - `SIGNPATH_API_TOKEN`
  - `SIGNPATH_ORGANIZATION_ID`
  - `SIGNPATH_PROJECT_SLUG`
  - `SIGNPATH_SIGNING_POLICY`（先使用 `test-signing`，正式发布切为 `release-signing`）
- Secrets 为空时，workflow 自动跳过签名步骤，直接发布未签名安装包（符合 SignPath 零配置跳过的设计）

## 安全约束

- Release workflow 运行在 GitHub Hosted Runner 上，无法被维护者在本地篡改构建环境
- 每个 Release tag 只能触发一次签名请求（SignPath 后端限制），防止重复签名
- 签名策略由 SignPath 后端强制，维护者无法在 workflow 中绕过
- 维护者账号（@chuyanyang666）已开启 GitHub MFA（双因素认证）

## 联系

签名相关问题请发邮件：chuyanyang666@gmail.com
