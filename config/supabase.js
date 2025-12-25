const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase connection
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Test connection
const testConnection = async () => {
    try {
        const { data, error } = await supabase.from('payments').select('count');
        if (error && error.code !== 'PGRST116') { // Ignore "table not found" on first run
            throw error;
        }
        console.log('✅ Supabase connection successful');
        console.log('Connected to:', supabaseUrl);
    } catch (error) {
        console.error('❌ Supabase connection failed:', error.message);
    }
};

testConnection();

module.exports = supabase;
