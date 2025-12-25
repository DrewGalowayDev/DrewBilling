const bcrypt = require('bcryptjs');

// Helper script to hash passwords for admin accounts

const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
};

// Hash the default password "admin123"
const main = async () => {
    console.log('🔐 Password Hasher Utility\n');
    console.log('========================================');
    
    const passwords = [
        { label: 'Default Admin Password', password: 'admin123' },
        { label: 'Alternative Password', password: 'qonnect2024' }
    ];

    for (const item of passwords) {
        const hashed = await hashPassword(item.password);
        console.log(`\n${item.label}:`);
        console.log(`  Plain: ${item.password}`);
        console.log(`  Hashed: ${hashed}`);
    }

    console.log('\n========================================');
    console.log('✅ Use these hashed passwords in your SQL migration script');
    console.log('\nTo hash a custom password, edit this file and add to the passwords array\n');
};

main();
