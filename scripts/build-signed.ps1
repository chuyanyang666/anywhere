# ANYWHERE 代码签名打包骨架（Windows / NSIS）
# 用法：
#   1) 准备代码签名证书（EV 或 OV 的 .pfx），放到安全位置，不要提交到仓库。
#   2) 在 PowerShell 里设置环境变量（仅当前会话有效）：
#        $env:CSC_LINK = "C:\path\to\your-cert.pfx"      # 证书路径或 base64
#        $env:CSC_KEY_PASSWORD = "your-password"          # 证书密码
#   3) 执行： powershell -ExecutionPolicy Bypass -File scripts\build-signed.ps1
# 说明：electron-builder 会自动读取 CSC_LINK / CSC_KEY_PASSWORD 完成签名；
#       未提供证书时会产出未签名安装包（forceCodeSigning=false，便于内测）。
#       时间戳服务器已在 package.json build.win.rfc3161TimeStampServer 中配置。

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:CSC_LINK) {
  Write-Host "[提示] 未检测到 CSC_LINK，将打包未签名版本（仅限内部测试）。" -ForegroundColor Yellow
} else {
  Write-Host "[签名] 使用证书：$env:CSC_LINK" -ForegroundColor Green
}

Write-Host "[1/2] 构建前端产物..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { throw "前端构建失败" }

Write-Host "[2/2] 打包 Windows 安装包（NSIS）..." -ForegroundColor Cyan
npx electron-builder --win nsis --publish never
if ($LASTEXITCODE -ne 0) { throw "安装包构建失败" }

Write-Host "完成，产物位于 release\ 目录。" -ForegroundColor Green
