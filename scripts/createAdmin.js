const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function createAdmin() {
    // Admin credentials
    const email = 'kenya@gmail.com';
    const password = 'kenya123';

    try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // SQL query to insert admin
        const query = 'INSERT INTO admins (email, password) VALUES (?, ?)';
        
        db.query(query, [email, hashedPassword], (err, result) => {
            if (err) {
                console.error('Error creating admin:', err);
                process.exit(1);
            }
            console.log('✅ Admin created successfully!');
            console.log('Email:', email);
            console.log('Password:', password);
            process.exit(0);
        });
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

createAdmin();