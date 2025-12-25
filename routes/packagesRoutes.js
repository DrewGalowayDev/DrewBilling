const express = require('express');
const router = express.Router();
const { supabase } = require('../config/db');
const { authMiddleware, roleMiddleware } = require('../middleware/advancedAuth');

// Packages Routes - Updated Dec 26, 2025
// Color gradient options for the admin UI
const COLOR_GRADIENTS = [
    { value: 'from-yellow-500 to-orange-600', label: 'Yellow → Orange', preview: '#eab308 → #ea580c' },
    { value: 'from-green-500 to-emerald-600', label: 'Green → Emerald', preview: '#22c55e → #059669' },
    { value: 'from-blue-500 to-cyan-600', label: 'Blue → Cyan', preview: '#3b82f6 → #0891b2' },
    { value: 'from-pink-500 to-orange-600', label: 'Pink → Orange', preview: '#ec4899 → #ea580c' },
    { value: 'from-purple-500 to-indigo-600', label: 'Purple → Indigo', preview: '#a855f7 → #4f46e5' },
    { value: 'from-gray-700 to-gray-900', label: 'Dark Gray', preview: '#374151 → #111827' },
    { value: 'from-purple-500 to-pink-600', label: 'Purple → Pink', preview: '#a855f7 → #db2777' },
    { value: 'from-yellow-500 to-green-600', label: 'Yellow → Green', preview: '#eab308 → #16a34a' },
    { value: 'from-red-500 to-purple-600', label: 'Red → Purple', preview: '#ef4444 → #9333ea' },
    { value: 'from-teal-500 to-cyan-600', label: 'Teal → Cyan', preview: '#14b8a6 → #0891b2' },
    { value: 'from-orange-500 to-red-600', label: 'Orange → Red', preview: '#f97316 → #dc2626' },
    { value: 'from-indigo-500 to-purple-600', label: 'Indigo → Purple', preview: '#6366f1 → #9333ea' },
    { value: 'from-rose-500 to-pink-600', label: 'Rose → Pink', preview: '#f43f5e → #db2777' },
    { value: 'from-amber-500 to-yellow-600', label: 'Amber → Yellow', preview: '#f59e0b → #ca8a04' },
    { value: 'from-lime-500 to-green-600', label: 'Lime → Green', preview: '#84cc16 → #16a34a' },
    { value: 'from-sky-500 to-blue-600', label: 'Sky → Blue', preview: '#0ea5e9 → #2563eb' },
];

// Duration label options
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

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

// GET public packages for user portal
router.get('/public', async (req, res) => {
    try {
        const { data: packages, error } = await supabase
            .from('packages')
            .select('id, name, amount, duration, duration_minutes, speed_limit, description, color_gradient, duration_label, display_order')
            .eq('status', 'active')
            .order('display_order', { ascending: true });

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch packages' 
            });
        }

        // Transform to match frontend expected format
        const formattedPackages = packages.map(pkg => ({
            id: pkg.id,
            label: pkg.name,
            value: parseFloat(pkg.amount),
            price: `Ksh ${pkg.amount}`,
            duration: pkg.duration_label || 'Standard',
            speed: pkg.speed_limit ? `${pkg.speed_limit.replace('M', '')} Mbps` : '5 Mbps',
            color: pkg.color_gradient || 'from-blue-500 to-indigo-600',
            durationMinutes: pkg.duration_minutes,
            description: pkg.description
        }));

        res.json({ 
            success: true, 
            packages: formattedPackages 
        });
    } catch (error) {
        console.error('Error fetching public packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch packages',
            error: error.message 
        });
    }
});

// GET color gradient options
router.get('/color-options', (req, res) => {
    res.json({
        success: true,
        colorGradients: COLOR_GRADIENTS,
        durationLabels: DURATION_LABELS
    });
});

// POST initialize default packages (public - for initial setup)
router.post('/initialize', async (req, res) => {
    try {
        // Check if packages already exist
        const { data: existingPackages, error: checkError } = await supabase
            .from('packages')
            .select('id')
            .limit(1);

        if (checkError) throw checkError;

        if (existingPackages && existingPackages.length > 0) {
            return res.json({
                success: true,
                message: 'Packages already exist',
                initialized: false
            });
        }

        // Default packages to initialize
        const defaultPackages = [
            { name: '30 Minutes', amount: 1, duration: '30m', duration_minutes: 30, speed_limit: '2M', description: 'Quick browsing session', status: 'active', color_gradient: 'from-yellow-500 to-orange-600', duration_label: 'Quick Access', display_order: 1 },
            { name: '1 Hour', amount: 10, duration: '1h', duration_minutes: 60, speed_limit: '2M', description: 'One hour internet access', status: 'active', color_gradient: 'from-yellow-500 to-orange-600', duration_label: 'Quick Access', display_order: 2 },
            { name: '3 Hours', amount: 15, duration: '3h', duration_minutes: 180, speed_limit: '3M', description: 'Three hours browsing', status: 'active', color_gradient: 'from-green-500 to-emerald-600', duration_label: 'Short Session', display_order: 3 },
            { name: '6 Hours', amount: 20, duration: '6h', duration_minutes: 360, speed_limit: '4M', description: 'Half day package', status: 'active', color_gradient: 'from-blue-500 to-cyan-600', duration_label: 'Half Day', display_order: 4 },
            { name: '12 Hours', amount: 25, duration: '12h', duration_minutes: 720, speed_limit: '5M', description: 'Extended access', status: 'active', color_gradient: 'from-pink-500 to-orange-600', duration_label: 'Extended', display_order: 5 },
            { name: '24 Hours', amount: 30, duration: '24h', duration_minutes: 1440, speed_limit: '5M', description: 'Full day unlimited', status: 'active', color_gradient: 'from-purple-500 to-indigo-600', duration_label: 'Full Day', display_order: 6 },
            { name: '2 Days', amount: 50, duration: '2d', duration_minutes: 2880, speed_limit: '6M', description: 'Weekend package', status: 'active', color_gradient: 'from-gray-700 to-gray-900', duration_label: 'Weekend', display_order: 7 },
            { name: '3 Days', amount: 80, duration: '3d', duration_minutes: 4320, speed_limit: '6M', description: 'Extended weekend', status: 'active', color_gradient: 'from-purple-500 to-pink-600', duration_label: 'Extended', display_order: 8 },
            { name: '1 Week', amount: 200, duration: '7d', duration_minutes: 10080, speed_limit: '6M', description: 'Weekly package', status: 'active', color_gradient: 'from-yellow-500 to-green-600', duration_label: 'Weekly', display_order: 9 },
            { name: '2 Weeks', amount: 300, duration: '14d', duration_minutes: 20160, speed_limit: '10M', description: 'Bi-weekly access', status: 'active', color_gradient: 'from-red-500 to-purple-600', duration_label: 'Extended', display_order: 10 },
            { name: '1 Month', amount: 500, duration: '30d', duration_minutes: 43200, speed_limit: '10M', description: 'Monthly unlimited', status: 'active', color_gradient: 'from-teal-500 to-cyan-600', duration_label: 'Monthly', display_order: 11 }
        ];

        const { data: insertedPackages, error: insertError } = await supabase
            .from('packages')
            .insert(defaultPackages)
            .select();

        if (insertError) throw insertError;

        res.json({
            success: true,
            message: 'Default packages initialized successfully',
            initialized: true,
            packages: insertedPackages
        });
    } catch (error) {
        console.error('Error initializing packages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to initialize packages',
            error: error.message
        });
    }
});

// GET public stats (no auth needed)
router.get('/public-stats', async (req, res) => {
    try {
        const { data: packages, error } = await supabase
            .from('packages')
            .select('status');

        if (error) throw error;

        const total = packages?.length || 0;
        const active = packages?.filter(p => p.status === 'active').length || 0;

        res.json({
            success: true,
            total,
            active
        });
    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

// ============================================
// PROTECTED ROUTES (Authentication Required)
// ============================================

// Apply auth middleware to routes below
router.use(authMiddleware);

// GET all packages (admin)
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        
        let query = supabase
            .from('packages')
            .select('*')
            .order('display_order', { ascending: true });
        
        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: packages, error } = await query;

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to fetch packages' 
            });
        }

        res.json({ 
            success: true, 
            packages: packages || [],
            colorGradients: COLOR_GRADIENTS,
            durationLabels: DURATION_LABELS
        });
    } catch (error) {
        console.error('Error fetching packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch packages',
            error: error.message 
        });
    }
});

// GET package statistics
router.get('/stats', async (req, res) => {
    try {
        // Get package counts
        const { data: packages, error: pkgError } = await supabase
            .from('packages')
            .select('status');

        if (pkgError) throw pkgError;

        const total = packages?.length || 0;
        const active = packages?.filter(p => p.status === 'active').length || 0;
        const inactive = packages?.filter(p => p.status === 'inactive').length || 0;

        // Get payment stats for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: payments, error: payError } = await supabase
            .from('payments')
            .select('amount, status')
            .eq('status', 'confirmed')
            .gte('created_at', thirtyDaysAgo.toISOString());

        const purchasesThisMonth = payments?.length || 0;
        const revenueThisMonth = payments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

        res.json({
            success: true,
            total,
            active,
            inactive,
            purchasesThisMonth,
            revenueThisMonth
        });
    } catch (error) {
        console.error('Error fetching package stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch statistics',
            error: error.message 
        });
    }
});

// GET single package details
router.get('/:id', async (req, res) => {
    try {
        const { data: pkg, error } = await supabase
            .from('packages')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !pkg) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }

        // Get purchase statistics for this package
        const { data: payments } = await supabase
            .from('payments')
            .select('status, amount')
            .eq('amount', pkg.amount);

        const totalPurchases = payments?.length || 0;
        const confirmedPurchases = payments?.filter(p => p.status === 'confirmed').length || 0;
        const totalRevenue = payments?.filter(p => p.status === 'confirmed')
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0;

        const packageData = {
            ...pkg,
            total_purchases: totalPurchases,
            confirmed_purchases: confirmedPurchases,
            total_revenue: totalRevenue
        };

        res.json({ 
            success: true, 
            package: packageData,
            colorGradients: COLOR_GRADIENTS,
            durationLabels: DURATION_LABELS
        });
    } catch (error) {
        console.error('Error fetching package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch package details',
            error: error.message 
        });
    }
});

// POST create new package
router.post('/', roleMiddleware(['admin', 'super_admin', 'tenant_admin']), async (req, res) => {
    try {
        const { 
            name, amount, duration, duration_minutes, speed_limit, 
            description, status, color_gradient, duration_label, display_order 
        } = req.body;
        
        // Validation
        if (!name || !amount || !duration || !duration_minutes || !speed_limit) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: name, amount, duration, duration_minutes, speed_limit' 
            });
        }

        // Check if package with same amount already exists
        const { data: existing } = await supabase
            .from('packages')
            .select('id')
            .eq('amount', amount);

        if (existing && existing.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Package with this amount already exists' 
            });
        }

        // Get max display_order
        const { data: maxOrder } = await supabase
            .from('packages')
            .select('display_order')
            .order('display_order', { ascending: false })
            .limit(1);

        const newDisplayOrder = display_order || ((maxOrder?.[0]?.display_order || 0) + 1);

        const { data: newPkg, error } = await supabase
            .from('packages')
            .insert({
                name,
                amount,
                duration,
                duration_minutes,
                speed_limit,
                description: description || null,
                status: status || 'active',
                color_gradient: color_gradient || 'from-blue-500 to-indigo-600',
                duration_label: duration_label || 'Standard',
                display_order: newDisplayOrder,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to create package' 
            });
        }

        // Log audit
        await supabase.from('audit_logs').insert({
            admin_id: req.user.id,
            action: 'create_package',
            entity_type: 'package',
            entity_id: newPkg.id,
            details: `Created package: ${name} - Ksh ${amount}`,
            ip_address: req.ip || req.connection?.remoteAddress
        });
        
        res.json({ 
            success: true, 
            message: 'Package created successfully',
            package: newPkg
        });
    } catch (error) {
        console.error('Error creating package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create package',
            error: error.message 
        });
    }
});

// PUT update package
router.put('/:id', roleMiddleware(['admin', 'super_admin', 'tenant_admin']), async (req, res) => {
    try {
        const { 
            name, amount, duration, duration_minutes, speed_limit, 
            description, status, color_gradient, duration_label, display_order 
        } = req.body;
        
        // Check if package exists
        const { data: existing, error: fetchError } = await supabase
            .from('packages')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }

        const { data: updated, error } = await supabase
            .from('packages')
            .update({
                name,
                amount,
                duration,
                duration_minutes,
                speed_limit,
                description,
                status,
                color_gradient: color_gradient || existing.color_gradient,
                duration_label: duration_label || existing.duration_label,
                display_order: display_order || existing.display_order,
                updated_at: new Date().toISOString()
            })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to update package' 
            });
        }

        // Log audit
        await supabase.from('audit_logs').insert({
            admin_id: req.user.id,
            action: 'update_package',
            entity_type: 'package',
            entity_id: req.params.id,
            details: `Updated package: ${name}`,
            ip_address: req.ip || req.connection?.remoteAddress
        });

        res.json({ 
            success: true, 
            message: 'Package updated successfully',
            package: updated
        });
    } catch (error) {
        console.error('Error updating package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to update package',
            error: error.message 
        });
    }
});

// DELETE package
router.delete('/:id', roleMiddleware(['super_admin', 'admin', 'tenant_admin']), async (req, res) => {
    try {
        // Check if package exists
        const { data: existing } = await supabase
            .from('packages')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (!existing) {
            return res.status(404).json({ 
                success: false, 
                message: 'Package not found' 
            });
        }

        const { error } = await supabase
            .from('packages')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            console.error('Database error:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to delete package' 
            });
        }

        // Log audit
        await supabase.from('audit_logs').insert({
            admin_id: req.user.id,
            action: 'delete_package',
            entity_type: 'package',
            entity_id: req.params.id,
            details: `Deleted package: ${existing.name}`,
            ip_address: req.ip || req.connection?.remoteAddress
        });

        res.json({ 
            success: true, 
            message: 'Package deleted successfully' 
        });
    } catch (error) {
        console.error('Error deleting package:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to delete package',
            error: error.message 
        });
    }
});

// POST initialize default packages
router.post('/initialize', roleMiddleware(['super_admin', 'admin']), async (req, res) => {
    try {
        const defaultPackages = [
            { name: '30 Minutes', amount: 1, duration: '30m', duration_minutes: 30, speed_limit: '2M', description: 'Quick browsing package', color_gradient: 'from-yellow-500 to-orange-600', duration_label: 'Quick Access', display_order: 1 },
            { name: '1 Hour', amount: 10, duration: '1h', duration_minutes: 60, speed_limit: '2M', description: 'Standard hourly package', color_gradient: 'from-yellow-500 to-orange-600', duration_label: 'Quick Access', display_order: 2 },
            { name: '3 Hours', amount: 15, duration: '3h', duration_minutes: 180, speed_limit: '3M', description: 'Extended browsing', color_gradient: 'from-green-500 to-emerald-600', duration_label: 'Short Session', display_order: 3 },
            { name: '6 Hours', amount: 20, duration: '6h', duration_minutes: 360, speed_limit: '4M', description: 'Half day package', color_gradient: 'from-blue-500 to-cyan-600', duration_label: 'Half Day', display_order: 4 },
            { name: '12 Hours', amount: 25, duration: '12h', duration_minutes: 720, speed_limit: '5M', description: 'Half day with higher speed', color_gradient: 'from-pink-500 to-orange-600', duration_label: 'Quick Access', display_order: 5 },
            { name: '24 Hours', amount: 30, duration: '24h', duration_minutes: 1440, speed_limit: '5M', description: 'Full day package', color_gradient: 'from-purple-500 to-indigo-600', duration_label: 'Full Day', display_order: 6 },
            { name: '2 Days', amount: 50, duration: '48h', duration_minutes: 2880, speed_limit: '6M', description: 'Two day package', color_gradient: 'from-gray-700 to-gray-900', duration_label: 'Quick Access', display_order: 7 },
            { name: '3 Days', amount: 80, duration: '72h', duration_minutes: 4320, speed_limit: '6M', description: 'Three day package', color_gradient: 'from-purple-500 to-pink-600', duration_label: 'Quick Access', display_order: 8 },
            { name: '1 Week', amount: 200, duration: '168h', duration_minutes: 10080, speed_limit: '6M', description: 'Weekly package', color_gradient: 'from-yellow-500 to-green-600', duration_label: 'Quick Access', display_order: 9 },
            { name: '2 Weeks', amount: 300, duration: '336h', duration_minutes: 20160, speed_limit: '10M', description: 'Bi-weekly package', color_gradient: 'from-red-500 to-purple-600', duration_label: 'Quick Access', display_order: 10 },
            { name: '1 Month', amount: 500, duration: '720h', duration_minutes: 43200, speed_limit: '10M', description: 'Monthly unlimited', color_gradient: 'from-teal-500 to-cyan-600', duration_label: 'Quick Access', display_order: 11 }
        ];
        
        let inserted = 0;
        for (const pkg of defaultPackages) {
            // Check if package with same amount exists
            const { data: existing } = await supabase
                .from('packages')
                .select('id')
                .eq('amount', pkg.amount);

            if (!existing || existing.length === 0) {
                const { error } = await supabase
                    .from('packages')
                    .insert({
                        ...pkg,
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (!error) {
                    inserted++;
                }
            }
        }
        
        res.json({ 
            success: true, 
            message: `Initialized ${inserted} default packages` 
        });
    } catch (error) {
        console.error('Error initializing packages:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to initialize packages',
            error: error.message 
        });
    }
});

// PUT update display order (bulk)
router.put('/reorder/bulk', roleMiddleware(['admin', 'super_admin', 'tenant_admin']), async (req, res) => {
    try {
        const { packages } = req.body;

        if (!packages || !Array.isArray(packages)) {
            return res.status(400).json({
                success: false,
                message: 'packages array is required'
            });
        }

        for (const pkg of packages) {
            await supabase
                .from('packages')
                .update({ display_order: pkg.display_order })
                .eq('id', pkg.id);
        }

        res.json({
            success: true,
            message: 'Package order updated successfully'
        });
    } catch (error) {
        console.error('Error reordering packages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reorder packages',
            error: error.message
        });
    }
});

module.exports = router;
