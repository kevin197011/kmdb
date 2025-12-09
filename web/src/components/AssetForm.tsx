import { useState, useEffect } from 'react'
import api from '../services/api'
import { useToast } from '../hooks/use-toast'

interface Project {
  id: string
  name: string
}

interface Asset {
  id?: string
  type: string
  name: string
  status: string
  project_id?: string
  ssh_port?: number
  ip?: string
  os?: string
  cpu?: string
  memory?: string
  disk?: string
  location?: string
  department?: string
  cloud_platform?: string
  remark?: string
}

interface AssetFormProps {
  asset?: Asset
  onSuccess: () => void
  onCancel: () => void
}

const CLOUD_PLATFORMS = [
  { value: '', label: '请选择' },
  { value: 'self-hosted', label: '自建机房' },
  { value: 'aliyun', label: '阿里云' },
  { value: 'tencent', label: '腾讯云' },
  { value: 'huawei', label: '华为云' },
  { value: 'aws', label: 'AWS' },
  { value: 'azure', label: 'Azure' },
  { value: 'gcp', label: 'Google Cloud' },
  { value: 'other', label: '其他' },
]

export default function AssetForm({ asset, onSuccess, onCancel }: AssetFormProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [formData, setFormData] = useState<Asset>({
    type: asset?.type || '',
    name: asset?.name || '',
    status: asset?.status || '',
    project_id: asset?.project_id || undefined,
    ssh_port: asset?.ssh_port || 22,
    ip: asset?.ip || '',
    os: asset?.os || '',
    cpu: asset?.cpu || '',
    memory: asset?.memory || '',
    disk: asset?.disk || '',
    location: asset?.location || '',
    department: asset?.department || '',
    cloud_platform: asset?.cloud_platform || '',
    remark: asset?.remark || '',
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const response = await api.get('/projects?page=1&limit=1000')
      setProjects(response.data.data || [])
    } catch (error) {
      console.error('加载项目失败:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (asset?.id) {
        await api.put(`/assets/${asset.id}`, formData)
      } else {
        await api.post('/assets', formData)
      }
      onSuccess()
      toast({ title: '成功', description: asset?.id ? '资产更新成功' : '资产创建成功', variant: 'success' })
    } catch (error: any) {
      console.error('Failed to save asset:', error)
      toast({ title: '错误', description: error.response?.data?.error || '保存失败，请检查输入', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
      {/* 基本信息 */}
      <div className="border-b pb-2 mb-2">
        <h4 className="font-medium text-gray-700">基本信息</h4>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">所属项目</label>
          <select
            value={formData.project_id || ''}
            onChange={(e) => setFormData({ ...formData, project_id: e.target.value || undefined })}
            className="w-full px-3 py-2 border rounded text-sm"
          >
            <option value="">未分配项目</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm">云平台</label>
          <select
            value={formData.cloud_platform || ''}
            onChange={(e) => setFormData({ ...formData, cloud_platform: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
          >
            {CLOUD_PLATFORMS.map((platform) => (
              <option key={platform.value} value={platform.value}>
                {platform.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">资产类型 *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded text-sm"
          >
            <option value="">请选择</option>
            <option value="server">服务器</option>
            <option value="vm">虚拟机</option>
            <option value="network_device">网络设备</option>
            <option value="application">应用</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm">资产名称 *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="如：web-server-01"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">状态 *</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            required
            className="w-full px-3 py-2 border rounded text-sm"
          >
            <option value="">请选择</option>
            <option value="active">运行中</option>
            <option value="inactive">已停止</option>
            <option value="maintenance">维护中</option>
          </select>
        </div>

        <div>
          <label className="block mb-1 text-sm">所属部门</label>
          <input
            type="text"
            value={formData.department || ''}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="如：技术部"
          />
        </div>
      </div>

      {/* 网络信息 */}
      <div className="border-b pb-2 mb-2 mt-4">
        <h4 className="font-medium text-gray-700">网络信息</h4>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">IP 地址</label>
          <input
            type="text"
            value={formData.ip || ''}
            onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="如：192.168.1.100"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">SSH 端口</label>
          <input
            type="number"
            value={formData.ssh_port || 22}
            onChange={(e) => setFormData({ ...formData, ssh_port: parseInt(e.target.value) || 22 })}
            className="w-full px-3 py-2 border rounded text-sm"
            min="1"
            max="65535"
            placeholder="22"
          />
        </div>
      </div>

      {/* 硬件配置 */}
      <div className="border-b pb-2 mb-2 mt-4">
        <h4 className="font-medium text-gray-700">硬件配置</h4>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">操作系统</label>
          <input
            type="text"
            value={formData.os || ''}
            onChange={(e) => setFormData({ ...formData, os: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="如：Ubuntu 22.04"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">CPU</label>
          <input
            type="text"
            value={formData.cpu || ''}
            onChange={(e) => setFormData({ ...formData, cpu: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="如：8核"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 text-sm">内存</label>
          <input
            type="text"
            value={formData.memory || ''}
            onChange={(e) => setFormData({ ...formData, memory: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="如：32GB"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">磁盘</label>
          <input
            type="text"
            value={formData.disk || ''}
            onChange={(e) => setFormData({ ...formData, disk: e.target.value })}
            className="w-full px-3 py-2 border rounded text-sm"
            placeholder="如：1TB SSD"
          />
        </div>
      </div>

      {/* 位置信息 */}
      <div className="border-b pb-2 mb-2 mt-4">
        <h4 className="font-medium text-gray-700">位置信息</h4>
      </div>

      <div>
        <label className="block mb-1 text-sm">物理位置</label>
        <input
          type="text"
          value={formData.location || ''}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm"
          placeholder="如：机房A-机架03"
        />
      </div>

      {/* 备注 */}
      <div className="border-b pb-2 mb-2 mt-4">
        <h4 className="font-medium text-gray-700">备注</h4>
      </div>

      <div>
        <textarea
          value={formData.remark || ''}
          onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
          className="w-full px-3 py-2 border rounded text-sm"
          rows={3}
          placeholder="其他备注信息..."
        />
      </div>

      <div className="flex gap-2 justify-end pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {loading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
