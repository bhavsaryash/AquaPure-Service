import React from 'react';
import { Download } from 'lucide-react';

interface ServiceReceipt {
  serviceId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  serviceDate: string;
  serviceType: string;
  employeeName: string;
  workPerformed: string;
  partsUsed: Array<{
    name: string;
    quantity: number;
    cost?: number;
    unitCost?: number;
  }>;
  laborCost: number;
  totalCost: number;
  paymentMethod: string;
  paymentStatus: string;
  nextServiceDate?: string;
  signatures?: {
    customer?: string;
    technician?: string;
  };
}

interface PDFGeneratorProps {
  receipt: ServiceReceipt;
  onDownload?: () => void;
  buttonText?: string;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({ receipt, onDownload, buttonText = "Download PDF" }) => {
  const generatePDF = () => {
    // We create a printable HTML version and open it safely using a Blob URL
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Receipt - ${receipt.serviceId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 5px;
            }
            .company-tagline {
              color: #666;
              font-size: 14px;
            }
            .receipt-info {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
            }
            .info-section {
              flex: 1;
            }
            .info-section h3 {
              color: #333;
              border-bottom: 1px solid #ddd;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .service-details {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .parts-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .parts-table th,
            .parts-table td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            .parts-table th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .cost-summary {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .cost-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
            }
            .total-row {
              font-weight: bold;
              font-size: 18px;
              border-top: 2px solid #333;
              padding-top: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              color: #666;
              font-size: 12px;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 40px;
            }
            .signature-box {
              border-top: 1px solid #333;
              width: 200px;
              text-align: center;
              padding-top: 10px;
            }
            .signature-img {
              max-width: 150px;
              max-height: 60px;
              margin-bottom: 5px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">AquaPure Services</div>
            <div class="company-tagline">Professional RO Water Purifier Servicing</div>
            <div style="margin-top: 10px;">
              <strong>Contact:</strong> +91-9558641805 | Email: info@aquapure.com
            </div>
          </div>

          <div class="receipt-info">
            <div class="info-section">
              <h3>Service Information</h3>
              <p><strong>Service ID:</strong> ${receipt.serviceId}</p>
              <p><strong>Service Type:</strong> ${receipt.serviceType}</p>
              <p><strong>Service Date:</strong> ${new Date(receipt.serviceDate).toLocaleDateString('en-IN')}</p>
              <p><strong>Technician:</strong> ${receipt.employeeName}</p>
            </div>
            <div class="info-section">
              <h3>Customer Information</h3>
              <p><strong>Name:</strong> ${receipt.customerName}</p>
              <p><strong>Phone:</strong> ${receipt.customerPhone}</p>
              <p><strong>Address:</strong> ${receipt.customerAddress}</p>
            </div>
          </div>

          <div class="service-details">
            <h3>Work Performed</h3>
            <p>${receipt.workPerformed}</p>
          </div>

          ${receipt.partsUsed.length > 0 ? `
            <h3>Parts Used</h3>
            <table class="parts-table">
              <thead>
                <tr>
                  <th>Part Name</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                  <th>Total Cost</th>
                </tr>
              </thead>
              <tbody>
                ${receipt.partsUsed.map(part => {
                  const partCost = part.unitCost || part.cost || 0;
                  return `
                  <tr>
                    <td>${part.name}</td>
                    <td>${part.quantity}</td>
                    <td>₹${partCost.toFixed(2)}</td>
                    <td>₹${(partCost * part.quantity).toFixed(2)}</td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          ` : ''}

          <div class="cost-summary">
            <h3>Cost Summary</h3>
            <div class="cost-row">
              <span>Labor Cost:</span>
              <span>₹${receipt.laborCost.toFixed(2)}</span>
            </div>
            <div class="cost-row">
              <span>Parts Cost:</span>
              <span>₹${receipt.partsUsed.reduce((total, part) => total + ((part.unitCost || part.cost || 0) * part.quantity), 0).toFixed(2)}</span>
            </div>
            <div class="cost-row total-row">
              <span>Total Amount:</span>
              <span>₹${receipt.totalCost.toFixed(2)}</span>
            </div>
          </div>

          <div class="service-details">
            <h3>Payment Information</h3>
            <p><strong>Payment Method:</strong> ${receipt.paymentMethod.toUpperCase()}</p>
            <p><strong>Payment Status:</strong> ${receipt.paymentStatus.toUpperCase()}</p>
            ${receipt.nextServiceDate ? `<p><strong>Next Service Due:</strong> ${new Date(receipt.nextServiceDate).toLocaleDateString('en-IN')}</p>` : ''}
          </div>

          <div class="signature-section">
            <div class="signature-box" style="${receipt.signatures?.customer ? 'border-top: none;' : ''}">
              ${receipt.signatures?.customer ?
        `<img src="${receipt.signatures.customer}" class="signature-img" alt="Customer Signature" /><br/>` :
        '<div style="height: 40px;"></div>'
      }
              <div style="border-top: 1px solid #333; padding-top: 5px;">Customer Signature</div>
            </div>
            <div class="signature-box" style="${receipt.signatures?.technician ? 'border-top: none;' : ''}">
               ${receipt.signatures?.technician ?
        `<img src="${receipt.signatures.technician}" class="signature-img" alt="Technician Signature" /><br/>` :
        '<div style="height: 40px;"></div>'
      }
              <div style="border-top: 1px solid #333; padding-top: 5px;">Technician Signature</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for choosing AquaPure Services!</p>
            <p>For any queries or support, please contact us at +91-9558641805</p>
            <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    
    if (!printWindow) {
      alert("Please allow pop-ups to view the PDF receipt.");
      return;
    }

    if (onDownload) {
      onDownload();
    }
  };

  const downloadPDF = () => {
    // In a real implementation, you would generate and download a PDF file
    generatePDF();
  };

  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={downloadPDF}
        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Download className="h-4 w-4 mr-2" />
        {buttonText}
      </button>


    </div>
  );
};

export default PDFGenerator;