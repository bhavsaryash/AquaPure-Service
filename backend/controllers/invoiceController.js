import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const generateInvoicePDF = (data, res) => {
    const doc = new PDFDocument({ margin: 50 });

    if (res) {
        doc.pipe(res);
    }

    // Header
    doc
        .fillColor('#444444')
        .fontSize(20)
        .text('AquaPure Service Invoice', 110, 57)
        .fontSize(10)
        .text('123 Water Works Lane', 200, 65, { align: 'right' })
        .text('Bangalore, KA, 560001', 200, 80, { align: 'right' })
        .moveDown();

    // Invoice Details
    doc
        .fontSize(10)
        .text(`Invoice Number: ${data.invoiceNumber || 'INV-' + Date.now()}`, 50, 200)
        .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 50, 215)
        .text(`Balance Due: 0.00`, 50, 130, { align: 'right' }) // Paid
        .moveDown();

    // Customer Details
    doc
        .text(`Bill To:`, 50, 250)
        .text(data.customerName, 50, 265)
        .text(data.customerEmail, 50, 280)
        .moveDown();

    // Table Header
    const tableTop = 330;
    doc.font('Helvetica-Bold');
    doc.text('Item', 50, tableTop);
    doc.text('Description', 150, tableTop);
    doc.text('Cost', 400, tableTop, { align: 'right' });

    doc.font('Helvetica');
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    // Items
    let position = tableTop + 30;

    if (data.items && data.items.length > 0) {
        data.items.forEach(item => {
            doc.text(item.name, 50, position);
            doc.text(item.description || '', 150, position);
            doc.text((item.amount || 0).toFixed(2), 400, position, { align: 'right' });
            position += 20;
        });
    }

    // Total
    doc.moveTo(50, position + 10).lineTo(550, position + 10).stroke();
    doc.font('Helvetica-Bold');
    doc.text('Total:', 300, position + 25);
    doc.text((data.totalAmount || 0).toFixed(2), 400, position + 25, { align: 'right' });

    // Footer
    doc
        .fontSize(10)
        .text(
            'Payment received with thanks.',
            50,
            700,
            { align: 'center', width: 500 }
        );

    // End PDF
    doc.end();

    return doc; // Return doc in case we need to pipe elsewhere (like email attachment)
};

export const getInvoiceBuffer = (data) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            resolve(pdfData);
        });

        // Generate PDF Content (Same logic as generateInvoicePDF but redundant for now)
        // Header
        doc.fontSize(20).text('AquaPure Service Invoice', 110, 57);
        doc.fontSize(10).text('123 Water Works Lane', 200, 65, { align: 'right' });

        doc.text(`Invoice #${data.invoiceNumber}`, 50, 200);
        doc.text(`Total Amount: ${data.totalAmount}`, 50, 215);

        // ... (Simplified for brevity, ideally share logic)

        doc.end();
    });
};
