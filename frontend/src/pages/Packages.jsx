import { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  Package,
  Plus,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Clock,
  DollarSign,
  Zap,
  TrendingUp,
  CheckCircle,
  XCircle,
  Activity,
  Eye,
  Palette,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import api from '../services/api';

// Color gradient options matching the user portal design
const COLOR_GRADIENTS = [
  { value: 'from-yellow-500 to-orange-600', label: 'Yellow → Orange', colors: ['#eab308', '#ea580c'] },
  { value: 'from-green-500 to-emerald-600', label: 'Green → Emerald', colors: ['#22c55e', '#059669'] },
  { value: 'from-blue-500 to-cyan-600', label: 'Blue → Cyan', colors: ['#3b82f6', '#0891b2'] },
  { value: 'from-pink-500 to-orange-600', label: 'Pink → Orange', colors: ['#ec4899', '#ea580c'] },
  { value: 'from-purple-500 to-indigo-600', label: 'Purple → Indigo', colors: ['#a855f7', '#4f46e5'] },
  { value: 'from-gray-700 to-gray-900', label: 'Dark Gray', colors: ['#374151', '#111827'] },
  { value: 'from-purple-500 to-pink-600', label: 'Purple → Pink', colors: ['#a855f7', '#db2777'] },
  { value: 'from-yellow-500 to-green-600', label: 'Yellow → Green', colors: ['#eab308', '#16a34a'] },
  { value: 'from-red-500 to-purple-600', label: 'Red → Purple', colors: ['#ef4444', '#9333ea'] },
  { value: 'from-teal-500 to-cyan-600', label: 'Teal → Cyan', colors: ['#14b8a6', '#0891b2'] },
  { value: 'from-orange-500 to-red-600', label: 'Orange → Red', colors: ['#f97316', '#dc2626'] },
  { value: 'from-indigo-500 to-purple-600', label: 'Indigo → Purple', colors: ['#6366f1', '#9333ea'] },
  { value: 'from-rose-500 to-pink-600', label: 'Rose → Pink', colors: ['#f43f5e', '#db2777'] },
  { value: 'from-amber-500 to-yellow-600', label: 'Amber → Yellow', colors: ['#f59e0b', '#ca8a04'] },
  { value: 'from-lime-500 to-green-600', label: 'Lime → Green', colors: ['#84cc16', '#16a34a'] },
  { value: 'from-sky-500 to-blue-600', label: 'Sky → Blue', colors: ['#0ea5e9', '#2563eb'] },
];

const DURATION_LABELS = [
  'Quick Access',
  'Short Session',
  'Half Day',
  'Full Day',
  'Extended',
  'Weekend',
  'Weekly',
  'Monthly',
  'Standard',
  'Premium'
];

const Packages = () => {
  const [packages, setPackages] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    purchasesThisMonth: 0,
    revenueThisMonth: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    duration: '',
    duration_minutes: '',
    speed_limit: '',
    description: '',
    status: 'active',
    color_gradient: 'from-blue-500 to-cyan-600',
    duration_label: 'Standard',
    display_order: 0
  });

  useEffect(() => {
    fetchPackages();
    fetchStats();
  }, [statusFilter]);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/api/admin/packages?${params.toString()}`);
      setPackages(response.data.packages || []);
    } catch (error) {
      console.error('Error fetching packages:', error);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/api/admin/packages/stats');

      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPackageDetails = async (id) => {
    try {
      const response = await api.get(`/api/admin/packages/${id}`);
      setSelectedPackage(response.data.package);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error fetching package details:', error);
      alert('Failed to load package details');
    }
  };

  const handleCreateOrUpdate = async () => {
    try {
      if (isEditing) {
        await api.put(`/api/admin/packages/${selectedPackage.id}`, formData);
        alert('Package updated successfully');
      } else {
        await api.post('/api/admin/packages', formData);
        alert('Package created successfully');
      }
      
      setShowModal(false);
      resetForm();
      fetchPackages();
      fetchStats();
    } catch (error) {
      console.error('Error saving package:', error);
      alert(error.response?.data?.message || 'Failed to save package');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/api/admin/packages/${id}`);
      alert('Package deleted successfully');
      fetchPackages();
      fetchStats();
    } catch (error) {
      console.error('Error deleting package:', error);
      alert(error.response?.data?.message || 'Failed to delete package');
    }
  };

  const handleInitializeDefaults = async () => {
    if (!confirm('This will create default packages with colors matching the user portal. Continue?')) return;

    try {
      const response = await api.post('/api/admin/packages/initialize');
      alert(response.data.message);
      fetchPackages();
      fetchStats();
    } catch (error) {
      console.error('Error initializing packages:', error);
      alert(error.response?.data?.message || 'Failed to initialize packages');
    }
  };

  const handleMoveUp = async (index) => {
    if (index === 0) return;
    const newPackages = [...packages];
    [newPackages[index - 1], newPackages[index]] = [newPackages[index], newPackages[index - 1]];
    const updates = newPackages.map((pkg, i) => ({ id: pkg.id, display_order: i + 1 }));
    try {
      await api.put('/api/admin/packages/reorder/bulk', { packages: updates });
      setPackages(newPackages);
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const handleMoveDown = async (index) => {
    if (index === packages.length - 1) return;
    const newPackages = [...packages];
    [newPackages[index], newPackages[index + 1]] = [newPackages[index + 1], newPackages[index]];
    const updates = newPackages.map((pkg, i) => ({ id: pkg.id, display_order: i + 1 }));
    try {
      await api.put('/api/admin/packages/reorder/bulk', { packages: updates });
      setPackages(newPackages);
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditing(false);
    setShowModal(true);
  };

  const openEditModal = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name,
      amount: pkg.amount,
      duration: pkg.duration,
      duration_minutes: pkg.duration_minutes,
      speed_limit: pkg.speed_limit,
      description: pkg.description || '',
      status: pkg.status,
      color_gradient: pkg.color_gradient || 'from-blue-500 to-cyan-600',
      duration_label: pkg.duration_label || 'Standard',
      display_order: pkg.display_order || 0
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      amount: '',
      duration: '',
      duration_minutes: '',
      speed_limit: '',
      description: '',
      status: 'active',
      color_gradient: 'from-blue-500 to-cyan-600',
      duration_label: 'Standard',
      display_order: packages.length + 1
    });
    setSelectedPackage(null);
  };

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getGradientStyle = (gradient) => {
    const colorObj = COLOR_GRADIENTS.find(c => c.value === gradient);
    if (colorObj) {
      return { background: `linear-gradient(to right, ${colorObj.colors[0]}, ${colorObj.colors[1]})` };
    }
    return { background: 'linear-gradient(to right, #3b82f6, #0891b2)' };
  };

  const getStatusBadge = (status) => {
    return status === 'active' ? (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" />
        Active
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        <XCircle className="w-3 h-3" />
        Inactive
      </span>
    );
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading packages...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Package Management</h1>
            <p className="text-gray-600 mt-1">Manage WiFi packages - changes reflect on User Portal instantly</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowPreviewModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview Portal
            </button>
            <button
              onClick={handleInitializeDefaults}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Initialize Defaults
            </button>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Create Package
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Packages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
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
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <XCircle className="w-8 h-8 text-gray-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Purchases (30d)</p>
                <p className="text-2xl font-bold text-blue-600">{stats.purchasesThisMonth}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue (30d)</p>
                <p className="text-2xl font-bold text-purple-600">Ksh {stats.revenueThisMonth}</p>
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
                placeholder="Search packages..."
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
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={fetchPackages}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Packages Grid - Preview exactly as shown on User Portal */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPackages.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow-sm p-12 text-center">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No packages found</p>
            </div>
          ) : (
            filteredPackages.map((pkg, index) => (
              <div key={pkg.id} className="relative group">
                {/* Order indicator */}
                <div className="absolute -top-2 -left-2 z-10 bg-gray-800 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                  {pkg.display_order || index + 1}
                </div>
                
                {/* Status indicator */}
                <div className={`absolute -top-2 -right-2 z-10 w-3 h-3 rounded-full ${pkg.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} 
                     title={pkg.status === 'active' ? 'Active' : 'Inactive'} />

                {/* Card with gradient - matches UserPortal design exactly */}
                <div 
                  className={`bg-gradient-to-r ${pkg.color_gradient || 'from-blue-500 to-cyan-600'} rounded-xl p-4 text-white shadow-lg transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer`}
                  onClick={() => openEditModal(pkg)}
                >
                  <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xl font-bold">{pkg.name}</span>
                      <span className="text-lg font-bold">Ksh {pkg.amount}</span>
                    </div>
                    <div className="text-white/90 text-sm mb-3">
                      {pkg.duration_label || pkg.duration || 'Duration'}
                    </div>
                    <div className="flex justify-between items-center text-xs text-white/80">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {pkg.speed_limit || '5M'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {pkg.duration_minutes}min
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons - appear on hover */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-full group-hover:translate-y-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                    disabled={index === 0}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4 text-gray-700" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); fetchPackageDetails(pkg.id); }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(pkg); }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                    title="Edit"
                  >
                    <Edit className="w-4 h-4 text-green-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(pkg.id, pkg.name); }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-red-100"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                    disabled={index === filteredPackages.length - 1}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full my-8">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'Edit Package' : 'Create New Package'}
                </h3>
              </div>
              
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Live Preview Card */}
                <div className="bg-gray-100 rounded-xl p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <Eye className="w-4 h-4 inline mr-1" /> Live Preview (as shown on User Portal)
                  </label>
                  <div className="flex justify-center">
                    <div className="w-64">
                      <div 
                        className={`bg-gradient-to-r ${formData.color_gradient || 'from-blue-500 to-cyan-600'} rounded-xl p-4 text-white shadow-lg`}
                      >
                        <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xl font-bold">{formData.name || 'Package Name'}</span>
                            <span className="text-lg font-bold">Ksh {formData.amount || '0'}</span>
                          </div>
                          <div className="text-white/90 text-sm mb-3">
                            {formData.duration_label || formData.duration || 'Duration'}
                          </div>
                          <div className="flex justify-between items-center text-xs text-white/80">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {formData.speed_limit || '5M'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formData.duration_minutes || '0'}min
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Basic Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Package Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g., 24 Hours"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration Code</label>
                    <input
                      type="text"
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="24h"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration Label (Display)</label>
                    <select
                      value={formData.duration_label}
                      onChange={(e) => setFormData({...formData, duration_label: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      {DURATION_LABELS.map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.display_order}
                      onChange={(e) => setFormData({...formData, display_order: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                {/* Color Gradient Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Palette className="w-4 h-4 inline mr-1" /> Card Color Gradient
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {COLOR_GRADIENTS.map((gradient) => (
                      <button
                        key={gradient.value}
                        type="button"
                        onClick={() => setFormData({...formData, color_gradient: gradient.value})}
                        className={`relative h-12 rounded-lg transition-all ${
                          formData.color_gradient === gradient.value 
                            ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' 
                            : 'hover:scale-105'
                        }`}
                        style={getGradientStyle(gradient.colors)}
                        title={gradient.label}
                      >
                        {formData.color_gradient === gradient.value && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white rounded-full p-1">
                              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Selected: {COLOR_GRADIENTS.find(g => g.value === formData.color_gradient)?.label || 'Default'}
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Package description..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {isEditing ? 'Update' : 'Create'} Package
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedPackage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Package Details</h3>
                  <button
                    onClick={() => { setShowDetailsModal(false); setSelectedPackage(null); }}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Package Name</p>
                    <p className="font-medium text-gray-900 text-lg">{selectedPackage.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Amount</p>
                    <p className="font-medium text-gray-900 text-lg">Ksh {selectedPackage.amount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Duration</p>
                    <p className="font-medium text-gray-900">{selectedPackage.duration} ({selectedPackage.duration_minutes} min)</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Speed Limit</p>
                    <p className="font-medium text-gray-900">{selectedPackage.speed_limit}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    {getStatusBadge(selectedPackage.status)}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Purchases</p>
                    <p className="font-medium text-gray-900">{selectedPackage.total_purchases || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Confirmed Purchases</p>
                    <p className="font-medium text-gray-900">{selectedPackage.confirmed_purchases || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="font-medium text-gray-900">Ksh {parseFloat(selectedPackage.total_revenue || 0).toFixed(2)}</p>
                  </div>
                </div>
                {selectedPackage.description && (
                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="font-medium text-gray-900">{selectedPackage.description}</p>
                  </div>
                )}
                {/* Color Preview */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">Card Color Preview</p>
                  <div 
                    className={`bg-gradient-to-r ${selectedPackage.color_gradient || 'from-blue-500 to-cyan-600'} rounded-lg p-3 text-white inline-block`}
                  >
                    <span className="font-medium">{selectedPackage.name}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => { setShowDetailsModal(false); setSelectedPackage(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Portal Preview Modal - Shows how packages appear to customers */}
        {showPreviewModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-blue-900 rounded-xl shadow-2xl max-w-6xl w-full my-8">
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Eye className="w-5 h-5" />
                    User Portal Preview
                  </h3>
                  <p className="text-gray-400 text-sm mt-1">
                    This is exactly how your packages will appear to customers
                  </p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-white text-2xl transition-colors"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white">Choose Your WiFi Package</h2>
                  <p className="text-blue-300 text-sm mt-1">Select a package to get started</p>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                  {packages.filter(pkg => pkg.status === 'active').map((pkg) => (
                    <div 
                      key={pkg.id}
                      className={`bg-gradient-to-r ${pkg.color_gradient || 'from-blue-500 to-cyan-600'} rounded-xl p-4 text-white shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer`}
                    >
                      <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xl font-bold">{pkg.name}</span>
                          <span className="text-lg font-bold">Ksh {pkg.amount}</span>
                        </div>
                        <div className="text-white/90 text-sm mb-3">
                          {pkg.duration_label || pkg.duration || 'Duration'}
                        </div>
                        <div className="flex justify-between items-center text-xs text-white/80">
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {pkg.speed_limit || '5M'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {pkg.duration_minutes}min
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {packages.filter(pkg => pkg.status === 'active').length === 0 && (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">No active packages to display</p>
                    <p className="text-gray-500 text-sm">Create and activate packages to see them here</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-700 flex gap-3 justify-end">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Packages;