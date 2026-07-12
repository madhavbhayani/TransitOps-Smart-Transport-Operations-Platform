const PDFDocument = require('pdfkit-table');

/**
 * Generates a PDF table from a given title, headers, and rows.
 * Pipes the resulting PDF buffer directly to the Express response stream.
 *
 * @param {Object} res - Express Response object
 * @param {String} title - The title of the PDF
 * @param {Array<String>} headers - Array of string column headers
 * @param {Array<Array<String>>} rows - Array of rows, each containing an array of strings
 */
function generateTablePDF(res, title, headers, rows) {
    const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });

    // Stream directly to response
    doc.pipe(res);

    // Document header
    doc.fontSize(20).text(`TransitOPS - ${title}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center', color: 'grey' });
    doc.moveDown(2);

    const tableArray = {
        headers: headers,
        rows: rows,
    };

    doc.table(tableArray, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            doc.font('Helvetica').fontSize(9);
            // Alternate row shading is handled automatically if enabled, but let's just stick to clean lines
            // We can add simple border and padding configuration here if needed.
        },
    });

    doc.end();
}

module.exports = {
    generateTablePDF
};
