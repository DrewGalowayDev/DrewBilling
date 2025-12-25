import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Shield,
  Activity,
  AlertTriangle,
  Calendar
} from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_BASE = 'http://localhost:5000/api/admin/audit-logs';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    action: '',
    entity_type: '',
    period: '30d',
    sortBy: 'recent'
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 50);
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_BASE}?${params}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setLogs(data.logs);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  }, [page, filters, searchTerm]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats?period=${filters.period}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchLogDetails = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedLog(data.log);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching log details:', error);
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_BASE}/export/csv?${params}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLogs(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchLogs, filters.period]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchLogs]);

  const getActionBadge = (action) => {
    const actionColors = {
      create: 'success',
      update: 'default',
      delete: 'error',
      login: 'default',
      logout: 'default',
      block: 'warning',
      unblock: 'success',
      terminate: 'error',
      extend: 'success',
      refund: 'warning'
    };
    
    return <Badge variant={actionColors[action] || 'default'}>{action}</Badge>;
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'payment':
        return '💳';
      case 'device':
        return '📱';
      case 'session':
        return '🌐';
      case 'customer':
        return '👤';
      case 'package':
        return '📦';
      case 'voucher':
        return '🎟️';
      case 'admin':
        return '👨‍💼';
      default:
        return '📄';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm md:text-base text-gray-600">Track all admin actions and system events</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm md:text-base whitespace-nowrap"
          >
            <Download size={18} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Logs</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalLogs}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FileText className="text-blue-600" size={24} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Admins</p>
                    <p className="text-2xl font-bold text-green-600">{stats.adminStats.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-lg">
                    <Shield className="text-green-600" size={24} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Actions Today</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {stats.timeline.length > 0 ? stats.timeline[stats.timeline.length - 1].count : 0}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Activity className="text-purple-600" size={24} />
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Critical Actions</p>
                    <p className="text-2xl font-bold text-red-600">{stats.criticalActions.length}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-lg">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Activity Timeline */}
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Activity Timeline</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={stats.timeline}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} name="Actions" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Action Types Distribution */}
              <Card>
                <div className="p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Action Types</h2>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={stats.actionStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="action" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Top Active Admins */}
            <Card>
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Most Active Admins</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.adminStats.slice(0, 6).map((admin, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{admin.username}</p>
                        <p className="text-sm text-gray-600">{admin.role}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-blue-600">{admin.action_count}</p>
                        <p className="text-xs text-gray-500">actions</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
            >
              <option value="">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="login">Login</option>
              <option value="block">Block</option>
              <option value="unblock">Unblock</option>
              <option value="terminate">Terminate</option>
              <option value="extend">Extend</option>
              <option value="refund">Refund</option>
            </Select>

            <Select
              value={filters.entity_type}
              onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
            >
              <option value="">All Entities</option>
              <option value="payment">Payments</option>
              <option value="device">Devices</option>
              <option value="session">Sessions</option>
              <option value="customer">Customers</option>
              <option value="package">Packages</option>
              <option value="voucher">Vouchers</option>
              <option value="admin">Admins</option>
            </Select>

            <Select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest First</option>
              <option value="admin">By Admin</option>
              <option value="action">By Action</option>
            </Select>
          </div>
        </Card>

        {/* Audit Logs Table */}
        <Card>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Admin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="7" className="px-6 py-4">
                        <Skeleton className="h-6" />
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(log.created_at)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-medium text-gray-900">{log.username || 'N/A'}</p>
                          {log.role && (
                            <p className="text-xs text-gray-500">{log.role}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span>{getEntityIcon(log.entity_type)}</span>
                          <span className="text-sm text-gray-900">{log.entity_type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 line-clamp-2">
                          {log.details || 'No details'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 font-mono">{log.ip_address || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => fetchLogDetails(log.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} logs
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2 rounded-lg ${
                          pagination.page === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>

        {/* Log Details Modal */}
        {showModal && selectedLog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Audit Log Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Log ID:</span>
                    <p className="font-medium text-gray-900">{selectedLog.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Timestamp:</span>
                    <p className="font-medium text-gray-900">{formatDate(selectedLog.created_at)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Admin:</span>
                    <p className="font-medium text-gray-900">{selectedLog.username || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Role:</span>
                    <p className="font-medium text-gray-900">{selectedLog.role || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Action:</span>
                    <p className="mt-1">{getActionBadge(selectedLog.action)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Entity Type:</span>
                    <p className="font-medium text-gray-900">{selectedLog.entity_type}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Entity ID:</span>
                    <p className="font-medium text-gray-900">{selectedLog.entity_id || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">IP Address:</span>
                    <p className="font-medium text-gray-900 font-mono">{selectedLog.ip_address || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <span className="text-sm text-gray-600">Details:</span>
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {selectedLog.details || 'No additional details'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AuditLogs;