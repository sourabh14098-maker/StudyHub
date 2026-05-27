const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true
        },
        subject: {
            type: String,
            required: true
        },
        semester: {
            type: String,
            required: true
        },
        description: {
            type: String
        },
        fileName: {
            type: String
        },
        filePath: {
            type: String
        },
        fileType: {
            type: String,
            default: "pdf"
        },
        fileSize: {
            type: String,
            default: "2.4 MB"
        },
        downloadCount: {
            type: Number,
            default: 0
        },
        status: {
            type: String,
            default: "approved"
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);