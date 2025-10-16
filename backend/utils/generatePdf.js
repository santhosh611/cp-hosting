// backend/utils/generatePdf.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const os = require('os');
const path = require('path');

const generatePdfReport = async (reportData, reportStartDate, reportEndDate) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true
    });
    
    try {
      doc.registerFont('Montserrat', path.join(__dirname, '../public/fonts/Montserrat-Regular.ttf'));
      doc.registerFont('Montserrat-Bold', path.join(__dirname, '../public/fonts/Montserrat-Bold.ttf'));
    } catch (fontError) {
      console.error('Error registering fonts. Make sure the font files are in the public/fonts directory.', fontError);
      doc.font('Helvetica');
    }

    const tempFilePath = path.join(os.tmpdir(), `report-${Date.now()}.pdf`);
    const writeStream = fs.createWriteStream(tempFilePath);

    doc.pipe(writeStream);

    writeStream.on('finish', () => {
      fs.readFile(tempFilePath, (err, pdfBuffer) => {
        fs.unlink(tempFilePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error('Failed to delete temporary PDF file:', unlinkErr);
          }
        });

        if (err) {
          reject(err);
        } else {
          resolve(pdfBuffer);
        }
      });
    });

    doc.on('error', (err) => {
        writeStream.end();
        fs.unlink(tempFilePath, () => {});
        reject(err);
    });

    writeStream.on('error', (err) => {
        doc.end();
        reject(err);
    });

    const brandColor = '#000000';
    const primaryColor = '#333333';
    const secondaryColor = '#666666';
    const textColor = '#333333';
    const tableHeaderBg = '#F5F5F5';
    const tableBorderColor = '#DDDDDD';

    const drawHeader = () => {
      doc.y = doc.page.margins.top - 20;
      doc.x = doc.page.margins.left;
      doc.fontSize(10).fillColor(secondaryColor).font('Montserrat'); 
      doc.text('CP ARCHITECTS & INTERIORS', { align: 'right' });
      doc.fontSize(8).text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, { align: 'right' });
      doc.strokeColor(tableBorderColor).lineWidth(0.5).moveTo(doc.page.margins.left, doc.y + 15).lineTo(doc.page.width - doc.page.margins.right, doc.y + 15).stroke();
      doc.y = doc.page.margins.top + 20;
    };

    const logoPath = path.join(__dirname, '../public/logo.png');
    const logoSize = 80;
    const logoRadius = logoSize / 2;

    if (fs.existsSync(logoPath)) {
        const logoCenterX = doc.page.width / 2;
        const logoCenterY = doc.y + logoRadius;
        doc.save(); 
        doc.circle(logoCenterX, logoCenterY, logoRadius).clip();
        doc.image(logoPath, logoCenterX - logoRadius, doc.y, { width: logoSize, height: logoSize, align: 'center', valign: 'center' });
        doc.restore(); 
        doc.y = logoCenterY + logoRadius + 20;
    } else {
        console.warn('Logo file not found at path:', logoPath);
        doc.moveDown(4);
    }

    doc.fontSize(24).font('Montserrat-Bold').fillColor(secondaryColor).text('CP ARCHITECTS & INTERIORS', { align: 'center' });
    doc.moveDown(0.9);
    const lineY = doc.y;
    doc.strokeColor(tableBorderColor).lineWidth(0.5).moveTo(doc.page.margins.left + 50, lineY).lineTo(doc.page.width - doc.page.margins.right - 50, lineY).stroke();
    doc.moveDown(2);

    const firstSite = reportData[0] || {};
    const siteName = firstSite.siteName || 'N/A';
    const siteLocation = firstSite.siteLocation || 'N/A';
    const supervisors = (firstSite.supervisors && firstSite.supervisors.length > 0) ? firstSite.supervisors.map(s => s.name || s).join(', ') : 'N/A';
    
    const reportPeriodStart = reportStartDate ? new Date(reportStartDate).toLocaleDateString() : 'N/A';
    const reportPeriodEnd = reportEndDate ? new Date(reportEndDate).toLocaleDateString() : 'N/A';
    const reportPeriod = `${reportPeriodStart} to ${reportPeriodEnd}`;

    doc.fontSize(20).font('Montserrat-Bold').fillColor(primaryColor).text(`Project: ${siteName} (${siteLocation})`, { align: 'center' });
    doc.moveDown(1.5);

    const drawDetailItem = (icon, label, value, x, y) => {
      const iconWidth = 20;
      const labelColumnWidth = 120; 
      const valueX = x + labelColumnWidth;
      doc.save();
      doc.translate(x, y).path(icon).scale(0.9).fill(secondaryColor);
      doc.restore();
      doc.font('Montserrat-Bold').fontSize(15).fillColor(primaryColor).text(label, x + iconWidth, y + 1, { width: labelColumnWidth - iconWidth });
      doc.font('Montserrat').fontSize(15).fillColor(textColor).text(`:  ${value}`, valueX, y + 1);
    };

    const projectIcon = 'M14,6H10V4c0-0.55-0.45-1-1-1H5C4.45,3,4,3.45,4,4v2H0v8h14V6z M6,5h2v1H6V5z';
    const locationIcon = 'M7.5,0C4.3,0,1.5,2.6,1.5,6.4c0,4.2,5.5,10.1,6,10.6c0.5-0.5,6-6.4,6-10.6C13.5,2.6,10.7,0,7.5,0z M7.5,9 C6.12,9,5,7.88,5,6.5S6.12,4,7.5,4S10,5.12,10,6.5S8.88,9,7.5,9z';
    const calendarIcon = 'M13,1h-1V0h-2v1H4V0H2v1H1C0.4,1,0,1.4,0,2v12c0,0.6,0.4,1,1,1h12c0.6,0,1-0.4,1-1V2C14,1.4,13.6,1,13,1z M12,13H2V5h10V13z';
    const supervisorIcon = 'M7.5,7.5c1.93,0,3.5-1.57,3.5-3.5S9.43,0.5,7.5,0.5S4,2.07,4,4S5.57,7.5,7.5,7.5z M7.5,9C5.67,9,4,9.84,4,10.75V11.5 h7v-0.75C11,9.84,9.33,9,7.5,9z';

    const itemBlockWidth = 220; 
    const startXDetail = (doc.page.width - itemBlockWidth) / 2;
    let currentYDetail = doc.y;
    const verticalSpacing = 48; 

    drawDetailItem(projectIcon, 'Project Name', siteName, startXDetail, currentYDetail);
    currentYDetail += verticalSpacing; 
    drawDetailItem(locationIcon, 'Location', siteLocation, startXDetail, currentYDetail);
    
    currentYDetail += verticalSpacing;
    drawDetailItem(supervisorIcon, 'Supervisors', supervisors, startXDetail, currentYDetail);
    
    currentYDetail += verticalSpacing;
    drawDetailItem(calendarIcon, 'Report Period', reportPeriod, startXDetail, currentYDetail);

    const footerY = doc.page.height - doc.page.margins.bottom - 40;
    doc.strokeColor(tableBorderColor).lineWidth(0.5).moveTo(doc.page.margins.left, footerY - 10).lineTo(doc.page.width - doc.page.margins.right, footerY - 10).stroke();
    doc.fontSize(9).font('Montserrat').fillColor(secondaryColor).text('Business Name: CP ARCHITECTS & INTERIORS', doc.page.margins.left, footerY).text('Client Name: BALAJI');
    doc.fontSize(9).font('Montserrat').fillColor(secondaryColor).text('Email: cparchitect99@gmail.com', doc.page.margins.left, footerY, { align: 'right' }).text('Phone: 9443592033', { align: 'right' });

    const drawTable = (headers, data, rowMapper, columnWidths, title) => {
      const calculateRowHeight = (row) => {
          let maxHeight = 20; // Minimum row height
          row.forEach((cell, i) => {
              const cellText = String(cell || '');
              const colWidth = columnWidths[i] - 10;
              const textHeight = doc.heightOfString(cellText, {
                  width: colWidth,
                  align: 'left'
              });
              if (textHeight + 10 > maxHeight) {
                  maxHeight = textHeight + 10;
              }
          });
          return maxHeight;
      };
  
      const titleHeight = title ? 20 : 0;
      const headerRowHeight = 25;
      let totalTableHeight = titleHeight + headerRowHeight;
      if (data && data.length > 0) {
          data.forEach(item => {
              const mappedRow = rowMapper(item);
              totalTableHeight += calculateRowHeight(mappedRow);
          });
      } else {
          totalTableHeight += 20;
      }
  
      const availableSpace = doc.page.height - doc.page.margins.bottom - doc.y;
      const pageContentHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;
  
      if (totalTableHeight > availableSpace && totalTableHeight <= pageContentHeight) {
          doc.addPage();
          drawHeader();
      }
  
      if (title) {
          doc.fontSize(14).font('Montserrat-Bold').fillColor(primaryColor).text(title, {
              underline: false
          });
          doc.moveDown(0.7);
      }
  
      if (!data || data.length === 0) {
          doc.fontSize(10).font('Montserrat').fillColor(secondaryColor).text('No data available for this section.');
          doc.moveDown(1);
          return;
      }
  
      const tableTop = doc.y;
      const startX = doc.page.margins.left;
      const endX = doc.page.width - doc.page.margins.right;
      const tableWidth = endX - startX;
      let currentY = tableTop;
  
      const drawHeaderRow = () => {
        doc.rect(startX, currentY, tableWidth, headerRowHeight).fill(tableHeaderBg);
        
        // Draw vertical lines for header
        let headerX = startX;
        for (let i = 0; i <= headers.length; i++) {
            doc.strokeColor(tableBorderColor).lineWidth(0.5)
               .moveTo(headerX, currentY)
               .lineTo(headerX, currentY + headerRowHeight)
               .stroke();
            if (i < headers.length) headerX += columnWidths[i];
        }
        
        // Draw horizontal lines for header
        doc.moveTo(startX, currentY).lineTo(endX, currentY).stroke();
        doc.moveTo(startX, currentY + headerRowHeight).lineTo(endX, currentY + headerRowHeight).stroke();
        
        doc.font('Montserrat-Bold').fontSize(9).fillColor(textColor);
        headerX = startX;
        headers.forEach((header, i) => {
            doc.text(header, headerX + 5, currentY + 8, {
                width: columnWidths[i] - 10,
                align: 'center'
            });
            headerX += columnWidths[i];
        });
        currentY += headerRowHeight;
    };
  
    drawHeaderRow();
  
    data.forEach((item) => {
        const mappedRow = rowMapper(item);
        const currentRowHeight = calculateRowHeight(mappedRow);
  
        if (currentY + currentRowHeight > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            drawHeader();
            currentY = doc.y;
            drawHeaderRow();
        }
  
        const isTotalRow = item.isTotal;
        const rowFont = isTotalRow ? 'Montserrat-Bold' : 'Montserrat';
        const rowFontSize = isTotalRow ? 9 : 8;
        
        const rowTopY = currentY;
  
        // Draw row background for total row
        if (isTotalRow) {
            doc.rect(startX, rowTopY, tableWidth, currentRowHeight).fill('#F8F8F8');
        }
  
        // Draw vertical lines for this row
        let colX = startX;
        for (let i = 0; i <= mappedRow.length; i++) {
            doc.strokeColor(tableBorderColor).lineWidth(0.5)
               .moveTo(colX, rowTopY)
               .lineTo(colX, rowTopY + currentRowHeight)
               .stroke();
            if (i < mappedRow.length) colX += columnWidths[i];
        }
  
        // Draw horizontal line at bottom of row
        doc.moveTo(startX, rowTopY + currentRowHeight).lineTo(endX, rowTopY + currentRowHeight).stroke();
  
        // Add text content
        doc.font(rowFont).fontSize(rowFontSize).fillColor(textColor);
        colX = startX;
        mappedRow.forEach((cellText, i) => {
            const textY = rowTopY + (currentRowHeight - doc.heightOfString(String(cellText), { width: columnWidths[i] - 10 })) / 2;
            doc.text(String(cellText), colX + 5, textY, {
                width: columnWidths[i] - 10,
                align: 'left'
            });
            colX += columnWidths[i];
        });
  
        currentY += currentRowHeight;
    });
  
    doc.y = currentY;
    doc.moveDown(1.5);
    doc.x = doc.page.margins.left;
  };

    reportData.forEach((siteReport) => {
      doc.addPage();
      drawHeader();

      const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      
      const totalAttendance = siteReport.salaryCalculations.reduce((sum, sal) => sum + (sal.totalAttendanceDays || 0), 0);
      const totalGrossSalary = siteReport.salaryCalculations.reduce((sum, sal) => sum + (sal.grossSalary || 0), 0);
      const totalAdvDeducted = siteReport.salaryCalculations.reduce((sum, sal) => sum + (sal.totalAdvance || 0), 0);
      const totalNetSalary = siteReport.salaryCalculations.reduce((sum, sal) => sum + (sal.netSalary || 0), 0);

      const salaryDataWithTotal = [
        ...siteReport.salaryCalculations,
        {
          workerName: 'Total',
          totalAttendanceDays: totalAttendance,
          grossSalary: totalGrossSalary,
          totalAdvance: totalAdvDeducted,
          netSalary: totalNetSalary,
          isTotal: true
        }
      ];

      const salaryHeaders = ['Name', 'Work', 'Daily Rate', 'Total Att.', 'Gross Salary', 'Adv Deducted', 'Net Salary'];
      const salaryColumnWidths = [ availableWidth * 0.15, availableWidth * 0.15, availableWidth * 0.12, availableWidth * 0.12, availableWidth * 0.15, availableWidth * 0.18, availableWidth * 0.13 ];
      drawTable(salaryHeaders, salaryDataWithTotal, (sal) => [
        sal.workerName || 'N/A',
        sal.workerRole || 'N/A',
        sal.isTotal ? 'N/A' : `Rs. ${(sal.dailyRateUsed || 0).toFixed(0)}`,
        (sal.totalAttendanceDays || 0).toFixed(1),
        `Rs. ${(sal.grossSalary || 0).toFixed(0)}`,
        `Rs. ${(sal.totalAdvance || 0).toFixed(0)}`,
        sal.totalAttendanceDays > 0 || sal.isTotal ? `Rs. ${(sal.netSalary || 0).toFixed(0)}` : '',
      ], salaryColumnWidths, 'Worker Salaries');

      const totalMaterialPrice = siteReport.materialSummary.reduce((sum, m) => sum + (m.pricePerUnit || 0), 0);
      const totalMaterialFltCharge = siteReport.materialSummary.reduce((sum, m) => sum + (m.flightCharge || 0), 0);
      const totalMaterialCost = siteReport.materialSummary.reduce((sum, m) => sum + (m.totalCost || 0), 0);

      const sortedMaterialSummary = [...siteReport.materialSummary].sort((a, b) => new Date(b.date) - new Date(a.date));
const materialDataWithTotal = [
  ...sortedMaterialSummary,
        {
          material: 'Total',
          pricePerUnit: totalMaterialPrice,
          flightCharge: totalMaterialFltCharge,
          totalCost: totalMaterialCost,
          isTotal: true
        }
      ];

      const materialHeaders = ['Date', 'Material', 'Brand', 'Qty', 'Unit', 'Price', 'Flt Charge', 'Total', 'Logged By'];
      const materialColumnWidths = [ availableWidth * 0.10, availableWidth * 0.13, availableWidth * 0.11, availableWidth * 0.07, availableWidth * 0.07, availableWidth * 0.10, availableWidth * 0.12, availableWidth * 0.12, availableWidth * 0.18 ];
      drawTable(materialHeaders, materialDataWithTotal, (m) => [
        m.isTotal ? '' : (m.date ? new Date(m.date).toLocaleDateString() : 'N/A'),
        m.material || 'N/A',
        m.isTotal ? '' : (m.brand || 'N/A'),
        m.isTotal ? '' : (m.quantity || 0),
        m.isTotal ? '' : (m.unit || 'N/A'),
        `Rs. ${(m.pricePerUnit || 0).toFixed(0)}`,
        `Rs. ${(m.flightCharge || 0).toFixed(0)}`,
        `Rs. ${(m.totalCost || 0).toFixed(0)}`,
        m.isTotal ? '' : (m.recordedBy?.name || 'N/A'),
      ], materialColumnWidths, 'Material Logs');
      
      const activityHeaders = ['Site Name', 'Date', 'Activity Message', 'Supervisor'];
      const activityColumnWidths = [ availableWidth * 0.20, availableWidth * 0.15, availableWidth * 0.45, availableWidth * 0.20 ];
      const sortedActivityLogs = [...siteReport.activityLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
      drawTable(activityHeaders, sortedActivityLogs, (a) => [
          a.siteName || 'N/A',
          a.date ? new Date(a.date).toLocaleDateString() : 'N/A',
          a.message || 'N/A',
          a.supervisorId?.name || 'N/A',
      ], activityColumnWidths, 'Activity Logs');
      
      const totalRentAmount = siteReport.rentLogs.reduce((sum, r) => sum + (r.amount || 0), 0);

      const sortedRentLogs = [...siteReport.rentLogs].sort((a, b) => new Date(b.rentDate) - new Date(a.rentDate));
      const rentDataWithTotal = [
        ...sortedRentLogs,
        {
          toolsDescription: 'Total',
          amount: totalRentAmount,
          isTotal: true
        }
      ];

      const rentHeaders = ['Date', 'Amount', 'Description', 'Logged By'];
      const rentColumnWidths = [ availableWidth * 0.20, availableWidth * 0.15, availableWidth * 0.45, availableWidth * 0.20 ];
      drawTable(rentHeaders, rentDataWithTotal, (rent) => [
        rent.isTotal ? '' : (rent.rentDate ? new Date(rent.rentDate).toLocaleDateString() : 'N/A'),
        `Rs. ${(rent.amount || 0).toFixed(0)}`,
        rent.toolsDescription || 'N/A',
        rent.isTotal ? '' : (rent.createdBy?.name || 'N/A'),
      ], rentColumnWidths, 'Rent Logs');

      const totalAdvanceAmount = siteReport.advanceLogs.reduce((sum, log) => sum + (log.amount || 0), 0);

      const sortedAdvanceLogs = [...siteReport.advanceLogs].sort((a, b) => new Date(b.date) - new Date(a.date));
      const advanceDataWithTotal = [
        ...sortedAdvanceLogs,
        {
          workerName: 'Total',
          amount: totalAdvanceAmount,
          isTotal: true
        }
      ];

      const advanceHeaders = ['Date', 'Worker Name', 'Amount', 'Reason', 'Recorded By'];
      const advanceColumnWidths = [ availableWidth * 0.15, availableWidth * 0.20, availableWidth * 0.15, availableWidth * 0.30, availableWidth * 0.20 ];
      drawTable(advanceHeaders, advanceDataWithTotal, (adv) => {
        return [
          adv.isTotal ? '' : (adv.date ? new Date(adv.date).toLocaleDateString() : 'N/A'),
          adv.workerName || 'N/A',
          `Rs. ${(adv.amount || 0).toFixed(0)}`,
          adv.isTotal ? '' : (adv.reason || 'N/A'),
          adv.isTotal ? '' : (adv.recordedBy?.name || 'N/A'),
        ];
      }, advanceColumnWidths, 'Advance Payment Logs');
      
      if (siteReport.costSummary) {
        const totalGrossSalaryCost = siteReport.salaryCalculations.reduce((sum, sal) => sum + (sal.grossSalary || 0), 0);
        
        const grandTotal = totalGrossSalaryCost + (siteReport.costSummary.totalMaterialCost || 0) + (siteReport.costSummary.totalRentCost || 0);

        const summaryHeaders = ['Description', 'Amount'];
        const summaryColumnWidths = [ availableWidth * 0.50, availableWidth * 0.50 ];
        
        const summaryData = [
            { description: 'Worker Salaries', amount: `Rs. ${totalGrossSalaryCost.toFixed(0)}` },
            { description: 'Material Logs', amount: `Rs. ${(siteReport.costSummary.totalMaterialCost || 0).toFixed(0)}` },
            { description: 'Rent Logs', amount: `Rs. ${(siteReport.costSummary.totalRentCost || 0).toFixed(0)}` },
            { description: 'Grand Total', amount: `Rs. ${grandTotal.toFixed(0)}` },
        ];
        drawTable(summaryHeaders, summaryData, (item) => [
          item.description,
          item.amount,
        ], summaryColumnWidths, 'Total Costs Summary');
    }
    });

    doc.end();
  });
};

module.exports = {
  generatePdfReport
};
