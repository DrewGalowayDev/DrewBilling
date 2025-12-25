import { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  Users,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  DollarSign,
  Wifi,
  Calendar,
  Phone,
  CreditCard,
  Activity,
  TrendingUp,
  UserCheck,
  UserX
} from 'lucide-react';
import { customersAPI } from '../services/apiService';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    totalRevenue: 0,
    averageSpend: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);

    return () => clearTimeout(timer);
  }, [statusFilter, sortBy, searchTerm]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const params = {};
      
      if (statusFilter !== 'all') params.status = statusFilter;
      if (sortBy !== 'recent') params.sortBy = sortBy;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const response = await customersAPI.getAll(params);
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await customersAPI.getStats();

      setStats({
        total: parseInt(response.data.total) || 0,
        active: parseInt(response.data.active) || 0,
        inactive: parseInt(response.data.inactive) || 0,
        totalRevenue: parseFloat(response.data.totalRevenue) || 0,
        averageSpend: parseFloat(response.data.averageSpend) || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCustomerDetails = async (phone) => {
    try {
      const response = await customersAPI.getById(phone);
      setSelectedCustomer(response.data.customer);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      alert('Failed to load customer details');
    }
  };

  const handleBlockCustomer = async (phone) => {
    if (!confirm('Are you sure you want to block this customer?')) return;

    try {
      await customersAPI.block(phone);
      alert('Customer blocked successfully');
      fetchCustomers();
      fetchStats();
    } catch (error) {
      console.error('Block error:', error);
      alert(error.response?.data?.message || 'Failed to block customer');
    }
  };

  const handleUnblockCustomer = async (phone) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/admin/customers/${phone}/unblock`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Customer unblocked successfully');
      fetchCustomers();
      fetchStats();
    } catch (error) {
      console.error('Unblock error:', error);
      alert(error.response?.data?.message || 'Failed to unblock customer');
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/admin/customers/export/csv',
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `customers_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export error:', error);
      alert(error.response?.data?.message || 'Failed to export customers');
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      active: { color: 'bg-green-100 text-green-700', icon: UserCheck, label: 'Active' },
      inactive: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Inactive' },
      blocked: { color: 'bg-red-100 text-red-700', icon: UserX, label: 'Blocked' }
    };

    const statusConfig = config[status] || config.inactive;
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

  const formatPhone = (phone) => {
    if (!phone) return 'N/A';
    return phone.replace(/(\d{3})(\d{3})(\d{3})(\d{3})/, '+$1 $2 $3 $4');
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading customers...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Customer Management</h1>
            <p className="text-gray-600 mt-1">Manage customer profiles, history, and activity</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <UserX className="w-8 h-8 text-gray-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-blue-600">Ksh {stats.totalRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg. Spend</p>
                <p className="text-2xl font-bold text-purple-600">Ksh {stats.averageSpend.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="recent">Most Recent</option>
                <option value="spending">Highest Spending</option>
                <option value="purchases">Most Purchases</option>
                <option value="name">Phone Number</option>
              </select>

              <button
                onClick={fetchCustomers}
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

        {/* Customers Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Phone Number</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Devices</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Total Spent</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Purchases</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Last Purchase</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No customers found</p>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.phone} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{formatPhone(customer.phone)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Wifi className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-900">{customer.device_count || 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-gray-900">Ksh {parseFloat(customer.total_spent || 0).toFixed(0)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span className="text-gray-900">{customer.purchase_count || 0}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{formatDate(customer.last_purchase)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(customer.status)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => fetchCustomerDetails(customer.phone)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          {customer.status === 'blocked' ? (
                            <button
                              onClick={() => handleUnblockCustomer(customer.phone)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Unblock Customer"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleBlockCustomer(customer.phone)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Block Customer"
                            >
                              <Ban className="w-5 h-5" />
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

        {/* Customer Details Modal */}
        {showDetailsModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Customer Details</h3>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false);
                      setSelectedCustomer(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 pb-6 border-b">
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium text-gray-900 text-lg">{formatPhone(selectedCustomer.phone)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {getStatusBadge(selectedCustomer.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="font-medium text-gray-900">Ksh {parseFloat(selectedCustomer.total_spent || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                    <p className="font-medium text-gray-900">{selectedCustomer.purchase_count || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">First Purchase</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedCustomer.first_purchase)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Purchase</p>
                    <p className="font-medium text-gray-900">{formatDate(selectedCustomer.last_purchase)}</p>
                  </div>
                </div>

                {/* Devices */}
                {selectedCustomer.devices && selectedCustomer.devices.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Wifi className="w-5 h-5" />
                      Registered Devices ({selectedCustomer.devices.length})
                    </h4>
                    <div className="space-y-2">
                      {selectedCustomer.devices.map((device, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-mono text-sm text-gray-900">{device.mac_address}</p>
                            <p className="text-xs text-gray-500">Last seen: {formatDate(device.last_seen)}</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs ${
                            device.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {device.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Payments */}
                {selectedCustomer.payments && selectedCustomer.payments.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Recent Payments
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left py-2 px-3 text-gray-600">Date</th>
                            <th className="text-left py-2 px-3 text-gray-600">Amount</th>
                            <th className="text-left py-2 px-3 text-gray-600">Package</th>
                            <th className="text-left py-2 px-3 text-gray-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedCustomer.payments.map((payment, idx) => (
                            <tr key={idx}>
                              <td className="py-2 px-3">{formatDate(payment.created_at)}</td>
                              <td className="py-2 px-3 font-medium">Ksh {payment.amount}</td>
                              <td className="py-2 px-3">{payment.time_purchased || 'N/A'}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-1 rounded text-xs ${
                                  payment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                  payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {payment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Active Sessions */}
                {selectedCustomer.sessions && selectedCustomer.sessions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5" />
                      Active Sessions
                    </h4>
                    <div className="space-y-2">
                      {selectedCustomer.sessions.map((session, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{session.duration_minutes} minutes</p>
                            <p className="text-xs text-gray-500">Speed: {session.speed_limit} | Started: {formatDate(session.session_start)}</p>
                          </div>
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            {session.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedCustomer(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                {selectedCustomer.status === 'blocked' ? (
                  <button
                    onClick={() => {
                      handleUnblockCustomer(selectedCustomer.phone);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Unblock Customer
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleBlockCustomer(selectedCustomer.phone);
                      setShowDetailsModal(false);
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Block Customer
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Customers;