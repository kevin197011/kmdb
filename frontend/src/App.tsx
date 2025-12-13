import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, App as AntdApp, Spin } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import AppLayout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import AssetsPage from './pages/AssetsPage'
import AssetCredentialsPage from './pages/AssetCredentialsPage'
import LoginPage from './pages/LoginPage'
import UsersPage from './pages/UsersPage'
import AuditPage from './pages/AuditPage'
import WebSSHPage from './pages/WebSSHPage'
import APITokensPage from './pages/APITokensPage'
import TeamsPage from './pages/TeamsPage'
import ScopedPermissionsPage from './pages/ScopedPermissionsPage'

dayjs.locale('zh-cn')

// 受保护的路由组件
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('access_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  const [isChecking, setIsChecking] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token')
      setIsAuthenticated(!!token)
      setIsChecking(false)
    }

    checkAuth()

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        checkAuth()
      }
    }

    const handleAuthStateChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authStateChange', handleAuthStateChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authStateChange', handleAuthStateChange)
    }
  }, [])

  if (isChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5'
      }}>
        <Spin size="large" tip="加载中..." />
      </div>
    )
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          colorInfo: '#1890ff',
          borderRadius: 6,
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f5f7fa',
          fontSize: 14,
          controlHeight: 36,
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            bodyBg: '#f5f7fa',
            siderBg: '#001529',
          },
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(24, 144, 255, 0.15)',
            darkItemHoverBg: 'rgba(255, 255, 255, 0.08)',
            itemBorderRadius: 8,
            itemMarginBlock: 4,
            itemMarginInline: 12,
          },
          Card: {
            borderRadiusLG: 8,
            boxShadowTertiary: '0 1px 2px 0 rgba(0, 0, 0, 0.03), 0 1px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px 0 rgba(0, 0, 0, 0.02)',
          },
          Table: {
            headerBg: '#fafafa',
            headerColor: 'rgba(0, 0, 0, 0.85)',
            borderColor: '#f0f0f0',
            rowHoverBg: '#f5f7fa',
          },
          Button: {
            borderRadius: 6,
            controlHeight: 36,
            primaryShadow: '0 2px 0 rgba(24, 144, 255, 0.1)',
          },
          Input: {
            borderRadius: 6,
            controlHeight: 36,
          },
          Select: {
            borderRadius: 6,
            controlHeight: 36,
          },
          Modal: {
            borderRadiusLG: 12,
          },
          Dropdown: {
            borderRadiusLG: 8,
          },
        },
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <Routes>
            {/* 登录页面 */}
            <Route path="/login" element={<LoginPage />} />

            {/* 健康检查 */}
            <Route path="/health" element={<div>Health Check</div>} />

            {/* 首页重定向 */}
            <Route
              path="/"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
            />

            {/* 受保护的路由 */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/asset-credentials" element={<AssetCredentialsPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/audit" element={<AuditPage />} />
              <Route path="/webssh" element={<WebSSHPage />} />
              <Route path="/api-tokens" element={<APITokensPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/scoped-permissions" element={<ScopedPermissionsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App
