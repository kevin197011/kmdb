import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Logo from './Logo'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'

interface LayoutProps {
  children: React.ReactNode
}

interface CurrentUser {
  id: string
  username: string
  email: string
  avatar?: string
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me')
      setCurrentUser(response.data)
    } catch (error) {
      console.error('获取当前用户信息失败:', error)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    navigate('/login')
  }

  const handleChangePassword = async () => {
    if (!passwordForm.new_password || !passwordForm.confirm_password) {
      toast({ title: '错误', description: '请填写新密码', variant: 'error' })
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast({ title: '错误', description: '两次输入的密码不一致', variant: 'error' })
      return
    }
    if (passwordForm.new_password.length < 6) {
      toast({ title: '错误', description: '密码长度至少为6位', variant: 'error' })
      return
    }

    setPasswordLoading(true)
    try {
      await api.patch(`/users/${currentUser?.id}/password`, {
        old_password: passwordForm.old_password,
        new_password: passwordForm.new_password,
      })
      toast({ title: '成功', description: '密码修改成功' })
      setShowPasswordModal(false)
      setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } }
      toast({ title: '修改失败', description: err.response?.data?.error || '密码修改失败', variant: 'error' })
    } finally {
      setPasswordLoading(false)
    }
  }

  // 获取用户显示名称
  const getUserDisplayName = () => {
    if (!currentUser) return '用户'
    return currentUser.username
  }

  // 获取头像首字母
  const getAvatarInitial = () => {
    const name = getUserDisplayName()
    return name.charAt(0).toUpperCase()
  }

  // 生成基于用户名的渐变色
  const getAvatarGradient = () => {
    if (!currentUser) return 'from-gray-400 to-gray-500'
    const colors = [
      'from-blue-500 to-indigo-500',
      'from-purple-500 to-pink-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-cyan-500 to-blue-500',
      'from-pink-500 to-rose-500',
    ]
    const index = currentUser.username.charCodeAt(0) % colors.length
    return colors[index]
  }

  // 导航菜单分组
  const navGroups = [
    {
      title: '概览',
      items: [
        { path: '/dashboard', label: '仪表盘', icon: '📊' },
      ],
    },
    {
      title: '资产管理',
      items: [
        { path: '/projects', label: '项目管理', icon: '📁' },
        { path: '/assets', label: '资产管理', icon: '📦' },
        { path: '/asset-credentials', label: '主机密钥', icon: '🔑' },
        { path: '/webssh', label: 'WebSSH', icon: '💻' },
      ],
    },
    {
      title: '用户与权限',
      items: [
        { path: '/users', label: '用户管理', icon: '👤' },
        { path: '/teams', label: '团队管理', icon: '👥' },
        { path: '/roles', label: '角色管理', icon: '🔐' },
        { path: '/scoped-permissions', label: '权限管理', icon: '🛡️' },
      ],
    },
    {
      title: '系统',
      items: [
        { path: '/api-tokens', label: 'API Token', icon: '🎫' },
        { path: '/audit', label: '审计日志', icon: '📋' },
      ],
    },
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
          <div className="space-y-4 px-3">
            {navGroups.map((group) => (
              <div key={group.title}>
                <div className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.title}
                </div>
                <div className="space-y-1 mt-1">
                  {group.items.map((item) => (
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
              </div>
            ))}
          </div>
        </nav>
      </aside>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-16 bg-white border-b flex items-center justify-end px-6 flex-shrink-0">
          {/* 右侧用户头像 */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {/* 头像 */}
              <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                {currentUser?.avatar ? (
                  <img src={currentUser.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                ) : (
                  getAvatarInitial()
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-sm font-medium text-gray-900">{getUserDisplayName()}</div>
                <div className="text-xs text-gray-500">{currentUser?.email}</div>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* 下拉菜单 */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                {/* 用户信息头部 */}
                <div className="px-4 py-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                      {currentUser?.avatar ? (
                        <img src={currentUser.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        getAvatarInitial()
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{getUserDisplayName()}</div>
                      <div className="text-sm text-gray-500">{currentUser?.email}</div>
                    </div>
                  </div>
                </div>

                {/* 菜单选项 */}
                <div className="py-1">
                  <button
                    onClick={() => { setShowProfileModal(true); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">👤</span>
                    <span>个人信息</span>
                  </button>
                  <button
                    onClick={() => { setShowPasswordModal(true); setShowUserMenu(false) }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">🔒</span>
                    <span>修改密码</span>
                  </button>
                </div>

                {/* 退出登录 */}
                <div className="border-t pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <span className="text-lg">🚪</span>
                    <span>退出登录</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* 主内容 */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </main>

        {/* 底部版权信息 */}
        <footer className="py-4 px-6 text-center text-sm text-gray-400 border-t bg-white flex-shrink-0">
          <span>系统运行部驱动</span>
          <span className="mx-2">•</span>
          <span>KMDB DevOps 资产管理平台</span>
        </footer>
      </div>

      {/* 个人信息弹窗 */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">个人信息</h2>
            </div>
            <div className="p-6">
              {/* 头像 */}
              <div className="flex justify-center mb-6">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarGradient()} flex items-center justify-center text-white font-bold text-3xl shadow-lg`}>
                  {currentUser?.avatar ? (
                    <img src={currentUser.avatar} alt="avatar" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getAvatarInitial()
                  )}
                </div>
              </div>

              {/* 信息列表 */}
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-500">用户名</span>
                  <span className="font-medium text-gray-900">{currentUser?.username}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-500">邮箱</span>
                  <span className="font-medium text-gray-900">{currentUser?.email}</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b">
                  <span className="text-gray-500">用户ID</span>
                  <span className="font-mono text-sm text-gray-600">{currentUser?.id?.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 修改密码弹窗 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
              <h2 className="text-xl font-bold text-white">修改密码</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">当前密码</label>
                <input
                  type="password"
                  value={passwordForm.old_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, old_password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入当前密码"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="输入新密码（至少6位）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="再次输入新密码"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordForm({ old_password: '', new_password: '', confirm_password: '' })
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {passwordLoading ? '修改中...' : '确认修改'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
