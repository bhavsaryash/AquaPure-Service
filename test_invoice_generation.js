import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testInvoiceGeneration = async () => {
    try {
        console.log("--- Testing Invoice Generation ---\n");

        const invoiceController = await import('./backend/controllers/invoiceController.js');

        const mockData = {
            invoiceNumber: 'INV-TEST-001',
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            totalAmount: 1500,
            items: [
                { name: 'RO Filter', description: 'Quantity: 1', amount: 1000 },
                { name: 'Labor Charges', description: 'Service Labor', amount: 500 }
            ]
        };

        console.log("1. Generating PDF Buffer...");
        const buffer = await invoiceController.getInvoiceBuffer(mockData);

        if (Buffer.isBuffer(buffer) && buffer.length > 0) {
            console.log(`Success: Generated PDF Buffer of size ${buffer.length} bytes.`);

            // Save to file to verify visually if needed
            const outputPath = path.join(__dirname, 'test_invoice.pdf');
            fs.writeFileSync(outputPath, buffer);
            console.log(`Saved test invoice to: ${outputPath}`);
        } else {
            console.error("Failed: Buffer is empty or invalid.");
            process.exit(1);
        }

        console.log("\n2. Simulating Email Attachment...");
        // Just log that we have the buffer ready for attachment
        console.log("Ready to attach to email with filename: Invoice-TEST-001.pdf");

        console.log("\n--- INVOICE GENERATION VERIFIED ---");
        process.exit(0);

    } catch (err) {
        console.error('TEST FAILED:', err);
        process.exit(1);
    }
};

testInvoiceGeneration();
