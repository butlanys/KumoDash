# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-02-04

### ✨ New Features

- **文件管理系统**: 完整的文件浏览器，支持上传、下载、复制、粘贴、重命名、删除等操作
- **Web 终端**: 基于 WebSocket 的终端功能，使用 portable-pty 实现跨平台兼容
- **设置页面**: 可视化配置系统设置，支持服务重启
- **CLI 设置向导**: 首次启动时的交互式配置向导

### 🔧 Improvements

- **前端框架升级**: 迁移至 React 19 + Tailwind v4
- **图标库迁移**: 从 Lucide React 迁移至 Heroicons
- **i18n 结构优化**: 扁平化国际化文件结构
- **日志级别控制**: 仅在 `--debug` 模式下输出 debug 日志
- **URL 路径同步**: 文件管理器支持 URL 路径参数，刷新页面可回到当前目录
- **确认对话框**: 使用 HeroUI Modal 替代原生 `window.confirm()`

### 🐛 Bug Fixes

- 修复空目录无法右键打开上下文菜单的问题
- 修复删除确认按钮无响应的问题
- 修复 URL 路径参数被编码为 `%2F` 的问题
- 修复 Heroicons 图标迁移遗漏导致的 `Download is not defined` 错误

### 🔒 Security

- 引入供应链安全检查与依赖版本锁定
- 更新安全测试 URL 协议配置

### 📦 Dependencies

- 升级 portable-pty 至 0.9
- 优化 sqlx 依赖特性配置
- 解决依赖安全审计警告

## [0.1.0] - 2026-01-XX

### Initial Release

- 基础认证系统 (JWT + Argon2)
- 系统监控仪表盘
- 用户管理
- 审计日志
