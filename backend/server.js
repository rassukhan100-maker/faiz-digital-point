const dns = require("dns");

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

const app = express();

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(
    path.join(__dirname, "../frontend")
));

// Authentication API
app.use("/api/auth", require("./routes/authRoutes"));

// Application APIs
app.use("/api/applications", require("./routes/applicationRoutes"));

// API health check
app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "FAIZ DIGITAL POINT API is running"
    });
});

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB Connected Successfully");

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch(error => {
        console.error(
            "MongoDB Connection Failed:",
            error.message
        );

        process.exit(1);
    });