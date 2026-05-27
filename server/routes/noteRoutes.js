const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const Note = require("../models/Note");
const Download = require("../models/Download");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Auto-create uploads directory inside server folder
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log("📁 Created uploads directory at:", uploadDir);
}

// Multer File upload setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_"));
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload note
router.post("/upload", authMiddleware, upload.single("file"), async (req, res) => {
    try {
        const { title, subject, semester, description } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: "Please select a file to upload" });
        }

        const sizeInMb = (req.file.size / (1024 * 1024)).toFixed(2) + " MB";
        const fileExt = req.file.originalname.split('.').pop().toLowerCase();

        const note = await Note.create({
            title: title || req.file.originalname,
            subject,
            semester,
            description,
            fileName: req.file.filename,
            filePath: `/uploads/${req.file.filename}`,
            fileType: fileExt,
            fileSize: sizeInMb,
            uploadedBy: req.user.id
        });

        console.log("✅ Note uploaded and saved to MongoDB:", note.title);

        res.status(201).json({
            message: "Note uploaded successfully",
            note
        });
    } catch (error) {
        console.error("❌ Note upload failed:", error);
        res.status(500).json({ message: "Note upload failed", error: error.message });
    }
});

// Get user download history from MongoDB
router.get("/downloads/history", authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const downloads = await Download.find({ user: userId }).populate("note");
        // Extract non-null notes from the download logs
        const notes = downloads
            .map(d => d.note)
            .filter(n => n != null)
            .map(n => ({
                id: n._id,
                title: n.title,
                description: n.description || "",
                subject: n.subject,
                semester: n.semester || "Semester 1",
                fileType: n.fileType || "pdf",
                fileSize: n.fileSize || "2.4 MB",
                downloadCount: n.downloadCount || 0,
                status: n.status || "approved",
                fileName: n.fileName,
                filePath: n.filePath
            }));
        res.json(notes);
    } catch (error) {
        console.error("❌ Failed to fetch download history:", error);
        res.status(500).json({ message: "Failed to fetch download history" });
    }
});

// Get all notes
router.get("/", async (req, res) => {
    try {
        const notes = await Note.find().populate("uploadedBy", "name email");
        res.json(notes);
    } catch (error) {
        console.error("❌ Failed to fetch notes:", error);
        res.status(500).json({ message: "Failed to fetch notes" });
    }
});

// Download the physical note file by note id
router.get("/file/:id", async (req, res) => {
    try {
        if (!/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
            return res.status(404).json({ message: "File not found for this note" });
        }

        const note = await Note.findById(req.params.id);
        if (!note || !note.fileName) {
            return res.status(404).json({ message: "File not found for this note" });
        }

        const physicalPath = path.resolve(uploadDir, note.fileName);
        if (!physicalPath.startsWith(path.resolve(uploadDir)) || !fs.existsSync(physicalPath)) {
            return res.status(404).json({ message: "Uploaded file is missing on the server" });
        }

        res.download(physicalPath, note.fileName);
    } catch (error) {
        console.error("Download file failed:", error);
        res.status(500).json({ message: "Failed to download file" });
    }
});

// Delete note
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        // Delete the physical file if it exists
        const physicalPath = path.join(uploadDir, note.fileName);
        if (fs.existsSync(physicalPath)) {
            fs.unlinkSync(physicalPath);
            console.log("🗑️ Deleted file:", physicalPath);
        }

        await Note.findByIdAndDelete(req.params.id);
        
        // Delete all associated download logs
        await Download.deleteMany({ note: req.params.id });
        console.log("✅ Deleted Note and download logs from MongoDB:", note.title);

        res.json({ message: "Note deleted successfully" });
    } catch (error) {
        console.error("❌ Delete failed:", error);
        res.status(500).json({ message: "Failed to delete note" });
    }
});

// Increment download count and record in user download history
router.post("/download/:id", authMiddleware, async (req, res) => {
    try {
        const noteId = req.params.id;
        const userId = req.user.id;

        const note = await Note.findByIdAndUpdate(
            noteId, 
            { $inc: { downloadCount: 1 } }, 
            { new: true }
        );
        
        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        // Save to Download history in MongoDB (if not already downloaded by this user)
        const existingDownload = await Download.findOne({ user: userId, note: noteId });
        if (!existingDownload) {
            await Download.create({ user: userId, note: noteId });
            console.log(`💾 Recorded download history in MongoDB for note: "${note.title}"`);
        }

        res.json({ message: "Download recorded", downloadCount: note.downloadCount });
    } catch (error) {
        console.error("❌ Failed to record download:", error);
        res.status(500).json({ message: "Failed to update download count" });
    }
});

module.exports = router;
