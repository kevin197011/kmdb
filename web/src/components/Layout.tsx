import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  const navItems = [
    { path: '/dashboard', label: '仪表盘', icon: '📊' },
    { path: '/projects', label: '项目管理', icon: '📁' },
    { path: '/assets', label: '资产管理', icon: '📦' },
    { path: '/asset-credentials', label: '主机密钥', icon: '🔑' },
    { path: '/webssh', label: 'WebSSH', icon: '💻' },
    { path: '/users', label: '用户管理', icon: '👤' },
    { path: '/user-groups', label: '用户群组', icon: '👥' },
    { path: '/roles', label: '角色权限', icon: '🔐' },
    { path: '/user-roles', label: '用户角色', icon: '👔' },
    { path: '/group-roles', label: '群组角色', icon: '👥' },
    { path: '/api-tokens', label: 'API Token', icon: '🎫' },
    { path: '/audit', label: '审计日志', icon: '📋' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 左侧边栏 */}
      <aside className="w-64 bg-white shadow-sm border-r flex flex-col flex-shrink-0">
        {/* Logo 区域 - 点击返回仪表盘 */}
        <Link
          to="/dashboard"
          className="h-16 flex items-center px-4 border-b flex-shrink-0 gap-3 hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <Logo size={40} />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-900 leading-tight">KMDB</span>
            <span className="text-xs text-gray-500 leading-tight">DevOps 资产管理</span>
          </div>
        </Link>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-4 min-w-0">
          <div className="space-y-1 px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap w-full ${
                  location.pathname === item.path
                    ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-lg flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        {/* 底部退出按钮 */}
        <div className="border-t p-4">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span className="mr-2">🚪</span>
            退出登录
          </button>
        </div>
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          {children}
        </div>
        {/* 底部版权信息 */}
        <footer className="py-4 px-6 text-center text-sm text-gray-400 border-t bg-white">
          <span>系统运行部驱动</span>
          <span className="mx-2">•</span>
          <span>KMDB DevOps 资产管理平台</span>
        </footer>
      </main>
    </div>
  )
}
