import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Clock,
  Award,
  AlertCircle
} from 'lucide-react';
import Card from '../components/ui/Card';
import Select from '../components/ui/Select';
import Skeleton from '../components/ui/Skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { analyticsAPI } from '../services/apiService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [dashboardData, setDashboardData] = useState(null);
  const [revenueTrends, setRevenueTrends] = useState([]);
  const [customerBehavior, setCustomerBehavior] = useState(null);
  const [deviceStats, setDeviceStats] = useState(null);
  const [sessionStats, setSessionStats] = useState(null);
  const [performance, setPerformance] = useState(null);

  const fetchDashboardAnalytics = async () => {
    try {
      const response = await analyticsAPI.getDashboard(period);
      if (response.data.success) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
    }
  };

  const fetchRevenueTrends = async () => {
    try {
      const response = await analyticsAPI.getRevenueTrends(period);
      if (response.data.success) {
        setRevenueTrends(response.data.trends);
      }
    } catch (error) {
      console.error('Error fetching revenue trends:', error);
    }
  };

  const fetchCustomerBehavior = async () => {
    try {
      const response = await analyticsAPI.getCustomerBehavior();
      if (response.data.success) {
        setCustomerBehavior(response.data);
      }
    } catch (error) {
      console.error('Error fetching customer behavior:', error);
    }
  };

  const fetchDeviceStats = async () => {
    try {
      const response = await analyticsAPI.getDeviceStats();
      if (response.data.success) {
        setDeviceStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching device stats:', error);
    }
  };

  const fetchSessionStats = async () => {
    try {
      const response = await analyticsAPI.getSessionStats();
      if (response.data.success) {
        setSessionStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching session stats:', error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const response = await analyticsAPI.getPerformance();
      if (response.data.success) {
        setPerformance(response.data);
      }
    } catch (error) {
      console.error('Error fetching performance:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardAnalytics(),
        fetchRevenueTrends(),
        fetchCustomerBehavior(),
        fetchDeviceStats(),
        fetchSessionStats(),
        fetchPerformance()
      ]);
      setLoading(false);
    };
    loadData();
  }, [period]);

  const formatCurrency = (amount) => {
    return `KSH ${parseFloat(amount || 0).toLocaleString()}`;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-sm md:text-base text-gray-600">Comprehensive insights and business intelligence</p>
          </div>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="year">Last Year</option>
          </Select>
        </div>

        {/* Revenue Overview */}
        {loading ? (
          <Skeleton className="h-48" />
        ) : dashboardData && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(dashboardData.revenue.total_revenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboardData.revenue.total_transactions} transactions
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="text-green-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Transaction</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(dashboardData.revenue.avg_transaction)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboardData.revenue.successful_transactions} successful
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <TrendingUp className="text-blue-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.customers.total_customers}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    +{dashboardData.customers.new_customers} new
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="text-purple-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active Sessions</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {dashboardData.sessions.active_sessions}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {dashboardData.sessions.total_sessions} total
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <Activity className="text-orange-600" size={24} />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Revenue Trends Chart */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Revenue Trends</h2>
            {loading ? (
              <Skeleton className="h-80" />
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={2} name="Revenue (KSH)" />
                  <Line type="monotone" dataKey="transactions" stroke="#3B82F6" strokeWidth={2} name="Transactions" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Customer Segmentation & Device Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Segments */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Customer Segments</h2>
              {loading || !customerBehavior ? (
                <Skeleton className="h-64" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={customerBehavior.segments}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ segment, customer_count }) => `${segment}: ${customer_count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="customer_count"
                      >
                        {customerBehavior.segments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    {customerBehavior.segments.map((seg, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-gray-600">{seg.segment}: {seg.customer_count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Device Status Distribution */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Device Status Distribution</h2>
              {loading || !deviceStats ? (
                <Skeleton className="h-64" />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={deviceStats.statusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        {/* Customer Retention & Peak Hours */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Retention */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Customer Retention</h2>
              {loading || !customerBehavior ? (
                <Skeleton className="h-40" />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-700">One-time Customers</span>
                    <span className="font-bold text-gray-900">{customerBehavior.retention.one_time}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <span className="text-gray-700">Occasional (2-5 purchases)</span>
                    <span className="font-bold text-blue-600">{customerBehavior.retention.occasional}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-700">Regular (6-10 purchases)</span>
                    <span className="font-bold text-green-600">{customerBehavior.retention.regular}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <span className="text-gray-700">Loyal (10+ purchases)</span>
                    <span className="font-bold text-purple-600">{customerBehavior.retention.loyal}</span>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Top Packages */}
          <Card>
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Top Packages</h2>
              {loading || !dashboardData ? (
                <Skeleton className="h-40" />
              ) : (
                <div className="space-y-3">
                  {dashboardData.topPackages.slice(0, 5).map((pkg, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{pkg.package_name || `KSH ${pkg.amount}`}</p>
                        <p className="text-sm text-gray-600">{pkg.purchase_count} purchases</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(pkg.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Session Duration Distribution */}
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Session Duration Distribution</h2>
            {loading || !sessionStats ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sessionStats.durationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="duration_range" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8B5CF6" name="Session Count" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Performance Metrics */}
        {performance && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Payment Success Rate</p>
                  <p className="text-3xl font-bold text-green-600">
                    {parseFloat(performance.paymentMetrics.success_rate || 0).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {performance.paymentMetrics.successful} / {performance.paymentMetrics.total}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Award className="text-green-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Confirmation Time</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {parseFloat(performance.avgResponseTime || 0).toFixed(1)}s
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Payment processing</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Clock className="text-blue-600" size={24} />
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">System Uptime</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {performance.uptime.active_days} days
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {performance.uptime.total_sessions} sessions
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Activity className="text-purple-600" size={24} />
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Analytics;