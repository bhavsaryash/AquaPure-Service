import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const testEmail = async () => {
    console.log('--- Email Debugger ---');
    console.log('Checking configuration...');

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const email = process.env.SMTP_EMAIL;
    const password = process.env.SMTP_PASSWORD;

    console.log(`SMTP_HOST: ${host}`);
    console.log(`SMTP_PORT: ${port}`);
    console.log(`SMTP_EMAIL: ${email}`);
    console.log(`SMTP_PASSWORD: ${password ? '**** (Set)' : 'MISSING'}`);

    if (!host || !email || !password) {
        console.error('ERROR: Missing required environment variables in .env file.');
        return;
    }

    try {
        console.log('Attempting to create transport...');
        const transporter = nodemailer.createTransport({
            host: host,
            port: port || 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: email,
                pass: password
            }
        });

        console.log('Attempting to send test email to self...');
        const info = await transporter.sendMail({
            from: `"Test Debugger" <${email}>`,
            to: email, // Send to self
            subject: "Test Email from AquaPure Debugger",
            text: "If you are reading this, your email configuration is working correctly!",
            html: "<b>If you are reading this, your email configuration is working correctly!</b>"
        });

        console.log('SUCCESS! Email sent.');
        console.log('Message ID:', info.messageId);
        console.log('Response:', info.response);
    } catch (error) {
        console.error('FAILED to send email.');
        console.error('Error details:', error);
    }
};

testEmail();
