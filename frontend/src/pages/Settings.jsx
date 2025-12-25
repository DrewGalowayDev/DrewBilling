import React, { useState, useEffect } from 'react';
import AdminLayout from '../components/layout/AdminLayout';
import {
  Settings as SettingsIcon,
  Save,
  Key,
  Wifi,
  DollarSign,
  Shield,
  Bell,
  Globe,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { settingsAPI, routerAPI } from '../services/apiService';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('mpesa');
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  
  const [mpesaSettings, setMpesaSettings] = useState({
    consumer_key: '',
    consumer_secret: '',
    shortcode: '174379',
    passkey: '',
    callback_url: '',
    environment: 'sandbox'
  });

  const [mikrotikSettings, setMikrotikSettings] = useState({
    host: '192.168.1.1',
    port: '8728',
    username: '',
    password: ''
  });

  const [systemSettings, setSystemSettings] = useState({
    site_name: 'Oneal WiFi',
    support_email: '',
    support_phone: '',
    currency: 'KSH',
    timezone: 'Africa/Nairobi',
    session_timeout: '30',
    enable_notifications: true,
    enable_sms: false,
    enable_email: false
  });

  const [securitySettings, setSecuritySettings] = useState({
    require_2fa: false,
    session_duration: '24',
    password_expiry: '90',
    max_login_attempts: '5'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [mpesaRes, mikrotikRes, systemRes] = await Promise.all([
        settingsAPI.getMpesa().catch(() => ({ data: {} })),
        settingsAPI.getMikrotik().catch(() => ({ data: {} })),
        settingsAPI.getSystemInfo().catch(() => ({ data: {} }))
      ]);

      if (mpesaRes.data.settings) {
        setMpesaSettings(prev => ({ ...prev, ...mpesaRes.data.settings }));
      }
      if (mikrotikRes.data.settings) {
        setMikrotikSettings(prev => ({ ...prev, ...mikrotikRes.data.settings }));
      }
      if (systemRes.data.settings) {
        setSystemSettings(prev => ({ ...prev, ...systemRes.data.settings }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = async (settingType) => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      let response;
      switch (settingType) {
        case 'MPesa':
          response = await settingsAPI.updateMpesa(mpesaSettings);
          break;
        case 'MikroTik':
          response = await settingsAPI.updateMikrotik(mikrotikSettings);
          break;
        case 'System':
          response = await settingsAPI.update(systemSettings);
          break;
        default:
          response = await settingsAPI.update({ [settingType.toLowerCase()]: true });
      }
      setMessage({ type: 'success', text: `${settingType} settings saved successfully!` });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || `Error saving ${settingType} settings` });
    } finally {
      setSaving(false);
    }
  };

  const handleTestMikrotik = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await settingsAPI.testMikrotik();
      if (response.data.success) {
        setMessage({ type: 'success', text: 'MikroTik connection successful!' });
      } else {
        setMessage({ type: 'error', text: response.data.error || 'Connection failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Connection test failed' });
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'mpesa', name: 'MPesa Integration', icon: DollarSign },
    { id: 'mikrotik', name: 'MikroTik Router', icon: Wifi },
    { id: 'system', name: 'System Settings', icon: SettingsIcon },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Configure system settings and integrations</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-2">
          <div className="flex overflow-x-auto gap-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">{tab.name}</span>
                  <span className="text-sm font-medium sm:hidden">{tab.name.split(' ')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* MPesa Settings */}
        {activeTab === 'mpesa' && (
          <Card>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">MPesa Integration</h2>
                  <p className="text-sm text-gray-600">Configure MPesa STK Push settings</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consumer Key
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.consumer_key ? 'text' : 'password'}
                      value={mpesaSettings.consumer_key}
                      onChange={(e) => setMpesaSettings({ ...mpesaSettings, consumer_key: e.target.value })}
                      placeholder="Enter consumer key"
                    />
                    <button
                      onClick={() => togglePasswordVisibility('consumer_key')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.consumer_key ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Consumer Secret
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.consumer_secret ? 'text' : 'password'}
                      value={mpesaSettings.consumer_secret}
                      onChange={(e) => setMpesaSettings({ ...mpesaSettings, consumer_secret: e.target.value })}
                      placeholder="Enter consumer secret"
                    />
                    <button
                      onClick={() => togglePasswordVisibility('consumer_secret')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.consumer_secret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Shortcode
                  </label>
                  <Input
                    type="text"
                    value={mpesaSettings.shortcode}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, shortcode: e.target.value })}
                    placeholder="174379"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Passkey
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.passkey ? 'text' : 'password'}
                      value={mpesaSettings.passkey}
                      onChange={(e) => setMpesaSettings({ ...mpesaSettings, passkey: e.target.value })}
                      placeholder="Enter passkey"
                    />
                    <button
                      onClick={() => togglePasswordVisibility('passkey')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.passkey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Callback URL
                  </label>
                  <Input
                    type="text"
                    value={mpesaSettings.callback_url}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, callback_url: e.target.value })}
                    placeholder="https://yourdomain.com/api/mpesa/callback"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Environment
                  </label>
                  <Select
                    value={mpesaSettings.environment}
                    onChange={(e) => setMpesaSettings({ ...mpesaSettings, environment: e.target.value })}
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => handleSave('MPesa')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* MikroTik Settings */}
        {activeTab === 'mikrotik' && (
          <Card>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Wifi className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">MikroTik Router Configuration</h2>
                  <p className="text-sm text-gray-600">Configure router API connection</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Router IP Address
                  </label>
                  <Input
                    type="text"
                    value={mikrotikSettings.host}
                    onChange={(e) => setMikrotikSettings({ ...mikrotikSettings, host: e.target.value })}
                    placeholder="192.168.1.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Port
                  </label>
                  <Input
                    type="text"
                    value={mikrotikSettings.port}
                    onChange={(e) => setMikrotikSettings({ ...mikrotikSettings, port: e.target.value })}
                    placeholder="8728"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <Input
                    type="text"
                    value={mikrotikSettings.username}
                    onChange={(e) => setMikrotikSettings({ ...mikrotikSettings, username: e.target.value })}
                    placeholder="admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      type={showPasswords.mikrotik_password ? 'text' : 'password'}
                      value={mikrotikSettings.password}
                      onChange={(e) => setMikrotikSettings({ ...mikrotikSettings, password: e.target.value })}
                      placeholder="Enter password"
                    />
                    <button
                      onClick={() => togglePasswordVisibility('mikrotik_password')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPasswords.mikrotik_password ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Test Connection</p>
                  <p className="text-xs text-gray-600">Verify router connectivity before saving</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Test Now
                </button>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => handleSave('MikroTik')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* System Settings */}
        {activeTab === 'system' && (
          <Card>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <SettingsIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">System Settings</h2>
                  <p className="text-sm text-gray-600">General system configuration</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Site Name
                  </label>
                  <Input
                    type="text"
                    value={systemSettings.site_name}
                    onChange={(e) => setSystemSettings({ ...systemSettings, site_name: e.target.value })}
                    placeholder="Oneal WiFi"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Email
                  </label>
                  <Input
                    type="email"
                    value={systemSettings.support_email}
                    onChange={(e) => setSystemSettings({ ...systemSettings, support_email: e.target.value })}
                    placeholder="support@onealwifi.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Support Phone
                  </label>
                  <Input
                    type="tel"
                    value={systemSettings.support_phone}
                    onChange={(e) => setSystemSettings({ ...systemSettings, support_phone: e.target.value })}
                    placeholder="+254 700 000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <Select
                    value={systemSettings.currency}
                    onChange={(e) => setSystemSettings({ ...systemSettings, currency: e.target.value })}
                  >
                    <option value="KSH">KSH - Kenyan Shilling</option>
                    <option value="USD">USD - US Dollar</option>
                    <option value="EUR">EUR - Euro</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <Select
                    value={systemSettings.timezone}
                    onChange={(e) => setSystemSettings({ ...systemSettings, timezone: e.target.value })}
                  >
                    <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <Input
                    type="number"
                    value={systemSettings.session_timeout}
                    onChange={(e) => setSystemSettings({ ...systemSettings, session_timeout: e.target.value })}
                    placeholder="30"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => handleSave('System')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Security Settings */}
        {activeTab === 'security' && (
          <Card>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="p-3 bg-red-100 rounded-lg">
                  <Shield className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Security Settings</h2>
                  <p className="text-sm text-gray-600">Configure security and authentication</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Require Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600">Enhance security with 2FA for admin accounts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={securitySettings.require_2fa}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, require_2fa: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Session Duration (hours)
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.session_duration}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, session_duration: e.target.value })}
                      placeholder="24"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password Expiry (days)
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.password_expiry}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, password_expiry: e.target.value })}
                      placeholder="90"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Login Attempts
                    </label>
                    <Input
                      type="number"
                      value={securitySettings.max_login_attempts}
                      onChange={(e) => setSecuritySettings({ ...securitySettings, max_login_attempts: e.target.value })}
                      placeholder="5"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => handleSave('Security')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </Card>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <Card>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Bell className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Notification Settings</h2>
                  <p className="text-sm text-gray-600">Configure notification preferences</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Enable System Notifications</p>
                    <p className="text-sm text-gray-600">Receive notifications for system events</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_notifications}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enable_notifications: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Enable SMS Notifications</p>
                    <p className="text-sm text-gray-600">Send SMS for payment confirmations</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_sms}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enable_sms: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Enable Email Notifications</p>
                    <p className="text-sm text-gray-600">Send email for important events</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={systemSettings.enable_email}
                      onChange={(e) => setSystemSettings({ ...systemSettings, enable_email: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <button
                  onClick={() => handleSave('Notifications')}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
};

export default Settings;