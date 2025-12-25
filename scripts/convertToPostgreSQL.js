/**
 * MySQL to PostgreSQL Converter
 * Converts MySQL export to PostgreSQL-compatible SQL
 */

const fs = require('fs').promises;
const path = require('path');

async function convertMySQLToPostgreSQL() {
    try {
        console.log('🔄 Starting MySQL to PostgreSQL conversion...\n');
        
        // Read MySQL export
        const mysqlPath = path.join(__dirname, '..', 'database', 'mysql_complete_export.sql');
        console.log('📖 Reading MySQL export...');
        const mysqlContent = await fs.readFile(mysqlPath, 'utf8');
        console.log(`✓ Read ${(mysqlContent.length / 1024).toFixed(2)} KB\n`);
        
        let pgContent = mysqlContent;
        
        // Conversion steps
        console.log('🔧 Applying conversions...\n');
        
        // 1. Convert AUTO_INCREMENT to SERIAL/BIGSERIAL
        console.log('   1. Converting AUTO_INCREMENT → SERIAL');
        pgContent = pgContent.replace(/`id` int(?:\(\d+\))? NOT NULL AUTO_INCREMENT/gi, '"id" SERIAL PRIMARY KEY');
        pgContent = pgContent.replace(/`id` bigint(?:\(\d+\))? NOT NULL AUTO_INCREMENT/gi, '"id" BIGSERIAL PRIMARY KEY');
        pgContent = pgContent.replace(/AUTO_INCREMENT=\d+/gi, '');
        
        // 2. Remove MySQL-specific attributes
        console.log('   2. Removing MySQL-specific attributes');
        pgContent = pgContent.replace(/ENGINE=InnoDB/gi, '');
        pgContent = pgContent.replace(/DEFAULT CHARSET=\w+/gi, '');
        pgContent = pgContent.replace(/COLLATE=\w+/gi, '');
        pgContent = pgContent.replace(/CHARACTER SET \w+/gi, '');
        
        // 3. Convert backticks to double quotes
        console.log('   3. Converting backticks → double quotes');
        pgContent = pgContent.replace(/`/g, '"');
        
        // 4. Convert data types
        console.log('   4. Converting data types');
        pgContent = pgContent.replace(/\bint\(\d+\)/gi, 'INTEGER');
        pgContent = pgContent.replace(/\bbigint\(\d+\)/gi, 'BIGINT');
        pgContent = pgContent.replace(/\bsmallint\(\d+\)/gi, 'SMALLINT');
        pgContent = pgContent.replace(/\btinyint\(1\)/gi, 'BOOLEAN');
        pgContent = pgContent.replace(/\btinyint\(\d+\)/gi, 'SMALLINT');
        pgContent = pgContent.replace(/\bvarchar\(/gi, 'VARCHAR(');
        pgContent = pgContent.replace(/\bdatetime/gi, 'TIMESTAMP');
        pgContent = pgContent.replace(/\bdouble/gi, 'DOUBLE PRECISION');
        pgContent = pgContent.replace(/\btext\b/gi, 'TEXT');
        pgContent = pgContent.replace(/\blongtext\b/gi, 'TEXT');
        pgContent = pgContent.replace(/\bmediumtext\b/gi, 'TEXT');
        
        // 5. Convert ENUM to CHECK constraints
        console.log('   5. Converting ENUM types');
        const enumRegex = /(\w+)\s+enum\(((?:'[^']*'(?:,\s*)?)+)\)/gi;
        pgContent = pgContent.replace(enumRegex, (match, columnName, values) => {
            const cleanValues = values.replace(/'/g, '').split(',').map(v => v.trim());
            return `${columnName} VARCHAR(50) CHECK (${columnName} IN (${values}))`;
        });
        
        // 6. Convert DEFAULT values
        console.log('   6. Converting DEFAULT values');
        pgContent = pgContent.replace(/DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP/gi, 'DEFAULT CURRENT_TIMESTAMP');
        pgContent = pgContent.replace(/DEFAULT '0'/gi, "DEFAULT '0'");
        pgContent = pgContent.replace(/DEFAULT TRUE/gi, 'DEFAULT true');
        pgContent = pgContent.replace(/DEFAULT FALSE/gi, 'DEFAULT false');
        
        // 7. Convert KEY to INDEX
        console.log('   7. Converting KEY → INDEX');
        pgContent = pgContent.replace(/\s+KEY\s+"([^"]+)"\s*\(([^)]+)\)/gi, (match, indexName, columns) => {
            return ''; // Will be added separately as CREATE INDEX
        });
        
        // 8. Fix PRIMARY KEY if already defined via SERIAL
        console.log('   8. Fixing PRIMARY KEY definitions');
        pgContent = pgContent.replace(/,\s*PRIMARY KEY\s*\("id"\)/gi, '');
        
        // 9. Convert DELIMITER for procedures/functions
        console.log('   9. Converting stored procedures/functions');
        pgContent = pgContent.replace(/DELIMITER\s+\/\//gi, '');
        pgContent = pgContent.replace(/DELIMITER\s+;/gi, '');
        pgContent = pgContent.replace(/CREATE PROCEDURE/gi, 'CREATE OR REPLACE FUNCTION');
        pgContent = pgContent.replace(/CREATE FUNCTION/gi, 'CREATE OR REPLACE FUNCTION');
        
        // 10. Add PostgreSQL function syntax
        console.log('   10. Adjusting function syntax');
        pgContent = pgContent.replace(/BEGIN\s*$/gim, 'BEGIN');
        pgContent = pgContent.replace(/END\s*\/\//gim, 'END;\n$$\nLANGUAGE plpgsql;');
        
        // 11. Convert SHOW commands (remove them as they don't work in PostgreSQL)
        console.log('   11. Removing MySQL-specific commands');
        pgContent = pgContent.replace(/SHOW\s+\w+.*;/gi, '');
        
        // 12. Fix INSERT statements for BOOLEAN values
        console.log('   12. Converting BOOLEAN values in INSERTs');
        pgContent = pgContent.replace(/,\s*1\s*,/g, ', true,');
        pgContent = pgContent.replace(/,\s*0\s*,/g, ', false,');
        pgContent = pgContent.replace(/,\s*1\s*\)/g, ', true)');
        pgContent = pgContent.replace(/,\s*0\s*\)/g, ', false)');
        
        // 13. Remove IF NOT EXISTS for INSERT (PostgreSQL uses different syntax)
        console.log('   13. Adjusting INSERT statements');
        pgContent = pgContent.replace(/INSERT INTO.*ON DUPLICATE KEY UPDATE.*/gi, '-- Converted to INSERT (remove duplicate handling)');
        
        // 14. Add PostgreSQL-specific settings
        console.log('   14. Adding PostgreSQL settings');
        const pgHeader = `-- ===============================================
-- POSTGRESQL DATABASE EXPORT (Converted from MySQL)
-- Converted: ${new Date().toISOString()}
-- ===============================================
-- PostgreSQL specific settings
SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

`;
        pgContent = pgHeader + pgContent;
        
        // 15. Create indexes separately
        console.log('   15. Extracting and creating indexes\n');
        const indexMatches = mysqlContent.matchAll(/KEY\s+"([^"]+)"\s*\(([^)]+)\)/gi);
        let indexes = '\n-- ===============================================\n-- INDEXES\n-- ===============================================\n\n';
        for (const match of indexMatches) {
            const indexName = match[1];
            const columns = match[2].replace(/"/g, '');
            // Extract table name from context (this is a simplified approach)
            const tableMatch = mysqlContent.substring(0, match.index).match(/CREATE TABLE "(\w+)"/);
            if (tableMatch) {
                const tableName = tableMatch[1];
                indexes += `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" (${columns});\n`;
            }
        }
        pgContent += indexes;
        
        // Write PostgreSQL export
        const pgPath = path.join(__dirname, '..', 'database', 'postgresql_export.sql');
        await fs.writeFile(pgPath, pgContent, 'utf8');
        
        console.log('✅ Conversion completed successfully!');
        console.log(`📁 PostgreSQL file saved to: ${pgPath}`);
        console.log(`📊 Output size: ${(pgContent.length / 1024).toFixed(2)} KB\n`);
        
        // Create conversion report
        const report = {
            conversionDate: new Date().toISOString(),
            sourceFile: 'mysql_complete_export.sql',
            targetFile: 'postgresql_export.sql',
            conversions: [
                'AUTO_INCREMENT → SERIAL/BIGSERIAL',
                'Backticks → Double quotes',
                'INT(n) → INTEGER',
                'TINYINT(1) → BOOLEAN',
                'DATETIME → TIMESTAMP',
                'ENUM → CHECK constraints',
                'KEY → CREATE INDEX',
                'MySQL procedures → PostgreSQL functions',
                'Removed MySQL-specific attributes',
                'Added PostgreSQL settings'
            ]
        };
        
        const reportPath = path.join(__dirname, '..', 'database', 'conversion_report.json');
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf8');
        
        console.log('═══════════════════════════════════════════════════════');
        console.log('              📋 CONVERSION REPORT');
        console.log('═══════════════════════════════════════════════════════');
        console.log('Conversions Applied:');
        report.conversions.forEach((c, i) => {
            console.log(`   ${i + 1}. ${c}`);
        });
        console.log('═══════════════════════════════════════════════════════\n');
        
        console.log('📌 Next Steps:');
        console.log('   1. Review postgresql_export.sql for any manual adjustments needed');
        console.log('   2. Test the SQL in a local PostgreSQL instance');
        console.log('   3. Run in Supabase SQL Editor');
        console.log('   4. Verify all data and functionality\n');
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('❌ Error: mysql_complete_export.sql not found');
            console.error('💡 Please run the export script first: node scripts/exportDatabaseInteractive.js\n');
        } else {
            console.error('❌ Conversion failed:', error.message);
        }
        process.exit(1);
    }
}

// Run conversion
console.log('═══════════════════════════════════════════════════════');
console.log('       🔄 MySQL to PostgreSQL Converter');
console.log('═══════════════════════════════════════════════════════\n');
convertMySQLToPostgreSQL();
