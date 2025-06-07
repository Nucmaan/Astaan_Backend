const nodemailer = require("nodemailer");

const sendResetLink = async (token, email) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        text: `To reset your password, please visit the following link: ${process.env.FRONTEND_DOMAIN}/reset-password/${token}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Reset link sent successfully!");
        return { success: true, message: "Reset link sent successfully!" };
    } catch (error) {
        console.error("Error sending reset link:", error);
        return { success: false, message: "Error sending reset link" };
    }
};

module.exports = sendResetLink;
