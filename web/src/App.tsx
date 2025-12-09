import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import { useToast } from './hooks/use-toast'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import AssetsPage from './pages/AssetsPage'
import AssetCredentialsPage from './pages/AssetCredentialsPage'
import LoginPage from './pages/LoginPage'
import UsersPage from './pages/UsersPage'
import UserGroupsPage from './pages/UserGroupsPage'
import RolesPage from './pages/RolesPage'
import UserRolesPage from './pages/UserRolesPage'
import GroupRolesPage from './pages/GroupRolesPage'
import AssetPermissionsPage from './pages/AssetPermissionsPage'
import ProjectPermissionsPage from './pages/ProjectPermissionsPage'
import AuditPage from './pages/AuditPage'
import WebSSHPage from './pages/WebSSHPage'
import APITokensPage from './pages/APITokensPage'

function App() {
  // 使用 useEffect 来检查 token，避免 SSR 问题
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const { ToastProvider } = useToast()

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('access_token')
      setIsAuthenticated(!!token)
      setIsChecking(false)
    }

    // 初始检查
    checkAuth()

    // 监听 storage 事件（跨标签页同步）
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'access_token') {
        checkAuth()
      }
    }

    // 监听自定义事件（同标签页内更新）
    const handleCustomStorageChange = () => {
      checkAuth()
    }

    window.addEventListener('storage', handleStorageChange)
    // 使用自定义事件名称来避免与原生 storage 事件冲突
    window.addEventListener('authStateChange', handleCustomStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authStateChange', handleCustomStorageChange)
    }
  }, [])

  if (isChecking) {
    return <div className="min-h-screen flex items-center justify-center">加载中...</div>
  }

  return (
    <>
      <ToastProvider />
      <BrowserRouter>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={
            isAuthenticated ? (
              <Layout>
                <DashboardPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/projects"
          element={
            isAuthenticated ? (
              <Layout>
                <ProjectsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/assets"
          element={
            isAuthenticated ? (
              <Layout>
                <AssetsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/asset-credentials"
          element={
            isAuthenticated ? (
              <Layout>
                <AssetCredentialsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/assets/:assetId/permissions"
          element={
            isAuthenticated ? (
              <Layout>
                <AssetPermissionsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/projects/:projectId/permissions"
          element={
            isAuthenticated ? (
              <Layout>
                <ProjectPermissionsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/users"
          element={
            isAuthenticated ? (
              <Layout>
                <UsersPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/user-groups"
          element={
            isAuthenticated ? (
              <Layout>
                <UserGroupsPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/roles"
          element={
            isAuthenticated ? (
              <Layout>
                <RolesPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/user-roles"
          element={
            isAuthenticated ? (
              <Layout>
                <UserRolesPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/group-roles"
          element={
            isAuthenticated ? (
              <Layout>
                <GroupRolesPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/audit"
          element={
            isAuthenticated ? (
              <Layout>
                <AuditPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/webssh"
          element={
            isAuthenticated ? (
              <Layout>
                <WebSSHPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/api-tokens"
          element={
            isAuthenticated ? (
              <Layout>
                <APITokensPage />
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="/health" element={<div>Health Check</div>} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App

