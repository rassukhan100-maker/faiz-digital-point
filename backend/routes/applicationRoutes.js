const express = require("express");
const QRCode = require("qrcode");

const Application = require("../models/ApplicationModel");
const Counter = require("../models/CounterModel");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// PUBLIC API: QR scan karke status check
// Is route ko authentication middleware se pehle rakha gaya hai.
router.get("/status/:token", async (req, res) => {
    try {
        const application = await Application.findOne({
            tokenNumber: req.params.token
        });

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found."
            });
        }

        res.json({
            success: true,
            tokenNumber: application.tokenNumber,
            applicationType: application.applicationType,
            status: application.status === "Completed"
                ? "Completed"
                : "Uncompleted",
            updatedAt: application.updatedAt
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to check application status."
        });
    }
});

// All routes below require admin login
router.use(authMiddleware);


// GET ALL APPLICATIONS
router.get("/", async (req, res) => {
    try {
        const applications = await Application.find()
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            applications
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to load applications."
        });
    }
});


// CREATE APPLICATION
router.post("/", async (req, res) => {
    try {
        const {
            applicationType,
            studentName,
            fatherName,
            mobile,
            enrollmentNumber,
            dateOfBirth,
            course,
            semester,
            year,
            applicationDate,
            amount
        } = req.body;

        if (
            !["Fresh", "Renewal"].includes(applicationType) ||
            !studentName ||
            !mobile ||
            !enrollmentNumber ||
            !course
        ) {
            return res.status(400).json({
                success: false,
                message: "Please fill all required fields."
            });
        }

        if (
            amount !== undefined &&
            (!Number.isFinite(Number(amount)) || Number(amount) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid amount."
            });
        }

        // One shared counter for Fresh and Renewal.
        const counter = await Counter.findOneAndUpdate(
            { key: "applicationsToken" },
            { $inc: { sequence: 1 } },
            {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            }
        );

        const tokenNumber = `FDP-${String(counter.sequence).padStart(6, "0")}`;

        // QR points to the public status page.
        const statusUrl =
            `https://faiz-digital-point.onrender.com/status.html?token=${encodeURIComponent(tokenNumber)}`;
        const qrCodeDataUrl = await QRCode.toDataURL(statusUrl, {
            errorCorrectionLevel: "H",
            width: 350,
            margin: 2
        });

        const application = await Application.create({
            tokenNumber,
            applicationType,
            studentName,
            fatherName: fatherName || "",
            mobile,
            enrollmentNumber,
            dateOfBirth: dateOfBirth || null,
            course,
            semester: semester || "",
            year: year || "",
            applicationDate: applicationDate || new Date(),
            amount: Number(amount || 0),
            status: "Pending",
            qrCodeDataUrl
        });

        res.status(201).json({
            success: true,
            message: "Application saved and QR generated successfully.",
            application
        });

    } catch (error) {
        console.error("Create application error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to save application."
        });
    }
});


// UPDATE APPLICATION DETAILS
router.put("/:id", async (req, res) => {
    try {
        const allowedFields = [
            "applicationType",
            "studentName",
            "fatherName",
            "mobile",
            "enrollmentNumber",
            "dateOfBirth",
            "course",
            "semester",
            "year",
            "applicationDate",
            "amount"
        ];

        const updates = {};

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        if (
            updates.applicationType &&
            !["Fresh", "Renewal"].includes(updates.applicationType)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid application type."
            });
        }

        if (
            updates.amount !== undefined &&
            (!Number.isFinite(Number(updates.amount)) ||
                Number(updates.amount) < 0)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid amount."
            });
        }

        const application = await Application.findByIdAndUpdate(
            req.params.id,
            updates,
            {
                new: true,
                runValidators: true
            }
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found."
            });
        }

        res.json({
            success: true,
            message: "Application updated.",
            application
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to update application."
        });
    }
});


// UPDATE STATUS
router.patch("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;

        let databaseStatus;

        if (status === "Completed") {
            databaseStatus = "Completed";
        } else if (
            status === "Uncompleted" ||
            status === "Pending"
        ) {
            databaseStatus = "Pending";
        } else {
            return res.status(400).json({
                success: false,
                message: "Invalid status."
            });
        }

        const application = await Application.findByIdAndUpdate(
            req.params.id,
            { status: databaseStatus },
            { new: true }
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found."
            });
        }

        res.json({
            success: true,
            message: "Status updated.",
            application
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to update status."
        });
    }
});


// DELETE APPLICATION
router.delete("/:id", async (req, res) => {
    try {
        const application = await Application.findByIdAndDelete(
            req.params.id
        );

        if (!application) {
            return res.status(404).json({
                success: false,
                message: "Application not found."
            });
        }

        res.json({
            success: true,
            message: "Application deleted."
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to delete application."
        });
    }
});

module.exports = router;