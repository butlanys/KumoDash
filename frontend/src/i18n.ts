import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      // Common
      'kumodash': 'KumoDash',
      'back': 'Back',
      'next': 'Next',
      'retry': 'Retry',

      // Dashboard
      'dashboard.title': 'Dashboard',
      'dashboard.systemInfo': 'System Info',
      'dashboard.hostname': 'Hostname',
      'dashboard.os': 'Operating System',
      'dashboard.kernel': 'Kernel Version',
      'dashboard.uptime': 'Uptime',
      'dashboard.cpu': 'CPU',
      'dashboard.cores': 'cores',
      'dashboard.memory': 'Memory',
      'dashboard.disk': 'Disk',
      'dashboard.network': 'Network',
      'dashboard.diskIo': 'Disk IO',
      'dashboard.load': 'Load Average',
      'dashboard.processes': 'Processes',
      'dashboard.connections': 'TCP Connections',
      'dashboard.rxSpeed': 'Receive',
      'dashboard.txSpeed': 'Send',
      'dashboard.readSpeed': 'Read',
      'dashboard.writeSpeed': 'Write',
      'dashboard.mountPoint': 'Mount Point',
      'dashboard.used': 'Used',
      'dashboard.free': 'Free',
      'dashboard.total': 'Total',

      // Sidebar
      'sidebar.overview': 'Overview',
      'sidebar.servers': 'Servers',
      'sidebar.settings': 'Settings',
      'sidebar.collapse': 'Collapse sidebar',
      'sidebar.expand': 'Expand sidebar',

      // Header
      'header.profile': 'Profile',
      'header.logout': 'Logout',
      'header.themeLight': 'Light Mode',
      'header.themeDark': 'Dark Mode',
      'header.themeSystem': 'System',
      'header.greeting': 'Hi, {{name}}',

      // Login
      'welcome-back': 'Welcome Back',
      'sign-in': 'Sign In',
      'username': 'Username',
      'password': 'Password',
      'enter-username': 'Enter your username',
      'enter-password': 'Enter your password',
      'signing-in': 'Signing in...',
      'invalid-credentials': 'Invalid credentials',
      'signed-in-successfully': 'Signed in successfully!',
      'signed-out-successfully': 'Signed out successfully!',
      'sign-in-to-your-account': 'Sign in to your account',

      // Setup
      'setup-wizard': 'Setup Wizard',
      'step-of': 'Step {{current}} of {{total}}',
      'invalid-setup-link': 'Invalid Setup Link',
      'setup-link-expired': 'This setup link is either expired or has already been used.',
      'contact-admin': 'Please contact your system administrator for assistance or request a new setup link.',

      // Setup Welcome
      'welcome-to-kumodash': 'Welcome to KumoDash',
      'setup-description': 'A lightweight cloud server console. Let\'s get your system configured.',
      'start-setup': 'Start Setup',
      'configure-security': 'Configure Security Settings',
      'configure-security-desc': 'Set up API path and session timeout',
      'create-admin': 'Create Administrator Account',
      'create-admin-desc': 'Set up your admin credentials',
      'complete-installation': 'Complete Installation',
      'complete-installation-desc': 'Review and finish setup',

      // Setup Security
      'security-settings': 'Security Settings',
      'security-settings-desc': 'Configure security options for your installation',
      'auth-path-prefix': 'Login Path Prefix',
      'auth-path-prefix-placeholder': '/login',
      'auth-path-prefix-hint': 'Custom path to hide login page from scanners (e.g., /my-secret-login)',
      'auth-path-prefix-error-min': 'Login path must be at least 3 characters',
      'auth-path-prefix-error-start': 'Login path must start with /',
      'session-timeout': 'Session Timeout (minutes)',
      'session-timeout-hint': 'How long users stay logged in (5-60 minutes)',
      'session-timeout-error-min': 'Session timeout must be at least 5 minutes',
      'session-timeout-error-max': 'Session timeout must be at most 60 minutes',

      // Setup Admin
      'create-admin-account': 'Create Admin Account',
      'create-admin-account-desc': 'Set up your administrator credentials',
      'confirm-password': 'Confirm Password',
      'username-hint': '3-50 characters, letters, numbers, underscores, and hyphens only',
      'username-error-length': 'Username must be between 3 and 50 characters',
      'username-error-format': 'Only letters, numbers, underscores, and hyphens allowed',
      'password-error-length': 'Password must be at least 8 characters',
      'password-error-uppercase': 'Must contain at least one uppercase letter',
      'password-error-lowercase': 'Must contain at least one lowercase letter',
      'password-error-number': 'Must contain at least one number',
      'password-error-match': 'Passwords do not match',
      'passwords-match': 'Passwords match',
      'password-strength-weak': 'Weak',
      'password-strength-medium': 'Medium',
      'password-strength-strong': 'Strong',
      'password-req-length': '8+ characters',
      'password-req-uppercase': 'Uppercase',
      'password-req-lowercase': 'Lowercase',
      'password-req-number': 'Number',
      'allow-weak-password': 'Allow weak password',
      'allow-weak-password-warning': 'Weak passwords are not recommended for production environments.',

      // Setup Complete
      'completing-setup': 'Completing setup...',
      'setup-failed': 'Setup Failed',
      'setup-complete': 'Setup Complete!',
      'redirecting-in': 'Redirecting to login in {{seconds}}s...',

      // Not Found
      'page-not-found': 'Page Not Found'
    }
  },
  zh: {
    translation: {
      // Common
      'kumodash': 'KumoDash',
      'back': '返回',
      'next': '下一步',
      'retry': '重试',

      // Dashboard
      'dashboard.title': '仪表盘',
      'dashboard.systemInfo': '系统信息',
      'dashboard.hostname': '主机名',
      'dashboard.os': '操作系统',
      'dashboard.kernel': '内核版本',
      'dashboard.uptime': '运行时间',
      'dashboard.cpu': 'CPU',
      'dashboard.cores': '核心',
      'dashboard.memory': '内存',
      'dashboard.disk': '磁盘',
      'dashboard.network': '网络',
      'dashboard.diskIo': '磁盘 IO',
      'dashboard.load': '系统负载',
      'dashboard.processes': '进程数',
      'dashboard.connections': 'TCP 连接',
      'dashboard.rxSpeed': '接收',
      'dashboard.txSpeed': '发送',
      'dashboard.readSpeed': '读取',
      'dashboard.writeSpeed': '写入',
      'dashboard.mountPoint': '挂载点',
      'dashboard.used': '已用',
      'dashboard.free': '可用',
      'dashboard.total': '总计',

      // Sidebar
      'sidebar.overview': '概览',
      'sidebar.servers': '服务器',
      'sidebar.settings': '设置',
      'sidebar.collapse': '收起侧边栏',
      'sidebar.expand': '展开侧边栏',

      // Header
      'header.profile': '个人资料',
      'header.logout': '退出登录',
      'header.themeLight': '浅色模式',
      'header.themeDark': '深色模式',
      'header.themeSystem': '跟随系统',
      'header.greeting': '你好, {{name}}',

      // Login
      'welcome-back': '欢迎回来',
      'sign-in': '登录',
      'username': '用户名',
      'password': '密码',
      'enter-username': '请输入您的用户名',
      'enter-password': '请输入您的密码',
      'signing-in': '登录中...',
      'invalid-credentials': '无效的凭据',
      'signed-in-successfully': '登录成功！',
      'signed-out-successfully': '退出成功！',
      'sign-in-to-your-account': '登录到您的账户',

      // Setup
      'setup-wizard': '安装向导',
      'step-of': '第 {{current}} 步，共 {{total}} 步',
      'invalid-setup-link': '无效的安装链接',
      'setup-link-expired': '此安装链接已过期或已被使用。',
      'contact-admin': '请联系系统管理员获取帮助或请求新的安装链接。',

      // Setup Welcome
      'welcome-to-kumodash': '欢迎使用 KumoDash',
      'setup-description': '轻量级云服务器控制台，让我们开始配置您的系统。',
      'start-setup': '开始设置',
      'configure-security': '配置安全设置',
      'configure-security-desc': '设置 API 路径和会话超时',
      'create-admin': '创建管理员账户',
      'create-admin-desc': '设置您的管理员凭据',
      'complete-installation': '完成安装',
      'complete-installation-desc': '检查并完成设置',

      // Setup Security
      'security-settings': '安全设置',
      'security-settings-desc': '配置安装的安全选项',
      'auth-path-prefix': '登录路径前缀',
      'auth-path-prefix-placeholder': '/login',
      'auth-path-prefix-hint': '自定义路径以隐藏登录页面（例如 /my-secret-login）',
      'auth-path-prefix-error-min': '登录路径至少需要 3 个字符',
      'auth-path-prefix-error-start': '登录路径必须以 / 开头',
      'session-timeout': '会话超时（分钟）',
      'session-timeout-hint': '用户保持登录状态的时间（5-60 分钟）',
      'session-timeout-error-min': '会话超时至少为 5 分钟',
      'session-timeout-error-max': '会话超时最多为 60 分钟',

      // Setup Admin
      'create-admin-account': '创建管理员账户',
      'create-admin-account-desc': '设置您的管理员凭据',
      'confirm-password': '确认密码',
      'username-hint': '3-50 个字符，仅限字母、数字、下划线和连字符',
      'username-error-length': '用户名必须在 3 到 50 个字符之间',
      'username-error-format': '仅允许字母、数字、下划线和连字符',
      'password-error-length': '密码至少需要 8 个字符',
      'password-error-uppercase': '必须包含至少一个大写字母',
      'password-error-lowercase': '必须包含至少一个小写字母',
      'password-error-number': '必须包含至少一个数字',
      'password-error-match': '密码不匹配',
      'passwords-match': '密码匹配',
      'password-strength-weak': '弱',
      'password-strength-medium': '中等',
      'password-strength-strong': '强',
      'password-req-length': '8+ 字符',
      'password-req-uppercase': '大写字母',
      'password-req-lowercase': '小写字母',
      'password-req-number': '数字',
      'allow-weak-password': '允许弱密码',
      'allow-weak-password-warning': '不建议在生产环境中使用弱密码。',

      // Setup Complete
      'completing-setup': '正在完成设置...',
      'setup-failed': '设置失败',
      'setup-complete': '设置完成！',
      'redirecting-in': '{{seconds}} 秒后跳转到登录页...',

      // Not Found
      'page-not-found': '页面未找到'
    }
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  })

export default i18n
