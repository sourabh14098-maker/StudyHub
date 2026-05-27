const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const connectDB = require("./config/db");

dotenv.config({ path: path.join(__dirname, ".env") });

const app = express();

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use(express.static(path.join(__dirname, "..")));

app.get("/", (req, res) => {
    res.send("StudyHub Backend is running...");
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/notes", require("./routes/noteRoutes"));
app.use("/api/contact", require("./routes/contactRoutes"));

const PORT = process.env.PORT || 5000;

connectDB().catch((err) => {
  console.error("MongoDB Connection Failed:", err.message);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
