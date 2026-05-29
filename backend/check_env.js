import dotenv from 'dotenv';
dotenv.config();

console.log('--- Env Check ---');
console.log('CLIENT_ORIGIN:', process.env.CLIENT_ORIGIN);
console.log('SMTP_HOST:', process.env.SMTP_HOST);
