const jwt = require('jsonwebtoken');
const db = require('../config/db');

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
        
        // Check if admin exists and is active
        const [admins] = await db.query(
            'SELECT id, username, email, role, is_active FROM admins WHERE id = ? AND is_active = TRUE',
            [decoded.id]
        );

        if (admins.length === 0) {
            return res.status(401).json({ error: 'Invalid token or user not active' });
        }

        req.admin = admins[0];
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

                db.query(
                    `INSERT INTO audit_logs (admin_id, action, table_affected, record_id, details, ip_address, user_agent) 
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        req.admin?.id,
                        action,
                        table,
                        req.params.id || null,
                        JSON.stringify(details),
                        req.ip || req.connection.remoteAddress,
                        req.get('user-agent')
                    ]
                ).catch(err => console.error('Audit log error:', err));
            }

            originalSend.call(this, data);
        };

        next();
    };
};

module.exports = { authMiddleware, roleMiddleware, auditMiddleware };
