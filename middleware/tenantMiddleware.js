/**
 * Tenant Middleware
 * Identifies and validates tenant for each request
 * Attaches tenant context to request object
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Extract tenant identifier from request
 * Supports multiple tenant detection methods:
 * 1. Subdomain (preferred): campus-cafe.myqonnectwifi.tech
 * 2. Custom domain: wifi.client.com
 * 3. Header: X-Tenant-Code
 * 4. Query param: ?tenant=campus-cafe
 */
const extractTenantIdentifier = (req) => {
  // 1. Check header first (API requests)
  if (req.headers['x-tenant-code']) {
    return { type: 'code', value: req.headers['x-tenant-code'] };
  }
  
  // 2. Check custom domain header (for custom domains)
  if (req.headers['x-tenant-domain']) {
    return { type: 'domain', value: req.headers['x-tenant-domain'] };
  }
  
  // 3. Extract from hostname
  const hostname = req.hostname || req.get('host')?.split(':')[0];
  
  if (hostname) {
    // Check if it's a subdomain of main domain
    if (hostname.includes('.myqonnectwifi.tech')) {
      const subdomain = hostname.split('.')[0];
      
      // Main domain or www = super admin (no tenant)
      if (subdomain === 'myqonnectwifi' || subdomain === 'www') {
        return { type: 'super_admin', value: null };
      }
      
      // Subdomain = tenant
      return { type: 'code', value: subdomain };
    }
    
    // Check if it's a custom domain (not main domain, not localhost)
    if (!hostname.includes('localhost') && 
        !hostname.includes('127.0.0.1') && 
        !hostname.includes('myqonnectwifi.tech') &&
        !hostname.includes('vercel.app')) {
      return { type: 'domain', value: hostname };
    }
  }
  
  // 4. Check query parameter (fallback for testing)
  if (req.query.tenant) {
    return { type: 'code', value: req.query.tenant };
  }
  
  // 5. Check for JWT token (if user is already authenticated)
  if (req.user && req.user.tenant_code) {
    return { type: 'code', value: req.user.tenant_code };
  }
  
  // Default: assume localhost development
  return { type: 'development', value: null };
};

/**
 * Main tenant middleware
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    // Extract tenant identifier
    const identifier = extractTenantIdentifier(req);
    
    console.log('🔍 Tenant detection:', identifier);
    
    // Super admin routes - skip tenant validation
    if (identifier.type === 'super_admin') {
      req.isSuperAdmin = true;
      req.tenant = null;
      req.tenantId = null;
      return next();
    }
    
    // Development mode - use default tenant
    if (identifier.type === 'development') {
      console.log('⚠️  Development mode: Using default tenant');
      const { data: defaultTenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('tenant_code', 'qonnect-default')
        .single();
      
      if (error || !defaultTenant) {
        console.error('❌ Default tenant not found');
        return res.status(500).json({ 
          error: 'System configuration error',
          details: 'Default tenant not configured'
        });
      }
      
      req.tenant = defaultTenant;
      req.tenantId = defaultTenant.id;
      req.isSuperAdmin = false;
      return next();
    }
    
    // Look up tenant by code or domain
    let tenant;
    let error;
    
    if (identifier.type === 'code') {
      ({ data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('tenant_code', identifier.value)
        .single());
    } else if (identifier.type === 'domain') {
      ({ data: tenant, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('custom_domain', identifier.value)
        .single());
    }
    
    // Tenant not found
    if (error || !tenant) {
      console.error('❌ Tenant not found:', identifier);
      return res.status(404).json({ 
        error: 'Tenant not found',
        details: 'The requested tenant does not exist',
        identifier: identifier.value
      });
    }
    
    // Check tenant status
    if (tenant.status === 'suspended') {
      console.warn('⚠️  Tenant suspended:', tenant.tenant_code);
      return res.status(403).json({ 
        error: 'Account suspended',
        details: 'This account has been suspended. Please contact support.',
        support_email: 'support@myqonnectwifi.tech'
      });
    }
    
    if (tenant.status === 'expired') {
      console.warn('⚠️  Tenant subscription expired:', tenant.tenant_code);
      return res.status(403).json({ 
        error: 'Subscription expired',
        details: 'Your subscription has expired. Please renew to continue using the service.',
        subscription_end_date: tenant.subscription_end_date
      });
    }
    
    // Check subscription expiry
    if (tenant.subscription_end_date) {
      const expiryDate = new Date(tenant.subscription_end_date);
      const now = new Date();
      
      if (expiryDate < now) {
        console.warn('⚠️  Tenant subscription past due:', tenant.tenant_code);
        // Update status to expired
        await supabase
          .from('tenants')
          .update({ status: 'expired' })
          .eq('id', tenant.id);
        
        return res.status(403).json({ 
          error: 'Subscription expired',
          details: 'Your subscription expired on ' + expiryDate.toDateString(),
          expired_date: tenant.subscription_end_date
        });
      }
    }
    
    // Update last active timestamp (do this asynchronously to not block request)
    supabase
      .from('tenants')
      .update({ last_active: new Date().toISOString() })
      .eq('id', tenant.id)
      .then(() => console.log('✅ Updated tenant last_active'))
      .catch(err => console.error('Failed to update last_active:', err));
    
    // Attach tenant to request
    req.tenant = tenant;
    req.tenantId = tenant.id;
    req.isSuperAdmin = false;
    
    console.log('✅ Tenant resolved:', tenant.business_name, `(${tenant.tenant_code})`);
    
    next();
  } catch (error) {
    console.error('❌ Tenant middleware error:', error);
    res.status(500).json({ 
      error: 'Tenant resolution failed',
      details: error.message
    });
  }
};

/**
 * Middleware to require super admin access
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (req.user.role !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Access denied',
      details: 'Super admin access required'
    });
  }
  
  next();
};

/**
 * Middleware to require tenant admin access
 */
const requireTenantAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Super admin can access any tenant
  if (req.user.role === 'super_admin') {
    return next();
  }
  
  // Tenant admin must match current tenant
  if (req.user.role === 'tenant_admin' && req.user.tenant_id === req.tenantId) {
    return next();
  }
  
  res.status(403).json({ 
    error: 'Access denied',
    details: 'Tenant admin access required'
  });
};

/**
 * Middleware to check tenant limits
 */
const checkTenantLimits = (limitType) => {
  return async (req, res, next) => {
    try {
      if (!req.tenant) {
        return next(); // Skip for super admin
      }
      
      const tenant = req.tenant;
      let currentCount = 0;
      let maxLimit = 0;
      
      switch (limitType) {
        case 'devices':
          const { count: deviceCount } = await supabase
            .from('devices')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', req.tenantId);
          currentCount = deviceCount || 0;
          maxLimit = tenant.max_devices;
          break;
          
        case 'admins':
          const { count: adminCount } = await supabase
            .from('admins')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', req.tenantId);
          currentCount = adminCount || 0;
          maxLimit = tenant.max_admins;
          break;
          
        case 'customers':
          const { count: customerCount } = await supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', req.tenantId);
          currentCount = customerCount || 0;
          maxLimit = tenant.max_customers;
          break;
          
        case 'routers':
          const { count: routerCount } = await supabase
            .from('tenant_routers')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', req.tenantId);
          currentCount = routerCount || 0;
          maxLimit = tenant.max_routers;
          break;
          
        default:
          return next();
      }
      
      if (currentCount >= maxLimit) {
        return res.status(403).json({ 
          error: 'Limit reached',
          details: `Maximum ${limitType} limit reached (${maxLimit})`,
          current: currentCount,
          max: maxLimit,
          upgrade_message: 'Please upgrade your subscription to increase limits'
        });
      }
      
      next();
    } catch (error) {
      console.error('Error checking tenant limits:', error);
      next(); // Don't block request on error
    }
  };
};

module.exports = {
  tenantMiddleware,
  requireSuperAdmin,
  requireTenantAdmin,
  checkTenantLimits,
  extractTenantIdentifier
};
