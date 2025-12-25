const jwt = require('jsonwebtoken');
const { supabase } = require('../config/db');

// Middleware to verify JWT token
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        if (!token || token === 'null' || token === 'undefined') {
            return res.status(401).json({ error: 'Invalid token format' });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Check if admin exists and is active using Supabase
        const { data: admins, error } = await supabase
            .from('admins')
            .select('id, username, email, role, is_active')
            .eq('id', decoded.id)
            .eq('is_active', true);

        if (error) {
            console.error('Database error in auth:', error);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!admins || admins.length === 0) {
            return res.status(401).json({ error: 'Invalid token or user not active' });
        }

        // Set both req.admin and req.user for compatibility
        req.admin = admins[0];
        req.user = admins[0];
        next();
    } catch (error) {
        // Don't log expected auth errors in production
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

// Middleware to check role permissions
const roleMiddleware = (allowedRoles = []) => {
    return (req, res, next) => {
        if (!req.admin) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (allowedRoles.length > 0 && !allowedRoles.includes(req.admin.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
};

// Middleware to log admin actions
const auditMiddleware = (action, table) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;
        
        res.send = function(data) {
            // Log the action after response
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const details = {
                    method: req.method,
                    path: req.path,
                    body: req.body,
                    params: req.params,
                    query: req.query
                };

                // Use Supabase for audit logging
                supabase.from('audit_logs').insert({
                    admin_id: req.admin?.id || req.user?.id,
                    action: action,
                    table_affected: table,
                    record_id: req.params.id || null,
                    details: JSON.stringify(details),
                    ip_address: req.ip || req.connection?.remoteAddress,
                    user_agent: req.get('user-agent')
                }).then(() => {}).catch(err => console.error('Audit log error:', err));
            }

            originalSend.call(this, data);
        };

        next();
    };
};

module.exports = { authMiddleware, roleMiddleware, auditMiddleware };
