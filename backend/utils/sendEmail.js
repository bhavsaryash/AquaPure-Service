import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
    let transporter;

    // Check if SMTP vars are set; otherwise use Ethereal (Test Account)
    if (process.env.SMTP_HOST) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            auth: {
                user: process.env.SMTP_EMAIL,
                pass: process.env.SMTP_PASSWORD
            }
        });
    } else {
        // Development/Fallback: Use Ethereal
        console.log('No SMTP config found. Using Ethereal Test Account...');
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
    }

    const message = {
        from: process.env.SMTP_FROM_NAME ? `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>` : 'AquaPure <noreply@aquapure.com>',
        to: options.email,
        subject: options.subject,
        text: options.message
    };

    const info = await transporter.sendMail(message);

    console.log('Message sent: %s', info.messageId);

    // If using Ethereal, log the preview URL
    if (!process.env.SMTP_HOST) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return info;
};

export default sendEmail;
