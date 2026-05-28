const express = require("express");
const Contact = require("../models/Contact");
const nodemailer = require("nodemailer");

const router = express.Router();

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getMailConfig() {
  const user = (process.env.EMAIL_USER || "").trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s/g, "");
  const to = (process.env.EMAIL_TO || user).trim();
  const port = Number(process.env.EMAIL_PORT || 465);

  return {
    user,
    pass,
    to,
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure: String(process.env.EMAIL_SECURE || port === 465) === "true"
  };
}

function getTransporter() {
  const mail = getMailConfig();

  return {
    mail,
    transporter: createTransporter(mail)
  };
}

function createTransporter(mail) {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}
function getFallbackMailConfig(mail) {
  if (mail.port === 587 && mail.secure === false) return null;

  return {
    ...mail,
    port: 587,
    secure: false
  };
}

function isConnectionError(error) {
  return ["ECONNECTION", "ETIMEDOUT", "ESOCKET"].includes(error.code);
}

function getEmailFailureMessage(error) {
  if (!error) {
    return "Email environment variables are missing on the backend.";
  }

  if (error.code === "EAUTH" || error.responseCode === 535 || error.responseCode === 534) {
    return "Gmail rejected the login. Set a fresh 16-character Gmail App Password in Render EMAIL_PASS.";
  }

  if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT" || error.code === "ESOCKET") {
    return "Backend could not connect to Gmail SMTP. Check Render network/settings and Gmail SMTP config.";
  }

  return "Email could not be sent. Check Render logs for the SMTP error.";
}

async function sendContactEmail({ name, email, subject, message }) {
  const mail = getMailConfig();

  if (!mail.user || !mail.pass || !mail.to) {
    return { sent: false, reason: "Email environment variables are missing." };
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message);

  const mailOptions = {
    from: `StudyHub Contact Form <${mail.user}>`,
    to: mail.to,
    replyTo: email,
    subject: `New StudyHub Enquiry: ${subject}`,
    text: [
      "New Contact Form Message",
      `Name: ${name}`,
      `Email: ${email}`,
      `Subject: ${subject}`,
      "",
      message
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-top: 0;">New Contact Form Message</h2>
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p><strong>Subject:</strong> ${safeSubject}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f9fafb; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 15px 0; border-radius: 4px; white-space: pre-wrap;">
          ${safeMessage}
        </div>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 11px; color: #6b7280; text-align: center; margin-bottom: 0;">
          This email was sent automatically from your StudyHub contact form system.
        </p>
      </div>
    `
  };

  try {
    await createTransporter(mail).sendMail(mailOptions);
  } catch (error) {
    const fallbackMail = getFallbackMailConfig(mail);
    if (!fallbackMail || !isConnectionError(error)) throw error;

    console.warn("Primary Gmail SMTP connection failed, retrying with port 587 STARTTLS:", {
      code: error.code,
      message: error.message
    });

    await createTransporter(fallbackMail).sendMail({
      ...mailOptions,
      from: `StudyHub Contact Form <${fallbackMail.user}>`
    });
  }

  return { sent: true };
}

router.get("/email-status", async (req, res) => {
  const mail = getMailConfig();
  const status = {
    emailUserSet: Boolean(mail.user),
    emailPassSet: Boolean(mail.pass),
    emailToSet: Boolean(mail.to),
    emailUser: mail.user ? mail.user.replace(/(.{2}).+(@.+)/, "$1***$2") : null,
    emailTo: mail.to ? mail.to.replace(/(.{2}).+(@.+)/, "$1***$2") : null,
    emailPassLength: mail.pass ? mail.pass.length : 0,
    smtpHost: mail.host,
    smtpPort: mail.port,
    smtpSecure: mail.secure,
    smtpReady: false
  };

  if (!mail.user || !mail.pass || !mail.to) {
    return res.status(503).json({
      ...status,
      message: "Email config is missing on backend."
    });
  }

  try {
    const { transporter } = getTransporter();
    await transporter.verify();

    return res.json({
      ...status,
      smtpReady: true,
      message: "Email SMTP is ready."
    });
  } catch (error) {
    const fallbackMail = getFallbackMailConfig(mail);
    if (fallbackMail && isConnectionError(error)) {
      try {
        await createTransporter(fallbackMail).verify();

        return res.json({
          ...status,
          smtpReady: true,
          smtpPort: fallbackMail.port,
          smtpSecure: fallbackMail.secure,
          message: "Email SMTP is ready on fallback port 587."
        });
      } catch (fallbackError) {
        console.error("Fallback email status check failed:", {
          message: fallbackError.message,
          code: fallbackError.code,
          command: fallbackError.command,
          responseCode: fallbackError.responseCode,
          response: fallbackError.response
        });
      }
    }

    console.error("Email status check failed:", {
      message: error.message,
      code: error.code,
      command: error.command,
      responseCode: error.responseCode,
      response: error.response
    });

    return res.status(503).json({
      ...status,
      message: getEmailFailureMessage(error),
      errorCode: error.code || null,
      responseCode: error.responseCode || null
    });
  }
});

router.post("/", async (req, res) => {
  try {
    console.log("CONTACT API HIT", req.body);

    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        message: "All fields are required."
      });
    }

    if (Contact.db.readyState !== 1) {
      return res.status(503).json({
        message: "MongoDB is not connected yet. Please check MongoDB Atlas access and try again."
      });
    }

    const newContact = new Contact({
      name,
      email,
      subject,
      message
    });

    await newContact.save();
    console.log("MongoDB saved contact:", newContact._id);

    try {
      const emailResult = await sendContactEmail({ name, email, subject, message });

      if (emailResult.sent) {
        return res.status(201).json({
          emailSent: true,
          message: "Message saved and email sent successfully!"
        });
      }

      console.warn("Email skipped:", emailResult.reason);
      return res.status(202).json({
        emailSent: false,
        message: "Message saved in MongoDB, but email was not sent. Backend email config is missing."
      });
    } catch (emailError) {
      console.error("Email send failed:", {
        message: emailError.message,
        code: emailError.code,
        command: emailError.command,
        responseCode: emailError.responseCode,
        response: emailError.response
      });

      return res.status(202).json({
        emailSent: false,
        message: `Message saved in MongoDB, but email was not sent. ${getEmailFailureMessage(emailError)}`
      });
    }
  } catch (error) {
    console.error("CONTACT ROUTE ERROR:", error.message);
    res.status(500).json({
      message: "Database save failed: " + error.message
    });
  }
});

module.exports = router;
