import { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  Ticket,
  Plus,
  Search,
  RefreshCw,
  Download,
  Eye,
  Ban,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Zap,
  Copy,
  TrendingUp
} from 'lucide-react';
import axios from 'axios';

const Vouchers = () => {
  const [vouchers, setVouchers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    used: 0,
    expired: 0,
    totalValueRedeemed: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [generatedVouchers, setGeneratedVouchers] = useState([]);
  const [formData, setFormData] = useState({
    count: 1,
    amount: '',
    duration_minutes: '',
    speed_limit: '5M',
    description: '',
    expires_in_days: ''
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVouchers();
    }, 300);

    return () => clearTimeout(timer);
  }, [statusFilter, searchTerm]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const response = await axios.get(
        `http://localhost:5000/api/admin/vouchers?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setVouchers(response.data.vouchers || []);
    } catch (error) {
      console.error('Error fetching vouchers:', error);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/admin/vouchers/stats',
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchVoucherDetails = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/admin/vouchers/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSelectedVoucher(response.data.voucher);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching voucher details:', error);
      alert('Failed to load voucher details');
    }
  };

  const handleGenerate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/admin/vouchers/generate',
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGeneratedVouchers(response.data.vouchers);
      alert(response.data.message);
      fetchVouchers();
      fetchStats();
    } catch (error) {
      console.error('Error generating vouchers:', error);
      alert(error.response?.data?.message || 'Failed to generate vouchers');
    }
  };

  const handleDeactivate = async (id, code) => {
    if (!confirm(`Deactivate voucher ${code}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/admin/vouchers/${id}/deactivate`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Voucher deactivated successfully');
      fetchVouchers();
      fetchStats();
    } catch (error) {
      console.error('Error deactivating voucher:', error);
      alert(error.response?.data?.message || 'Failed to deactivate voucher');
    }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete voucher ${code}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/admin/vouchers/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Voucher deleted successfully');
      fetchVouchers();
      fetchStats();
    } catch (error) {
      console.error('Error deleting voucher:', error);
      alert(error.response?.data?.message || 'Failed to delete voucher');
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/admin/vouchers/export/csv',
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vouchers_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export vouchers');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Active' },
      used: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle, label: 'Used' },
      expired: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Expired' }
    };

    const statusConfig = config[status] || config.active;
    const Icon = statusConfig.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
        <Icon className="w-3 h-3" />
        {statusConfig.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading vouchers...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voucher Management</h1>
            <p className="text-gray-600 mt-1">Generate and manage WiFi access vouchers</p>
          </div>
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Generate Vouchers
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vouchers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Ticket className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Used</p>
                <p className="text-2xl font-bold text-blue-600">{stats.used}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Value Redeemed</p>
                <p className="text-2xl font-bold text-purple-600">Ksh {stats.totalValueRedeemed}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="used">Used</option>
                <option value="expired">Expired</option>
              </select>
              <button
                onClick={fetchVouchers}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Vouchers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Voucher Code</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Duration</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Speed</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Created</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No vouchers found</p>
                    </td>
                  </tr>
                ) : (
                  vouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-gray-900">{voucher.voucher_code}</span>
                          <button
                            onClick={() => copyToClipboard(voucher.voucher_code)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Copy code"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-medium text-gray-900">Ksh {voucher.amount}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{voucher.duration_minutes} min</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{voucher.speed_limit}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(voucher.status)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-900">{formatDate(voucher.created_at)}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => fetchVoucherDetails(voucher.id)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {voucher.status === 'active' && (
                            <button
                              onClick={() => handleDeactivate(voucher.id, voucher.voucher_code)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Deactivate"
                            >
                              <Ban className="w-5 h-5" />
                            </button>
                          )}
                          {voucher.status !== 'used' && (
                            <button
                              onClick={() => handleDelete(voucher.id, voucher.voucher_code)}
                              className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">Generate Vouchers</h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Vouchers</label>
                    <input
                      type="number"
                      value={formData.count}
                      onChange={(e) => setFormData({...formData, count: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Ksh)</label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="30"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      value={formData.duration_minutes}
                      onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="1440"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Speed Limit</label>
                    <input
                      type="text"
                      value={formData.speed_limit}
                      onChange={(e) => setFormData({...formData, speed_limit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="5M"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires In (Days)</label>
                    <input
                      type="number"
                      value={formData.expires_in_days}
                      onChange={(e) => setFormData({...formData, expires_in_days: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Leave empty for no expiry"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Voucher description..."
                  />
                </div>

                {generatedVouchers.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">Generated Vouchers:</h4>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {generatedVouchers.map((v) => (
                        <div key={v.id} className="flex items-center justify-between text-sm">
                          <span className="font-mono">{v.voucher_code}</span>
                          <button
                            onClick={() => copyToClipboard(v.voucher_code)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    setGeneratedVouchers([]);
                    setFormData({
                      count: 1,
                      amount: '',
                      duration_minutes: '',
                      speed_limit: '5M',
                      description: '',
                      expires_in_days: ''
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleGenerate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Generate Vouchers
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedVoucher && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Voucher Details</h3>
                  <button
                    onClick={() => { setShowDetailsModal(false); setSelectedVoucher(null); }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Voucher Code</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-medium text-gray-900 text-lg">{selectedVoucher.voucher_code}</p>
                      <button
                        onClick={() => copyToClipboard(selectedVoucher.voucher_code)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {getStatusBadge(selectedVoucher.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium text-gray-900">Ksh {selectedVoucher.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">{selectedVoucher.duration_minutes} minutes</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Speed Limit</p>
                    <p className="font-medium text-gray-900">{selectedVoucher.speed_limit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Created</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedVoucher.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Expires At</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedVoucher.expires_at)}</p>
                  </div>
                  {selectedVoucher.used_at && (
                    <>
                      <div>
                        <p className="text-sm text-gray-600">Used At</p>
                        <p className="font-medium text-gray-900">{formatDate(selectedVoucher.used_at)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Used By Phone</p>
                        <p className="font-medium text-gray-900">{selectedVoucher.used_by_phone || 'N/A'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Used By MAC</p>
                        <p className="font-mono text-sm text-gray-900">{selectedVoucher.used_by_mac || 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
                {selectedVoucher.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-medium text-gray-900">{selectedVoucher.description}</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowDetailsModal(false); setSelectedVoucher(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
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

export default Vouchers;