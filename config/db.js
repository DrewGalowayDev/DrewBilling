const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Test database connection
const testConnection = async () => {
    try {
        const { data, error } = await supabase.from('system_settings').select('count').limit(1);
        if (error) throw error;
        console.log('✅ Supabase connection successful');
        console.log('Connected to:', process.env.SUPABASE_URL);
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
    }
};

testConnection();

// Helper function to convert MySQL query to Supabase
const query = async (sql, params = []) => {
    // This is a compatibility wrapper for existing MySQL queries
    // Extract table name and operation from SQL
    const insertMatch = sql.match(/INSERT INTO (\w+) \((.*?)\) VALUES \((.*?)\)/i);
    const updateMatch = sql.match(/UPDATE (\w+) SET (.*?) WHERE (.*)/i);
    const selectMatch = sql.match(/SELECT (.*?) FROM (\w+)(?: WHERE (.*?))?/i);
    
    try {
        if (insertMatch) {
            const table = insertMatch[1];
            const columns = insertMatch[2].split(',').map(c => c.trim());
            const values = params;
            
            const data = {};
            columns.forEach((col, i) => {
                data[col] = values[i];
            });
            
            const { data: result, error } = await supabase.from(table).insert(data).select();
            if (error) throw error;
            return [result];
            
        } else if (updateMatch) {
            const table = updateMatch[1];
            const setParts = updateMatch[2];
            const wherePart = updateMatch[3];
            
            // Parse SET clause
            const updates = {};
            const setFields = setParts.split(',');
            let paramIndex = 0;
            setFields.forEach(field => {
                const [key] = field.split('=').map(s => s.trim());
                updates[key] = params[paramIndex++];
            });
            
            // Parse WHERE clause (simplified for transaction_id)
            const whereMatch = wherePart.match(/transaction_id\s*=\s*\?/i);
            if (whereMatch) {
                const transactionId = params[params.length - 1];
                const { data, error } = await supabase
                    .from(table)
                    .update(updates)
                    .eq('transaction_id', transactionId)
                    .select();
                if (error) throw error;
                return [data];
            }
            
        } else if (selectMatch) {
            const table = selectMatch[2];
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) throw error;
            return [data];
        }
        
        throw new Error('Unsupported SQL query');
    } catch (error) {
        console.error('Query error:', error);
        throw error;
    }
};

module.exports = { query, supabase };
