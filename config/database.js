/**
 * Enhanced Database Configuration
 * Supports both MySQL and Supabase (PostgreSQL) with unified query interface
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Determine database type from environment
const DB_TYPE = process.env.DB_TYPE || 'supabase';

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
);

// MySQL connection pool (if using MySQL)
let mysqlPool = null;
if (DB_TYPE === 'mysql') {
    const mysql = require('mysql2/promise');
    mysqlPool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'wifi_billing',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

/**
 * Universal query function that works with both MySQL and Supabase
 */
const query = async (sql, params = []) => {
    if (DB_TYPE === 'mysql' && mysqlPool) {
        return mysqlPool.query(sql, params);
    }
    
    // Supabase query translation
    return translateAndExecuteSupabase(sql, params);
};

/**
 * Translate SQL to Supabase queries
 */
const translateAndExecuteSupabase = async (sql, params = []) => {
    const sqlLower = sql.toLowerCase().trim();
    
    try {
        // SELECT queries
        if (sqlLower.startsWith('select')) {
            return handleSelectQuery(sql, params);
        }
        
        // INSERT queries
        if (sqlLower.startsWith('insert')) {
            return handleInsertQuery(sql, params);
        }
        
        // UPDATE queries
        if (sqlLower.startsWith('update')) {
            return handleUpdateQuery(sql, params);
        }
        
        // DELETE queries
        if (sqlLower.startsWith('delete')) {
            return handleDeleteQuery(sql, params);
        }
        
        throw new Error(`Unsupported SQL query type: ${sql.substring(0, 50)}`);
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

/**
 * Handle SELECT queries
 */
const handleSelectQuery = async (sql, params) => {
    // Extract table name
    const tableMatch = sql.match(/from\s+([`"]?[\w_]+[`"]?)/i);
    if (!tableMatch) throw new Error('Could not extract table name from SELECT query');
    
    let tableName = tableMatch[1].replace(/[`"]/g, '');
    
    // Handle views by checking if it starts with v_
    const isView = tableName.startsWith('v_');
    
    // Build Supabase query
    let query = supabase.from(tableName).select('*');
    
    // Parse WHERE clause
    const whereMatch = sql.match(/where\s+(.+?)(?:\s+order|\s+group|\s+limit|\s*$)/i);
    if (whereMatch) {
        const whereClause = whereMatch[1];
        query = applyWhereClause(query, whereClause, params);
    }
    
    // Parse ORDER BY
    const orderMatch = sql.match(/order\s+by\s+([^\s]+)\s*(asc|desc)?/i);
    if (orderMatch) {
        const column = orderMatch[1].replace(/[`"]/g, '');
        const ascending = orderMatch[2]?.toLowerCase() !== 'desc';
        query = query.order(column, { ascending });
    }
    
    // Parse LIMIT
    const limitMatch = sql.match(/limit\s+(\d+)/i);
    if (limitMatch) {
        query = query.limit(parseInt(limitMatch[1]));
    }
    
    // Parse OFFSET
    const offsetMatch = sql.match(/offset\s+(\d+)/i);
    if (offsetMatch) {
        const offset = parseInt(offsetMatch[1]);
        const limit = limitMatch ? parseInt(limitMatch[1]) : 1000;
        query = query.range(offset, offset + limit - 1);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return [data || [], { affectedRows: data?.length || 0 }];
};

/**
 * Handle INSERT queries
 */
const handleInsertQuery = async (sql, params) => {
    const tableMatch = sql.match(/insert\s+into\s+([`"]?[\w_]+[`"]?)/i);
    if (!tableMatch) throw new Error('Could not extract table name from INSERT query');
    
    const tableName = tableMatch[1].replace(/[`"]/g, '');
    
    // Extract column names
    const columnsMatch = sql.match(/\(([^)]+)\)\s*values/i);
    if (!columnsMatch) throw new Error('Could not extract columns from INSERT query');
    
    const columns = columnsMatch[1].split(',').map(c => c.trim().replace(/[`"]/g, ''));
    
    // Build insert object
    const insertData = {};
    columns.forEach((col, i) => {
        if (params[i] !== undefined) {
            insertData[col] = params[i];
        }
    });
    
    const { data, error } = await supabase
        .from(tableName)
        .insert(insertData)
        .select();
    
    if (error) throw error;
    
    return [data || [], { insertId: data?.[0]?.id, affectedRows: data?.length || 0 }];
};

/**
 * Handle UPDATE queries
 */
const handleUpdateQuery = async (sql, params) => {
    const tableMatch = sql.match(/update\s+([`"]?[\w_]+[`"]?)/i);
    if (!tableMatch) throw new Error('Could not extract table name from UPDATE query');
    
    const tableName = tableMatch[1].replace(/[`"]/g, '');
    
    // Extract SET clause
    const setMatch = sql.match(/set\s+(.+?)\s+where/i);
    if (!setMatch) throw new Error('Could not extract SET clause from UPDATE query');
    
    const setParts = setMatch[1].split(',');
    const updateData = {};
    let paramIndex = 0;
    
    setParts.forEach(part => {
        const [col] = part.split('=').map(s => s.trim().replace(/[`"]/g, ''));
        if (params[paramIndex] !== undefined) {
            updateData[col] = params[paramIndex];
            paramIndex++;
        }
    });
    
    // Start building query
    let query = supabase.from(tableName).update(updateData);
    
    // Parse WHERE clause
    const whereMatch = sql.match(/where\s+(.+?)$/i);
    if (whereMatch) {
        query = applyWhereClause(query, whereMatch[1], params.slice(paramIndex));
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    
    return [data || [], { affectedRows: data?.length || 0 }];
};

/**
 * Handle DELETE queries
 */
const handleDeleteQuery = async (sql, params) => {
    const tableMatch = sql.match(/delete\s+from\s+([`"]?[\w_]+[`"]?)/i);
    if (!tableMatch) throw new Error('Could not extract table name from DELETE query');
    
    const tableName = tableMatch[1].replace(/[`"]/g, '');
    
    let query = supabase.from(tableName).delete();
    
    // Parse WHERE clause
    const whereMatch = sql.match(/where\s+(.+?)$/i);
    if (whereMatch) {
        query = applyWhereClause(query, whereMatch[1], params);
    }
    
    const { data, error } = await query.select();
    if (error) throw error;
    
    return [data || [], { affectedRows: data?.length || 0 }];
};

/**
 * Apply WHERE clause to Supabase query
 */
const applyWhereClause = (query, whereClause, params) => {
    let paramIndex = 0;
    
    // Handle simple equality: column = ?
    const eqMatches = whereClause.matchAll(/([`"]?[\w_]+[`"]?)\s*=\s*\?/gi);
    for (const match of eqMatches) {
        const column = match[1].replace(/[`"]/g, '');
        if (params[paramIndex] !== undefined) {
            query = query.eq(column, params[paramIndex]);
            paramIndex++;
        }
    }
    
    // Handle LIKE: column LIKE ?
    const likeMatches = whereClause.matchAll(/([`"]?[\w_]+[`"]?)\s+like\s+\?/gi);
    for (const match of likeMatches) {
        const column = match[1].replace(/[`"]/g, '');
        if (params[paramIndex] !== undefined) {
            const value = params[paramIndex].replace(/%/g, '*');
            query = query.ilike(column, value);
            paramIndex++;
        }
    }
    
    // Handle IN: column IN (?)
    const inMatches = whereClause.matchAll(/([`"]?[\w_]+[`"]?)\s+in\s*\(\s*\?\s*\)/gi);
    for (const match of inMatches) {
        const column = match[1].replace(/[`"]/g, '');
        if (Array.isArray(params[paramIndex])) {
            query = query.in(column, params[paramIndex]);
            paramIndex++;
        }
    }
    
    return query;
};

/**
 * Test database connection
 */
const testConnection = async () => {
    try {
        if (DB_TYPE === 'mysql' && mysqlPool) {
            const [rows] = await mysqlPool.query('SELECT 1 as test');
            console.log('✅ MySQL connection successful');
            return true;
        } else {
            const { data, error } = await supabase.from('admins').select('count').limit(1);
            if (error) throw error;
            console.log('✅ Supabase connection successful');
            console.log('📡 Connected to:', process.env.SUPABASE_URL);
            return true;
        }
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        return false;
    }
};

// Test connection on startup
testConnection();

module.exports = { 
    query, 
    supabase, 
    mysqlPool, 
    testConnection,
    DB_TYPE 
};
