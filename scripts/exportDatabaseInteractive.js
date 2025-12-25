/**
 * Database Export Script with Credential Prompt
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');

// Try to load from .env if exists
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function getCredentials() {
    console.log('📋 MySQL Database Credentials');
    console.log('Press Enter to use default values shown in [brackets]\n');
    
    const host = await question(`Host [${process.env.DB_HOST || 'localhost'}]: `) || process.env.DB_HOST || 'localhost';
    const user = await question(`User [${process.env.DB_USER || 'root'}]: `) || process.env.DB_USER || 'root';
    const password = await question(`Password [${process.env.DB_PASSWORD || ''}]: `) || process.env.DB_PASSWORD || '';
    const database = await question(`Database [${process.env.DB_NAME || 'wifi_billing'}]: `) || process.env.DB_NAME || 'wifi_billing';
    const port = await question(`Port [${process.env.DB_PORT || '3306'}]: `) || process.env.DB_PORT || '3306';
    
    rl.close();
    
    return {
        host,
        user,
        password,
        database,
        port: parseInt(port)
    };
}

async function exportDatabase() {
    let connection;
    
    try {
        const config = await getCredentials();
        
        console.log('\n🔌 Connecting to MySQL database...');
        connection = await mysql.createConnection(config);
        console.log('✅ Connected successfully!\n');

        const exportLines = [];
        exportLines.push('-- ===============================================');
        exportLines.push('-- COMPLETE MYSQL DATABASE EXPORT');
        exportLines.push(`-- Database: ${config.database}`);
        exportLines.push(`-- Exported: ${new Date().toISOString()}`);
        exportLines.push('-- ===============================================\n');
        exportLines.push('-- This export includes:');
        exportLines.push('-- 1. All table structures (CREATE TABLE statements)');
        exportLines.push('-- 2. All data (INSERT statements)');
        exportLines.push('-- 3. All views');
        exportLines.push('-- 4. All stored procedures');
        exportLines.push('-- 5. All indexes and constraints');
        exportLines.push('-- ===============================================\n');
        exportLines.push(`USE ${config.database};\n`);

        // Get all tables
        console.log('📋 Fetching table list...');
        const [tables] = await connection.query(
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
            [config.database]
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
                        if (typeof value === 'string') return `'${value.replace(/'/g, "''").replace(/\\/g, '\\\\')}'`;
                        if (value instanceof Date) return `'${value.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        if (typeof value === 'boolean') return value ? '1' : '0';
                        if (Buffer.isBuffer(value)) return `'${value.toString('hex')}'`;
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
            "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME",
            [config.database]
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
            "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'PROCEDURE' ORDER BY ROUTINE_NAME",
            [config.database]
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
                exportLines.push(createProc[0]['Create Procedure'] + '//');
                exportLines.push('\nDELIMITER ;\n');
            }
        } else {
            console.log('No stored procedures found');
        }

        // Export functions
        console.log('\n🔧 Exporting functions...');
        const [functions] = await connection.query(
            "SELECT ROUTINE_NAME FROM INFORMATION_SCHEMA.ROUTINES WHERE ROUTINE_SCHEMA = ? AND ROUTINE_TYPE = 'FUNCTION' ORDER BY ROUTINE_NAME",
            [config.database]
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

        // Export triggers
        console.log('\n⚡ Exporting triggers...');
        const [triggers] = await connection.query(
            "SELECT TRIGGER_NAME, EVENT_MANIPULATION, EVENT_OBJECT_TABLE FROM INFORMATION_SCHEMA.TRIGGERS WHERE TRIGGER_SCHEMA = ? ORDER BY TRIGGER_NAME",
            [config.database]
        );
        
        if (triggers.length > 0) {
            console.log(`Found ${triggers.length} triggers:\n`);
            triggers.forEach((trig, i) => {
                console.log(`   ${i + 1}. ${trig.TRIGGER_NAME} (${trig.EVENT_MANIPULATION} on ${trig.EVENT_OBJECT_TABLE})`);
            });
            
            exportLines.push(`\n-- ===============================================`);
            exportLines.push(`-- TRIGGERS`);
            exportLines.push(`-- ===============================================\n`);
            
            for (const trig of triggers) {
                const trigName = trig.TRIGGER_NAME;
                const [createTrig] = await connection.query(`SHOW CREATE TRIGGER \`${trigName}\``);
                exportLines.push(`DROP TRIGGER IF EXISTS \`${trigName}\`;\n`);
                exportLines.push('DELIMITER //\n');
                exportLines.push(createTrig[0]['SQL Original Statement'] + '//');
                exportLines.push('\nDELIMITER ;\n');
            }
        } else {
            console.log('No triggers found');
        }

        // Write to file
        const exportPath = path.join(__dirname, '..', 'database', 'mysql_complete_export.sql');
        await fs.writeFile(exportPath, exportLines.join('\n'), 'utf8');
        
        console.log('\n✅ Export completed successfully!');
        console.log(`📁 File saved to: ${exportPath}`);
        console.log(`📊 Export size: ${(exportLines.join('\n').length / 1024).toFixed(2)} KB`);
        
        // Generate summary
        const summary = {
            database: config.database,
            exportDate: new Date().toISOString(),
            tables: tables.length,
            views: views.length,
            procedures: procedures.length,
            functions: functions.length,
            triggers: triggers.length,
            tableDetails: []
        };
        
        for (const table of tables) {
            const tableName = table.TABLE_NAME;
            const [count] = await connection.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
            const [columns] = await connection.query(`SHOW COLUMNS FROM \`${tableName}\``);
            summary.tableDetails.push({
                name: tableName,
                rows: count[0].count,
                columns: columns.length
            });
        }
        
        // Write summary
        const summaryPath = path.join(__dirname, '..', 'database', 'export_summary.json');
        await fs.writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
        console.log(`📋 Summary saved to: ${summaryPath}\n`);
        
        // Print summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('                  📊 EXPORT SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`Database:   ${summary.database}`);
        console.log(`Tables:     ${summary.tables}`);
        console.log(`Views:      ${summary.views}`);
        console.log(`Procedures: ${summary.procedures}`);
        console.log(`Functions:  ${summary.functions}`);
        console.log(`Triggers:   ${summary.triggers}`);
        console.log('───────────────────────────────────────────────────────');
        console.log('Table Details:');
        console.log('───────────────────────────────────────────────────────');
        console.log('Table Name                     Rows    Columns');
        console.log('───────────────────────────────────────────────────────');
        summary.tableDetails.forEach(t => {
            console.log(`${t.name.padEnd(30)} ${t.rows.toString().padStart(6)}  ${t.columns.toString().padStart(7)}`);
        });
        console.log('═══════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('\n❌ Export failed:', error.message);
        if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('\n💡 Tip: Check your MySQL credentials and try again');
        }
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run export
console.log('═══════════════════════════════════════════════════════');
console.log('         🚀 MySQL Database Export Tool');
console.log('═══════════════════════════════════════════════════════\n');
exportDatabase();
