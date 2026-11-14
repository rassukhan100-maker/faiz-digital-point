const dns = require ("dns");
dns.setServers(["8.8.8.8","8.8.4.4"]);

require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Admin = require("./models/AdminModel");

async function createAdmin() {
    try {
        if (!process.env.MONGO_URI ||
            !process.env.ADMIN_USERNAME ||
            !process.env.ADMIN_PASSWORD) {
            throw new Error("Required environment variables are missing.");
        }

        await mongoose.connect(process.env.MONGO_URI);

        const existingAdmin = await Admin.findOne({
            username: process.env.ADMIN_USERNAME
        });

        if (existingAdmin) {
            console.log("Admin account already exists.");
            return;
        }

        const hashedPassword = await bcrypt.hash(
            process.env.ADMIN_PASSWORD,
            12
        );

        await Admin.create({
            username: process.env.ADMIN_USERNAME,
            password: hashedPassword
        });

        console.log("Admin account created successfully.");

    } catch (error) {
        console.error("Admin setup failed:", error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();