import { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import { 
  Smartphone, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Filter,
  MoreVertical,
  Wifi,
  WifiOff,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import { devicesAPI } from '../services/apiService';

const Devices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const response = await devicesAPI.getAll();
      setDevices(response.data.devices || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
      // Use mock data for demonstration
      setDevices(generateMockDevices());
    } finally {
      setLoading(false);
    }
  };

  const generateMockDevices = () => {
    return [
      {
        id: 1,
        mac_address: '9C:29:76:6D:B1:4F',
        ip_address: '192.168.0.101',
        phone: '254712345678',
        status: 'active',
        first_seen: new Date(Date.now() - 86400000).toISOString(),
        last_seen: new Date().toISOString(),
        total_sessions: 5,
        total_spent: 150
      },
      {
        id: 2,
        mac_address: 'AA:BB:CC:DD:EE:FF',
        ip_address: '192.168.0.102',
        phone: '254723456789',
        status: 'pending',
        first_seen: new Date(Date.now() - 3600000).toISOString(),
        last_seen: new Date(Date.now() - 1800000).toISOString(),
        total_sessions: 1,
        total_spent: 30
      },
      {
        id: 3,
        mac_address: '11:22:33:44:55:66',
        ip_address: '192.168.0.103',
        phone: '254734567890',
        status: 'blocked',
        first_seen: new Date(Date.now() - 172800000).toISOString(),
        last_seen: new Date(Date.now() - 86400000).toISOString(),
        total_sessions: 3,
        total_spent: 80
      }
    ];
  };

  const handleStatusChange = async (deviceId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put(
        `http://localhost:5000/api/admin/devices/${deviceId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setDevices(devices.map(device => 
        device.id === deviceId ? { ...device, status: newStatus } : device
      ));
      setShowActionMenu(null);
    } catch (error) {
      console.error('Error updating device status:', error);
      alert('Failed to update device status');
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    if (!confirm('Are you sure you want to delete this device?')) return;

    try {
      const token = localStorage.getItem('adminToken');
      await axios.delete(`http://localhost:5000/api/admin/devices/${deviceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setDevices(devices.filter(device => device.id !== deviceId));
      setShowActionMenu(null);
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Failed to delete device');
    }
  };

  const filteredDevices = devices.filter(device => {
    const matchesSearch = 
      device.mac_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.phone?.includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || device.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Active' },
      pending: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pending' },
      blocked: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Blocked' },
      inactive: { color: 'bg-gray-100 text-gray-700', icon: WifiOff, label: 'Inactive' }
    };

    const config = statusConfig[status] || statusConfig.inactive;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading devices...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Devices</p>
                <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
              </div>
              <Smartphone className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {devices.filter(d => d.status === 'active').length}
                </p>
              </div>
              <Wifi className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {devices.filter(d => d.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Blocked</p>
                <p className="text-2xl font-bold text-red-600">
                  {devices.filter(d => d.status === 'blocked').length}
                </p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by MAC, IP, or phone number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="flex-1 md:flex-none px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="blocked">Blocked</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={fetchDevices}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Devices Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Device</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Phone</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Last Seen</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Sessions</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Total Spent</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-12">
                      <Smartphone className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500">No devices found</p>
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => (
                    <tr key={device.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-medium text-gray-900">{device.mac_address}</p>
                          <p className="text-sm text-gray-500">{device.ip_address}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-gray-900">{device.phone}</p>
                      </td>
                      <td className="py-4 px-6">
                        {getStatusBadge(device.status)}
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-gray-900">{formatTimeAgo(device.last_seen)}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-gray-900">{device.total_sessions || 0}</p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="font-medium text-gray-900">Ksh {device.total_spent || 0}</p>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          {device.status === 'pending' && (
                            <button
                              onClick={() => handleStatusChange(device.id, 'active')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          {device.status === 'active' && (
                            <button
                              onClick={() => handleStatusChange(device.id, 'blocked')}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Block"
                            >
                              <XCircle className="w-5 h-5" />
                            </button>
                          )}
                          {device.status === 'blocked' && (
                            <button
                              onClick={() => handleStatusChange(device.id, 'active')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Unblock"
                            >
                              <CheckCircle className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedDevice(device)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDevice(device.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Device Details Modal */}
        {selectedDevice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Device Details</h3>
                  <button
                    onClick={() => setSelectedDevice(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">MAC Address</p>
                    <p className="font-medium text-gray-900">{selectedDevice.mac_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">IP Address</p>
                    <p className="font-medium text-gray-900">{selectedDevice.ip_address}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone Number</p>
                    <p className="font-medium text-gray-900">{selectedDevice.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {getStatusBadge(selectedDevice.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">First Seen</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedDevice.first_seen).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Last Seen</p>
                    <p className="font-medium text-gray-900">
                      {new Date(selectedDevice.last_seen).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Sessions</p>
                    <p className="font-medium text-gray-900">{selectedDevice.total_sessions || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Spent</p>
                    <p className="font-medium text-gray-900">Ksh {selectedDevice.total_spent || 0}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => setSelectedDevice(null)}
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

export default Devices;