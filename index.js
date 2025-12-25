const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

// Import routes
const mpesaRoutes = require("./routes/mpesaRoutes");
const mpesaCallback = require("./routes/mpesaCallback");
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const getMacRoute = require("./routes/getMac");
const networkRoutes = require("./routes/networkRoutes");
const routerRoutes = require('./routes/routerRoutes');

// Enhanced admin dashboard routes
const advancedAuthRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const devicesRoutes = require("./routes/devicesRoutes");
const paymentsRoutes = require("./routes/paymentsRoutes");
const customersRoutes = require("./routes/customersRoutes");
const packagesRoutes = require("./routes/packagesRoutes");
const vouchersRoutes = require("./routes/vouchersRoutes");
const sessionsRoutes = require("./routes/sessionsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const auditLogsRoutes = require("./routes/auditLogsRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");

const app = express();

// Configure CORS for both development and production
const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://drew-billing.vercel.app',
    'https://drewbilling.vercel.app',
    /\.vercel\.app$/  // Allow all Vercel preview deployments
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is in allowed list or matches pattern
        const isAllowed = allowedOrigins.some(allowed => {
            if (allowed instanceof RegExp) {
                return allowed.test(origin);
            }
            return allowed === origin;
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(null, true); // Allow all for now, restrict later
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

// Middleware
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle OPTIONS preflight requests
app.options("*", cors());

// API Routes
app.use("/api/admin", adminRoutes);
app.use("/api/mac", getMacRoute);
app.use("/api/network", networkRoutes);
app.use('/api/router', routerRoutes);
app.use("/api/mpesa", mpesaRoutes);
app.use("/api/payment", mpesaCallback); // Mount at /api/payment, routes define /callback
app.use("/api/auth", authRoutes);

// Enhanced admin dashboard routes
app.use("/api/v2/auth", advancedAuthRoutes);
app.use("/api/v2/dashboard", dashboardRoutes);
app.use("/api/admin/devices", devicesRoutes);
app.use("/api/admin/payments", paymentsRoutes);
app.use("/api/admin/customers", customersRoutes);
app.use("/api/admin/packages", packagesRoutes);
app.use("/api/admin/vouchers", vouchersRoutes);
app.use("/api/admin/sessions", sessionsRoutes);
app.use("/api/admin/analytics", analyticsRoutes);
app.use("/api/admin/audit-logs", auditLogsRoutes);
app.use("/api/admin/settings", settingsRoutes);
app.use("/api/admin/notifications", notificationsRoutes);

// API Health Check
app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Development CORS test route
app.get("/api/test-cors", (req, res) => {
    res.json({ message: "CORS is working!" });
});

// Root route - API info
app.get('/', (req, res) => {
    res.json({
        name: 'DrewBilling WiFi API',
        version: '1.0.0',
        status: 'running',
        endpoints: {
            health: '/api/health',
            auth: '/api/v2/auth',
            dashboard: '/api/v2/dashboard',
            payments: '/api/admin/payments',
            devices: '/api/admin/devices',
            customers: '/api/admin/customers',
            packages: '/api/admin/packages',
            vouchers: '/api/admin/vouchers',
            sessions: '/api/admin/sessions',
            analytics: '/api/admin/analytics',
            settings: '/api/admin/settings'
        },
        documentation: 'See /api/health for status'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
});

// Export for Vercel serverless
module.exports = app;

// Start Server (only in non-Vercel environment)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`🌐 CORS origin: http://localhost:5173`);
        console.log(`🔗 Backend API: http://localhost:${PORT}`);
    });
}
  
