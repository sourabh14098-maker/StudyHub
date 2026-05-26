const express = require("express");
const multer = require("multer");
const Note = require("../models/Note");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// File upload setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "server/uploads");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Upload note
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const { title, subject, description } = req.body;

        const note = await Note.create({
            title,
            subject,
            description,
            fileName: req.file ? req.file.filename : "",
            filePath: req.file ? req.file.path : "",
            uploadedBy: req.user.id
        });

        res.status(201).json({
            message: "Note uploaded successfully",
            note
        });
    } catch (error) {
        res.status(500).json({ message: "Note upload failed", error: error.message });
    }
});

// Get all notes
router.get("/", async (req, res) => {
    try {
        const notes = await Note.find().populate("uploadedBy", "name email");
        res.json(notes);
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch notes" });
    }
});

module.exports = router;