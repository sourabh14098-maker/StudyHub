const express = require("express");
const Contact = require("../models/Contact");
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    console.log("📩 CONTACT API HIT", req.body);

    const { name, email, subject, message } = req.body;

    // Validate inputs
    if (!name || !email || !subject || !message) {
      console.warn("⚠️ Missing required fields in contact request body");
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    if (Contact.db.readyState !== 1) {
      return res.status(503).json({
        message: "MongoDB is not connected yet. Please check MongoDB Atlas access and try again."
      });
    }

    // 1. Save to MongoDB Database first
    const newContact = new Contact({
      name,
      email,
      subject,
      message
    });

    await newContact.save();
    console.log("✅ MongoDB Saved Successfully");

    // 2. Attempt to Send Email via Nodemailer
    console.log("📧 Sending Email via Nodemailer...");
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn("⚠️ Email config missing, skipping email notification.");
      return res.status(201).json({
        message: "Message saved in database (Email configuration missing)."
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: `StudyHub Contact Form <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Sends email to your own Gmail address
      replyTo: email, // Reply directly to the sender's email
      subject: `New StudyHub Enquiry: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
          <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 0;">New Contact Form Message</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 15px 0; border-radius: 4px; white-space: pre-wrap; font-style: italic;">
            ${message}
          </div>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 11px; color: #6b7280; text-align: center; margin-bottom: 0;">
            This email was sent automatically from your StudyHub contact form system.
          </p>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log("✅ Email Sent Successfully!");
      
      return res.status(201).json({
        message: "Message saved and email sent successfully!"
      });
    } catch (emailError) {
      console.error("⚠️ Nodemailer Login/Send Error:", emailError.message);
      
      // Return 201 status code so frontend knows the message was saved in MongoDB, but alert them about Gmail
      return res.status(201).json({
        message: "Message saved in MongoDB database! But email notification failed (please verify your Gmail App Password)."
      });
    }

  } catch (error) {
    console.error("❌ CONTACT ROUTE ERROR:", error.message);
    res.status(500).json({
      message: "Database Save Failed: " + error.message
    });
  }
});

module.exports = router;
