const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
    {
        tokenNumber: {
            type: String,
            required: true,
            unique: true
        },

        applicationType: {
            type: String,
            enum: ["Fresh", "Renewal"],
            required: true
        },

        studentName: {
            type: String,
            required: true,
            trim: true
        },

        fatherName: {
            type: String,
            default: "",
            trim: true
        },

        mobile: {
            type: String,
            required: true,
            trim: true
        },

        enrollmentNumber: {
            type: String,
            required: true,
            trim: true
        },

        dateOfBirth: {
            type: Date,
            default: null
        },

        course: {
            type: String,
            required: true,
            trim: true
        },

        semester: {
            type: String,
            default: ""
        },

        year: {
            type: String,
            default: ""
        },

        applicationDate: {
            type: Date,
            default: Date.now
        },

        amount: {
            type: Number,
            default: 0,
            min: 0
        },

        status: {
            type: String,
            enum: ["Pending", "Completed"],
            default: "Pending"
        },

        qrCodeDataUrl: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Application", applicationSchema);