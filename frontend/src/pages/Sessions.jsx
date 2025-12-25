import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  Activity,
  Search,
  Download,
  Clock,
  Wifi,
  TrendingUp,
  XCircle,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Skeleton from '../components/ui/Skeleton';

const API_BASE = 'http://localhost:5000/api/admin/sessions';

const Sessions = () => {
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    sortBy: 'recent'
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionModal, setActionModal] = useState({ show: false, type: null, session: null });
  const [extendMinutes, setExtendMinutes] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminToken');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchSessions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_BASE}?${params}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  }, [filters, searchTerm]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSessionDetails = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        setSelectedSession(data.session);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
    }
  };

  const terminateSession = async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE}/${sessionId}/terminate`, {
        method: 'PUT',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      if (data.success) {
        alert('Session terminated successfully');
        setActionModal({ show: false, type: null, session: null });
        fetchSessions();
        fetchStats();
        if (showModal && selectedSession?.id === sessionId) {
          fetchSessionDetails(sessionId);
        }
      } else {
        alert(data.message || 'Failed to terminate session');
      }
    } catch (error) {
      console.error('Error terminating session:', error);
      alert('Error terminating session');
    }
  };

  const extendSession = async (sessionId) => {
    if (!extendMinutes || parseInt(extendMinutes) <= 0) {
      alert('Please enter a valid number of minutes');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/${sessionId}/extend`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ additionalMinutes: parseInt(extendMinutes) })
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`Session extended by ${extendMinutes} minutes`);
        setActionModal({ show: false, type: null, session: null });
        setExtendMinutes('');
        fetchSessions();
        fetchStats();
        if (showModal && selectedSession?.id === sessionId) {
          fetchSessionDetails(sessionId);
        }
      } else {
        alert(data.message || 'Failed to extend session');
      }
    } catch (error) {
      console.error('Error extending session:', error);
      alert('Error extending session');
    }
  };

  const exportToCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(`${API_BASE}/export/csv?${params}`, {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sessions_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting sessions:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSessions(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchSessions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSessions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, fetchSessions]);

  const getStatusBadge = (status, sessionEnd) => {
    const isExpired = new Date(sessionEnd) < new Date();
    
    if (status === 'active' && !isExpired) {
      return <Badge variant="success">Active</Badge>;
    } else if (status === 'active' && isExpired) {
      return <Badge variant="warning">Expired</Badge>;
    } else if (status === 'completed') {
      return <Badge variant="default">Completed</Badge>;
    } else if (status === 'terminated') {
      return <Badge variant="error">Terminated</Badge>;
    }
    return <Badge variant="default">{status}</Badge>;
  };

  const formatDuration = (minutes) => {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeRemaining = (sessionEnd) => {
    const now = new Date();
    const end = new Date(sessionEnd);
    const diff = end - now;
    
    if (diff < 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Session Management</h1>
            <p className="text-sm md:text-base text-gray-600">Monitor and manage active WiFi sessions</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Wifi className="text-blue-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Now</p>
                  <p className="text-2xl font-bold text-green-600">{stats.activeSessions}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Activity className="text-green-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedSessions}</p>
                </div>
                <div className="p-3 bg-gray-100 rounded-lg">
                  <CheckCircle className="text-gray-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Terminated</p>
                  <p className="text-2xl font-bold text-red-600">{stats.terminatedSessions}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <XCircle className="text-red-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Expired</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.expiredSessions}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <AlertCircle className="text-orange-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.avgDuration)}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Clock className="text-purple-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Minutes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalMinutes.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <TrendingUp className="text-indigo-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ending Soon</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.endingSoon}</p>
                  <p className="text-xs text-gray-500">Within 1 hour</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <AlertCircle className="text-yellow-600" size={24} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Search by phone or MAC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
              <option value="expired">Expired</option>
            </Select>

            <Select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
            >
              <option value="recent">Most Recent</option>
              <option value="duration">Longest Duration</option>
              <option value="amount">Highest Amount</option>
              <option value="ending_soon">Ending Soon</option>
            </Select>
          </div>
        </Card>

        {/* Sessions Table */}
        <Card>
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">MAC Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time Remaining</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="8" className="px-6 py-4">
                        <Skeleton className="h-6" />
                      </td>
                    </tr>
                  ))
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                      No sessions found
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{session.phone}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600 font-mono">{session.mac_address}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">KSH {session.amount}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatDuration(session.duration_minutes)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          getTimeRemaining(session.session_end) === 'Expired' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {getTimeRemaining(session.session_end)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(session.status, session.session_end)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{formatDate(session.session_start)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => fetchSessionDetails(session.id)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View
                          </button>
                          {session.status === 'active' && new Date(session.session_end) > new Date() && (
                            <>
                              <button
                                onClick={() => setActionModal({ show: true, type: 'extend', session })}
                                className="text-green-600 hover:text-green-800 text-sm font-medium"
                              >
                                Extend
                              </button>
                              <button
                                onClick={() => setActionModal({ show: true, type: 'terminate', session })}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                Terminate
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Session Details Modal */}
        {showModal && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Session Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Session Info */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Session Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Phone:</span>
                      <p className="font-medium text-gray-900">{selectedSession.phone}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">MAC Address:</span>
                      <p className="font-medium text-gray-900 font-mono">{selectedSession.mac_address}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Amount:</span>
                      <p className="font-medium text-gray-900">KSH {selectedSession.amount}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Duration:</span>
                      <p className="font-medium text-gray-900">{formatDuration(selectedSession.duration_minutes)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <p className="mt-1">{getStatusBadge(selectedSession.status, selectedSession.session_end)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Time Remaining:</span>
                      <p className="font-medium text-gray-900">{getTimeRemaining(selectedSession.session_end)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Started:</span>
                      <p className="font-medium text-gray-900">{formatDate(selectedSession.session_start)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Ends:</span>
                      <p className="font-medium text-gray-900">{formatDate(selectedSession.session_end)}</p>
                    </div>
                  </div>
                </div>

                {/* Device Info */}
                {selectedSession.device_status && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Device Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Device Status:</span>
                        <p className="font-medium text-gray-900">{selectedSession.device_status}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Last Seen:</span>
                        <p className="font-medium text-gray-900">
                          {selectedSession.device_last_seen ? formatDate(selectedSession.device_last_seen) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Info */}
                {selectedSession.payment_status && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Payment Status:</span>
                        <p className="font-medium text-gray-900">{selectedSession.payment_status}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Receipt Number:</span>
                        <p className="font-medium text-gray-900 font-mono">
                          {selectedSession.mpesa_receipt_number || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Transaction ID:</span>
                        <p className="font-medium text-gray-900">{selectedSession.transaction_id || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Paid At:</span>
                        <p className="font-medium text-gray-900">
                          {selectedSession.payment_created_at ? formatDate(selectedSession.payment_created_at) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
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

        {/* Action Modal (Terminate/Extend) */}
        {actionModal.show && actionModal.session && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {actionModal.type === 'terminate' ? 'Terminate Session' : 'Extend Session'}
                </h2>
              </div>

              <div className="p-6">
                {actionModal.type === 'terminate' ? (
                  <p className="text-gray-600">
                    Are you sure you want to terminate the session for{' '}
                    <span className="font-medium text-gray-900">{actionModal.session.phone}</span>?
                    This action cannot be undone.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Extend session for{' '}
                      <span className="font-medium text-gray-900">{actionModal.session.phone}</span>
                    </p>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Minutes
                      </label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter minutes to add"
                        value={extendMinutes}
                        onChange={(e) => setExtendMinutes(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setActionModal({ show: false, type: null, session: null });
                    setExtendMinutes('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionModal.type === 'terminate') {
                      terminateSession(actionModal.session.id);
                    } else {
                      extendSession(actionModal.session.id);
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-white ${
                    actionModal.type === 'terminate'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {actionModal.type === 'terminate' ? 'Terminate' : 'Extend'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Sessions;