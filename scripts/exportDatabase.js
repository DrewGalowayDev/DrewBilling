/**
 * Complete Database Export Script
 * Exports full MySQL database structure and data for Supabase migration
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration (update with your credentials)
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '', // Add your MySQL password if needed
    database: 'wifi_billing',
    port: 3306
};

async function exportDatabase() {
    let connection;
    
    try {
        console.log('🔌 Connecting to MySQL database...');
        connection = await mysql.createConnection(DB_CONFIG);
        console.log('✅ Connected successfully!\n');

        const exportLines = [];
        exportLines.push('-- ===============================================');
        exportLines.push('-- COMPLETE MYSQL DATABASE EXPORT');
        exportLines.push('-- Database: wifi_billing');
        exportLines.push(`-- Exported: ${new Date().toISOString()}`);
        exportLines.push('-- ===============================================\n');
        exportLines.push('-- This export includes:');
        exportLines.push('-- 1. All table structures (CREATE TABLE statements)');
        exportLines.push('-- 2. All data (INSERT statements)');
        exportLines.push('-- 3. All views');
        exportLines.push('-- 4. All stored procedures');
        exportLines.push('-- 5. All indexes and constraints');
        exportLines.push('-- ===============================================\n');

        // Get all tables
        console.log('📋 Fetching table list...');
        const [tables] = await connection.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'",
            [DB_CONFIG.database]
        );
        
        console.log(`Found ${tables.length} tables:\n`);
        tables.forEach((table, i) => {
            console.log(`   ${i + 1}. ${table.TABLE_NAME}`);
        });
        console.log('');

        // Export each table
        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            console.log(`📦 Exporting table: ${tableName}`);
            
            exportLines.push(`\n-- ===============================================`);
            exportLines.push(`-- TABLE: ${tableName}`);
            exportLines.push(`-- ===============================================\n`);

            // Get CREATE TABLE statement
            const [createTable] = await connection.query(`SHOW CREATE TABLE \`${tableName}\``);
            exportLines.push(`DROP TABLE IF EXISTS \`${tableName}\`;\n`);
            exportLines.push(createTable[0]['Create Table'] + ';\n');

            // Get table data
            const [rows] = await connection.query(`SELECT * FROM \`${tableName}\``);
            
            if (rows.length > 0) {
                console.log(`   ✓ ${rows.length} rows found`);
                
                // Get column names
                const columns = Object.keys(rows[0]);
                const columnList = columns.map(col => `\`${col}\``).join(', ');
                
                exportLines.push(`-- Data for table ${tableName}`);
                exportLines.push(`INSERT INTO \`${tableName}\` (${columnList}) VALUES`);
                
                const values = rows.map((row, index) => {
                    const rowValues = columns.map(col => {
                        const value = row[col];
                        if (value === null) return 'NULL';
                        if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                        if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        if (typeof value === 'boolean') return value ? '1' : '0';
                        return value;
                    }).join(', ');
                    
                    const ending = index === rows.length - 1 ? ';' : ',';
                    return `(${rowValues})${ending}`;
                }).join('\n');
                
                exportLines.push(values);
                exportLines.push('');
            } else {
                console.log(`   ℹ No data in table`);
                exportLines.push(`-- No data in table ${tableName}\n`);
            }
        }

        // Export views
        console.log('\n📊 Exporting views...');
        const [views] = await connection.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ?",
            [DB_CONFIG.database]
        );
        
        if (views.length > 0) {
            console.log(`Found ${views.length} views:\n`);
            views.forEach((view, i) => {
                console.log(`   ${i + 1}. ${view.TABLE_NAME}`);
            });
            
            exportLines.push(`\n-- ===============================================`);
            exportLines.push(`-- VIEWS`);
            exportLines.push(`-- ===============================================\n`);
            
            for (const view of views) {
                const viewName = view.TABLE_NAME;
                const [createView] = await connection.query(`SHOW CREATE VIEW \`${viewName}\``);
                exportLines.push(`DROP VIEW IF EXISTS \`${viewName}\`;\n`);
                exportLines.push(createView[0]['Create View'] + ';\n');
            }
        } else {
            console.log('No views found');
        }

        // Export stored procedures
        console.log('\n⚙️ Exporting stored procedures...');
        const [procedures] = await connection.query(
            "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE'",
            [DB_CONFIG.database]
        );
        
        if (procedures.length > 0) {
            console.log(`Found ${procedures.length} procedures:\n`);
            procedures.forEach((proc, i) => {
                console.log(`   ${i + 1}. ${proc.ROUTINE_NAME}`);
            });
            
            exportLines.push(`\n-- ===============================================`);
            exportLines.push(`-- STORED PROCEDURES`);
            exportLines.push(`-- ===============================================\n`);
            
            for (const proc of procedures) {
                const procName = proc.ROUTINE_NAME;
                const [createProc] = await connection.query(`SHOW CREATE PROCEDURE \`${procName}\``);
                exportLines.push(`DROP PROCEDURE IF EXISTS \`${procName}\`;\n`);
                exportLines.push('DELIMITER //\n');
                exportLines.push(createProc[0]['Create Procedure'] + '//')
                exportLines.push('\nDELIMITER ;\n');
            }
        } else {
            console.log('No stored procedures found');
        }

        // Export functions
        console.log('\n🔧 Exporting functions...');
        const [functions] = await connection.query(
            "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION'",
            [DB_CONFIG.database]
        );
        
        if (functions.length > 0) {
            console.log(`Found ${functions.length} functions:\n`);
            functions.forEach((func, i) => {
                console.log(`   ${i + 1}. ${func.ROUTINE_NAME}`);
            });
            
            exportLines.push(`\n-- ===============================================`);
            exportLines.push(`-- FUNCTIONS`);
            exportLines.push(`-- ===============================================\n`);
            
            for (const func of functions) {
                const funcName = func.ROUTINE_NAME;
                const [createFunc] = await connection.query(`SHOW CREATE FUNCTION \`${funcName}\``);
                exportLines.push(`DROP FUNCTION IF EXISTS \`${funcName}\`;\n`);
                exportLines.push('DELIMITER //\n');
                exportLines.push(createFunc[0]['Create Function'] + '//');
                exportLines.push('\nDELIMITER ;\n');
            }
        } else {
            console.log('No functions found');
        }

        // Write to file
        const exportPath = path.join(__dirname, '..', 'database', 'mysql_complete_export.sql');
        await fs.writeFile(exportPath, exportLines.join('\n'), 'utf8');
        
        console.log('\n✅ Export completed successfully!');
        console.log(`📁 File saved to: ${exportPath}`);
        console.log(`📊 Export size: ${(exportLines.join('\n').length / 1024).toFixed(2)} KB`);
        
        // Generate summary
        const summary = {
            database: DB_CONFIG.database,
            exportDate: new Date().toISOString(),
            tables: tables.length,
            views: views.length,
            procedures: procedures.length,
            functions: functions.length,
            tableDetails: []
        };
        
        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            summary.tableDetails.push({
                name: tableName,
                rows: count[0].count
            });
        }
        
        // Write summary
        const summaryPath = path.join(__dirname, '..', 'database', 'export_summary.json');
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`📋 Summary saved to: ${summaryPath}\n`);
        
        // Print summary
        console.log('📊 Export Summary:');
        console.log('─────────────────────────────────────');
        console.log(`Tables: ${summary.tables}`);
        console.log(`Views: ${summary.views}`);
        console.log(`Procedures: ${summary.procedures}`);
        console.log(`Functions: ${summary.functions}`);
        console.log('\nTable Details:');
        summary.tableDetails.forEach(t => {
            console.log(`   ${t.name.padEnd(30)} ${t.rows.toString().padStart(6)} rows`);
        });
        console.log('─────────────────────────────────────');
        
    } catch (error) {
        console.error('❌ Export failed:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Fix: Update DB_CONFIG in this script with correct credentials');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run export
console.log('🚀 Starting database export...\n');
exportDatabase();
