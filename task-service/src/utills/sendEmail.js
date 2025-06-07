const nodemailer = require("nodemailer");

const sendNotification = async (email) => {
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
        subject: "Task Assignment",
        text: `New Task Is Assigned Check Your Taks check now ${process.env.FRONTEND_DOMAIN}`,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log("Notification sent successfully!");
        return { success: true, message: "Notification link sent successfully!" };
    } catch (error) {
        console.error("Error sending reset link:", error);
        return { success: false, message: "Error sending " };
    }
};

module.exports = sendNotification;
