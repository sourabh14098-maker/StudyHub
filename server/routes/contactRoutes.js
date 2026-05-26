const express = require("express");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");

const router = express.Router();

const filePath = path.join(__dirname, "../data/contacts.json");

router.post("/", async (req, res) => {
    console.log("CONTACT API HIT", req.body);
    try {
        const { name, email, subject, message } = req.body;

        const newContact = {
            id: Date.now(),
            name,
            email,
            subject,
            message,
            createdAt: new Date()
        };

        let contacts = [];

        if (fs.existsSync(filePath)) {
            contacts = JSON.parse(fs.readFileSync(filePath, "utf8"));
        }

        contacts.push(newContact);
        fs.writeFileSync(filePath, JSON.stringify(contacts, null, 2));

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS
            }
          });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: `StudyHub Contact: ${subject}`,
            text: `
Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
      `
        });

        console.log("EMAIL SENT SUCCESSFULLY");
        res.status(201).json({
            message: "Message sent successfully"
          });
    } catch (error) {
        res.status(500).json({
            message: "Message failed: " + error.message
          });
    }
});

module.exports = router;