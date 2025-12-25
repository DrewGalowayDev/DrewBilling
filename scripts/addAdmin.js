const bcrypt = require("bcryptjs");
const db = require("../config/db");

const email = "kenya@gmail.com";
const password = "kenya123";

async function insertNewAdmin() {
    try {
        // First, clear any existing admin
        await new Promise((resolve, reject) => {
            db.query("DELETE FROM admins WHERE email = ?", [email], (err) => {
                if (err) reject(err);
                resolve();
            });
        });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert new admin
        await new Promise((resolve, reject) => {
            db.query(
                "INSERT INTO admins (email, password) VALUES (?, ?)",
                [email, hashedPassword],
                (err, result) => {
                    if (err) reject(err);
                    console.log("✅ Admin created with ID:", result.insertId);
                    resolve(result);
                }
            );
        });

        // Verify admin was created
        await new Promise((resolve, reject) => {
            db.query("SELECT * FROM admins WHERE email = ?", [email], async (err, results) => {
                if (err) reject(err);
                if (results.length === 0) {
                    reject(new Error("Admin not found after creation"));
                }
                const admin = results[0];
                const isValid = await bcrypt.compare(password, admin.password);
                console.log("✅ Password verification:", isValid ? "SUCCESS" : "FAILED");
                resolve();
            });
        });

        console.log("\n🔑 Login credentials:");
        console.log("Email:", email);
        console.log("Password:", password);
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

insertNewAdmin();
