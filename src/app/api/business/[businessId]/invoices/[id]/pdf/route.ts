import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyInvoiceOwnership(id: string, userId: string) {
  const invoice = await db.businessInvoice.findFirst({
    where: { id },
    include: {
      business: {
        select: { userId: true, name: true, address: true, phone: true },
      },
      customer: true,
    },
  });
  return invoice?.business.userId === userId ? invoice : null;
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 30, g: 41, b: 59 };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string; id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { id } = await params;

    const invoice = await verifyInvoiceOwnership(id, userId);
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }

    // Fetch invoice settings
    const invoiceSettings = await db.invoiceSettings.findUnique({
      where: { businessId: invoice.businessId },
    });

    // Fetch bank accounts from BusinessBankAccount table
    const bankAccounts = await db.businessBankAccount.findMany({
      where: { businessId: invoice.businessId },
      orderBy: [{ isDefault: 'desc' }, { displayOrder: 'asc' }],
    });

    // Extract settings with defaults
    const settings = {
      template: invoiceSettings?.template || 'modern',
      primaryColor: invoiceSettings?.primaryColor || '#1E293B',
      secondaryColor: invoiceSettings?.secondaryColor || '#BB86FC',
      logoUrl: invoiceSettings?.logoUrl || null,
      signatureUrl: invoiceSettings?.signatureUrl || null,
      businessName: invoiceSettings?.businessName || null,
      businessAddress: invoiceSettings?.businessAddress || null,
      businessPhone: invoiceSettings?.businessPhone || null,
      businessEmail: invoiceSettings?.businessEmail || null,
      businessWebsite: invoiceSettings?.businessWebsite || null,
      footerText: invoiceSettings?.footerText || null,
      termsText: invoiceSettings?.termsText || null,
      bankName: invoiceSettings?.bankName || null,
      bankAccount: invoiceSettings?.bankAccount || null,
      bankHolder: invoiceSettings?.bankHolder || null,
    };

    // Resolve business info: settings override business model
    const displayName = settings.businessName || invoice.business.name;
    const displayAddress = settings.businessAddress || invoice.business.address;
    const displayPhone = settings.businessPhone || invoice.business.phone;
    const displayEmail = settings.businessEmail || null;
    const displayWebsite = settings.businessWebsite || null;

    // Colors
    const primary = hexToRgb(settings.primaryColor);
    const secondary = hexToRgb(settings.secondaryColor);

    // Dynamically import jspdf + autotable (server-side)
    // jspdf-autotable v5: use standalone autoTable(doc, options) function
    const { jsPDF } = await import('jspdf');
    const autoTableModule = await import('jspdf-autotable');
    const autoTable = (autoTableModule as unknown as { default: (doc: unknown, options: Record<string, unknown>) => void }).default;

    const doc = new jsPDF();

    // Parse invoice items
    let items: Array<{
      description: string;
      qty: number;
      price: number;
      total: number;
    }> = [];
    try {
      items =
        typeof invoice.items === 'string'
          ? JSON.parse(invoice.items)
          : invoice.items;
    } catch {
      items = [];
    }

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(val);
    };

    // Compute tax and discount amounts from percentages
    const taxAmount = invoice.subtotal * (invoice.tax || 0) / 100;
    const discountAmount = invoice.subtotal * (invoice.discount || 0) / 100;

    // Helper to get finalY after autoTable
    const getLastAutoTableY = (fallback: number) => {
      try {
        return ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY) || fallback;
      } catch {
        return fallback;
      }
    };

    // ──────────────────────────────────────
    // TEMPLATE VARIANTS
    // ──────────────────────────────────────

    if (settings.template === 'classic') {
      // ─── CLASSIC TEMPLATE ───
      // Centered header, serif-style bold fonts, double-line separators

      // Logo
      if (settings.logoUrl?.startsWith('data:')) {
        try {
          doc.addImage(settings.logoUrl, 'PNG', 80, 10, 25, 25);
        } catch {}
      }

      // Centered business name
      const headerStartY = settings.logoUrl?.startsWith('data:') ? 42 : 20;
      doc.setFontSize(20);
      doc.setFont('times', 'bold');
      doc.text(displayName, 105, headerStartY, { align: 'center' });

      if (displayAddress) {
        doc.setFontSize(10);
        doc.setFont('times', 'normal');
        doc.text(displayAddress, 105, headerStartY + 7, {
          align: 'center',
        });
      }
      let infoY = headerStartY + (displayAddress ? 12 : 7);
      if (displayPhone) {
        doc.text(`Tel: ${displayPhone}`, 105, infoY, { align: 'center' });
        infoY += 5;
      }
      if (displayEmail) {
        doc.text(displayEmail, 105, infoY, { align: 'center' });
        infoY += 5;
      }
      if (displayWebsite) {
        doc.text(displayWebsite, 105, infoY, { align: 'center' });
        infoY += 5;
      }

      // Double-line separator
      infoY += 3;
      doc.setDrawColor(primary.r, primary.g, primary.b);
      doc.setLineWidth(1.0);
      doc.line(14, infoY, 196, infoY);
      doc.setLineWidth(0.3);
      doc.line(14, infoY + 2, 196, infoY + 2);

      // Invoice title centered
      infoY += 12;
      doc.setFontSize(16);
      doc.setFont('times', 'bold');
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text('INVOICE', 105, infoY, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Invoice details centered below title
      infoY += 8;
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      doc.text(`No: ${invoice.invoiceNumber}`, 105, infoY, {
        align: 'center',
      });
      infoY += 5;
      doc.text(
        `Tanggal: ${new Date(invoice.date).toLocaleDateString('id-ID')}`,
        105,
        infoY,
        { align: 'center' }
      );
      if (invoice.dueDate) {
        infoY += 5;
        doc.text(
          `Jatuh Tempo: ${new Date(invoice.dueDate).toLocaleDateString('id-ID')}`,
          105,
          infoY,
          { align: 'center' }
        );
      }

      // Status badge (centered)
      infoY += 7;
      const statusLabel = {
        pending: 'BELUM BAYAR',
        paid: 'LUNAS',
        cancelled: 'DIBATALKAN',
        overdue: 'TERLAMBAT',
      }[invoice.status] || invoice.status.toUpperCase();

      doc.setFontSize(10);
      doc.setFont('times', 'bold');
      if (invoice.status === 'paid') {
        doc.setTextColor(22, 163, 74);
      } else if (invoice.status === 'overdue') {
        doc.setTextColor(239, 68, 68);
      } else {
        doc.setTextColor(245, 158, 11);
      }
      doc.text(`Status: ${statusLabel}`, 105, infoY, { align: 'center' });
      doc.setTextColor(0, 0, 0);

      // Customer info
      const customerY = infoY + 10;
      doc.setFontSize(11);
      doc.setFont('times', 'bold');
      doc.text('Kepada:', 14, customerY);
      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      if (invoice.customer) {
        doc.text(invoice.customer.name, 14, customerY + 6);
        if (invoice.customer.address)
          doc.text(invoice.customer.address, 14, customerY + 11);
        if (invoice.customer.email)
          doc.text(
            invoice.customer.email,
            14,
            customerY + (invoice.customer.address ? 16 : 11)
          );
        if (invoice.customer.phone)
          doc.text(
            invoice.customer.phone,
            14,
            customerY +
              (invoice.customer.address
                ? 21
                : invoice.customer.email
                  ? 16
                  : 11)
          );
      } else {
        doc.text('-', 14, customerY + 6);
      }

      // Double-line before table
      const tableStartY = customerY + 30;
      doc.setDrawColor(primary.r, primary.g, primary.b);
      doc.setLineWidth(0.5);
      doc.line(14, tableStartY - 4, 196, tableStartY - 4);
      doc.setLineWidth(0.2);
      doc.line(14, tableStartY - 2, 196, tableStartY - 2);

      // Items table
      autoTable(doc, {
        startY: tableStartY,
        head: [['No', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: items.map((item, index) => [
          index + 1,
          item.description || '-',
          item.qty || 0,
          formatCurrency(item.price || 0),
          formatCurrency(item.total || 0),
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3,
          font: 'times',
        },
        headStyles: {
          fillColor: [primary.r, primary.g, primary.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          font: 'times',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'right', cellWidth: 40 },
          4: { halign: 'right', cellWidth: 45 },
        },
      });

      const finalY = getLastAutoTableY(tableStartY + 60);

      // Totals section
      const totalsX = 130;
      let totalsY = finalY + 10;

      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      doc.text('Subtotal:', totalsX, totalsY);
      doc.text(formatCurrency(invoice.subtotal), totalsX + 50, totalsY, {
        align: 'right',
      });
      totalsY += 6;

      if (invoice.tax > 0) {
        doc.text(`Pajak (${invoice.tax}%):`, totalsX, totalsY);
        doc.text(formatCurrency(taxAmount), totalsX + 50, totalsY, {
          align: 'right',
        });
        totalsY += 6;
      }

      if (invoice.discount > 0) {
        doc.text(`Diskon (${invoice.discount}%):`, totalsX, totalsY);
        doc.text(`-${formatCurrency(discountAmount)}`, totalsX + 50, totalsY, {
          align: 'right',
        });
        totalsY += 6;
      }

      // Double-line separator
      doc.setDrawColor(primary.r, primary.g, primary.b);
      doc.setLineWidth(1.0);
      doc.line(totalsX, totalsY, totalsX + 55, totalsY);
      doc.setLineWidth(0.3);
      doc.line(totalsX, totalsY + 1.5, totalsX + 55, totalsY + 1.5);
      totalsY += 7;

      // Total
      doc.setFontSize(12);
      doc.setFont('times', 'bold');
      doc.text('TOTAL:', totalsX, totalsY);
      doc.text(formatCurrency(invoice.total), totalsX + 50, totalsY, {
        align: 'right',
      });

      // Payment info - use BusinessBankAccount records if available, fallback to InvoiceSettings
      let paymentY = totalsY + 15;
      const hasBanks = bankAccounts.length > 0;
      const hasLegacyBank = settings.bankName || settings.bankAccount;
      if (hasBanks || hasLegacyBank) {
        doc.setFontSize(11);
        doc.setFont('times', 'bold');
        doc.text('Informasi Pembayaran:', 14, paymentY);
        doc.setFont('times', 'normal');
        doc.setFontSize(9);
        if (hasBanks) {
          let bankLineY = paymentY + 6;
          for (let i = 0; i < bankAccounts.length; i++) {
            const ba = bankAccounts[i];
            const prefix = bankAccounts.length > 1 ? `${i + 1}. ` : '';
            doc.text(`Bank: ${prefix}${ba.bankName}`, 14, bankLineY);
            bankLineY += 5;
            doc.text(`No. Rekening: ${ba.accountNumber}`, 14, bankLineY);
            bankLineY += 5;
            doc.text(`Atas Nama: ${ba.accountHolder}`, 14, bankLineY);
            bankLineY += 7;
          }
          paymentY = bankLineY;
        } else {
          if (settings.bankName) {
            doc.text(`Bank: ${settings.bankName}`, 14, paymentY + 6);
          }
          if (settings.bankAccount) {
            doc.text(
              `No. Rekening: ${settings.bankAccount}`,
              14,
              paymentY + 11
            );
          }
          if (settings.bankHolder) {
            doc.text(
              `Atas Nama: ${settings.bankHolder}`,
              14,
              paymentY + 16
            );
          }
          paymentY += 25;
        }
      }

      // Notes section
      if (invoice.notes) {
        const notesY = paymentY;
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text('Catatan:', 14, notesY);
        doc.setFont('times', 'normal');
        const splitNotes = doc.splitTextToSize(invoice.notes, 170);
        doc.text(splitNotes, 14, notesY + 5);
        paymentY += 5 + splitNotes.length * 5;
      }

      // Terms section
      if (settings.termsText) {
        const termsY = paymentY + 5;
        doc.setFontSize(10);
        doc.setFont('times', 'bold');
        doc.text('Syarat & Ketentuan:', 14, termsY);
        doc.setFont('times', 'normal');
        doc.setFontSize(8);
        const splitTerms = doc.splitTextToSize(settings.termsText, 170);
        doc.text(splitTerms, 14, termsY + 5);
      }

      // Signature
      const pageHeight = doc.internal.pageSize.height;
      if (settings.signatureUrl?.startsWith('data:')) {
        const finalFooterY = pageHeight - 45;
        try {
          doc.addImage(
            settings.signatureUrl,
            'PNG',
            140,
            finalFooterY - 20,
            40,
            20
          );
        } catch {}
        doc.setFontSize(9);
        doc.setFont('times', 'normal');
        doc.text('Hormat kami,', 148, finalFooterY + 5);
      }

      // Double-line at bottom
      doc.setDrawColor(primary.r, primary.g, primary.b);
      doc.setLineWidth(0.5);
      doc.line(14, pageHeight - 25, 196, pageHeight - 25);
      doc.setLineWidth(0.2);
      doc.line(14, pageHeight - 23, 196, pageHeight - 23);

      // Footer
      doc.setFontSize(8);
      doc.setFont('times', 'italic');
      doc.setTextColor(128, 128, 128);
      const footerMsg =
        settings.footerText || 'Invoice ini dibuat secara otomatis oleh sistem.';
      doc.text(footerMsg, 105, pageHeight - 18, { align: 'center' });
      doc.text(
        `Dicetak: ${new Date().toLocaleString('id-ID')}`,
        105,
        pageHeight - 13,
        { align: 'center' }
      );
      doc.setTextColor(0, 0, 0);
    } else if (settings.template === 'minimal') {
      // ─── MINIMAL TEMPLATE ───
      // Very clean, lots of white space, thin lines, minimal decoration

      // Logo (small, top-left)
      if (settings.logoUrl?.startsWith('data:')) {
        try {
          doc.addImage(settings.logoUrl, 'PNG', 14, 10, 20, 20);
        } catch {}
      }

      const logoOffset = settings.logoUrl?.startsWith('data:') ? 10 : 0;

      // Business name - light weight
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(displayName, 14 + logoOffset, 20);

      // Business info - thin, subtle
      let infoY = 26;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      if (displayAddress) {
        doc.text(displayAddress, 14 + logoOffset, infoY);
        infoY += 4;
      }
      if (displayPhone) {
        doc.text(`Tel: ${displayPhone}`, 14 + logoOffset, infoY);
        infoY += 4;
      }
      if (displayEmail) {
        doc.text(displayEmail, 14 + logoOffset, infoY);
        infoY += 4;
      }
      if (displayWebsite) {
        doc.text(displayWebsite, 14 + logoOffset, infoY);
        infoY += 4;
      }
      doc.setTextColor(0, 0, 0);

      // Thin line separator
      infoY += 4;
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(14, infoY, 196, infoY);

      // Invoice title + details - right aligned, minimal
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const invTitleY = 20;
      doc.setFont('helvetica', 'bold');
      doc.text(invoice.invoiceNumber, 196, invTitleY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(
        new Date(invoice.date).toLocaleDateString('id-ID'),
        196,
        invTitleY + 5,
        { align: 'right' }
      );
      if (invoice.dueDate) {
        doc.text(
          `Jatuh Tempo: ${new Date(invoice.dueDate).toLocaleDateString('id-ID')}`,
          196,
          invTitleY + 10,
          { align: 'right' }
        );
      }

      // Status - small pill-like, subtle
      const statusLabel = {
        pending: 'BELUM BAYAR',
        paid: 'LUNAS',
        cancelled: 'DIBATALKAN',
        overdue: 'TERLAMBAT',
      }[invoice.status] || invoice.status.toUpperCase();

      const statusY = invTitleY + (invoice.dueDate ? 16 : 11);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      if (invoice.status === 'paid') {
        doc.setTextColor(22, 163, 74);
      } else if (invoice.status === 'overdue') {
        doc.setTextColor(239, 68, 68);
      } else {
        doc.setTextColor(180, 140, 20);
      }
      doc.text(statusLabel, 196, statusY, { align: 'right' });
      doc.setTextColor(0, 0, 0);

      // Customer info - clean, minimal spacing
      const customerY = infoY + 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Bill To', 14, customerY);
      doc.setFont('helvetica', 'normal');
      if (invoice.customer) {
        doc.setFontSize(9);
        doc.text(invoice.customer.name, 14, customerY + 5);
        if (invoice.customer.address)
          doc.text(invoice.customer.address, 14, customerY + 9);
        if (invoice.customer.email)
          doc.text(
            invoice.customer.email,
            14,
            customerY + (invoice.customer.address ? 13 : 9)
          );
        if (invoice.customer.phone)
          doc.text(
            invoice.customer.phone,
            14,
            customerY +
              (invoice.customer.address
                ? 17
                : invoice.customer.email
                  ? 13
                  : 9)
          );
      } else {
        doc.text('-', 14, customerY + 5);
      }

      // Items table - no header background, just underlined headers
      const tableStartY = customerY + 25;

      autoTable(doc, {
        startY: tableStartY,
        head: [['No', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: items.map((item, index) => [
          index + 1,
          item.description || '-',
          item.qty || 0,
          formatCurrency(item.price || 0),
          formatCurrency(item.total || 0),
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3,
          lineColor: [230, 230, 230],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [255, 255, 255],
          textColor: [80, 80, 80],
          fontStyle: 'bold',
          lineWidth: { bottom: 0.3 },
          lineColor: [80, 80, 80],
        },
        alternateRowStyles: {
          fillColor: [252, 252, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'right', cellWidth: 40 },
          4: { halign: 'right', cellWidth: 45 },
        },
      });

      const finalY = getLastAutoTableY(tableStartY + 60);

      // Totals section - clean, right-aligned
      const totalsX = 135;
      let totalsY = finalY + 8;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal', totalsX, totalsY);
      doc.text(formatCurrency(invoice.subtotal), totalsX + 45, totalsY, {
        align: 'right',
      });
      totalsY += 5;

      if (invoice.tax > 0) {
        doc.text(`Pajak (${invoice.tax}%)`, totalsX, totalsY);
        doc.text(formatCurrency(taxAmount), totalsX + 45, totalsY, {
          align: 'right',
        });
        totalsY += 5;
      }

      if (invoice.discount > 0) {
        doc.text(`Diskon (${invoice.discount}%)`, totalsX, totalsY);
        doc.text(
          `-${formatCurrency(discountAmount)}`,
          totalsX + 45,
          totalsY,
          { align: 'right' }
        );
        totalsY += 5;
      }

      // Thin line
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      doc.line(totalsX, totalsY, totalsX + 45, totalsY);
      totalsY += 6;

      // Total - accent color
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text('Total', totalsX, totalsY);
      doc.text(formatCurrency(invoice.total), totalsX + 45, totalsY, {
        align: 'right',
      });
      doc.setTextColor(0, 0, 0);

      // Payment info - minimal style, use BusinessBankAccount if available
      let paymentY = totalsY + 15;
      const hasBankAccounts = bankAccounts.length > 0;
      const hasLegacyBanks = settings.bankName || settings.bankAccount;
      if (hasBankAccounts || hasLegacyBanks) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(14, paymentY - 4, 196, paymentY - 4);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Informasi Pembayaran', 14, paymentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        if (hasBankAccounts) {
          let bankLineY = paymentY + 5;
          for (let i = 0; i < bankAccounts.length; i++) {
            const ba = bankAccounts[i];
            const prefix = bankAccounts.length > 1 ? `${i + 1}. ` : '';
            doc.text(`Bank: ${prefix}${ba.bankName}`, 14, bankLineY);
            bankLineY += 4;
            doc.text(`No. Rekening: ${ba.accountNumber}`, 14, bankLineY);
            bankLineY += 4;
            doc.text(`Atas Nama: ${ba.accountHolder}`, 14, bankLineY);
            bankLineY += 5;
          }
          paymentY = bankLineY + 3;
        } else {
          if (settings.bankName) {
            doc.text(`Bank: ${settings.bankName}`, 14, paymentY + 5);
          }
          if (settings.bankAccount) {
            doc.text(
              `No. Rekening: ${settings.bankAccount}`,
              14,
              paymentY + 9
            );
          }
          if (settings.bankHolder) {
            doc.text(
              `Atas Nama: ${settings.bankHolder}`,
              14,
              paymentY + 13
            );
          }
          paymentY += 22;
        }
        doc.setTextColor(0, 0, 0);
      }

      // Notes section
      if (invoice.notes) {
        const notesY = paymentY + 3;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(14, notesY - 3, 196, notesY - 3);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Catatan', 14, notesY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const splitNotes = doc.splitTextToSize(invoice.notes, 170);
        doc.text(splitNotes, 14, notesY + 5);
        doc.setTextColor(0, 0, 0);
        paymentY += 5 + splitNotes.length * 4;
      }

      // Terms section
      if (settings.termsText) {
        const termsY = paymentY + 3;
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.2);
        doc.line(14, termsY - 3, 196, termsY - 3);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('Syarat & Ketentuan', 14, termsY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        const splitTerms = doc.splitTextToSize(settings.termsText, 170);
        doc.text(splitTerms, 14, termsY + 5);
        doc.setTextColor(0, 0, 0);
      }

      // Signature
      const pageHeight = doc.internal.pageSize.height;
      if (settings.signatureUrl?.startsWith('data:')) {
        const finalFooterY = pageHeight - 45;
        try {
          doc.addImage(
            settings.signatureUrl,
            'PNG',
            145,
            finalFooterY - 20,
            35,
            18
          );
        } catch {}
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text('Hormat kami,', 152, finalFooterY + 3);
        doc.setTextColor(0, 0, 0);
      }

      // Footer - very minimal
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.2);
      doc.line(14, pageHeight - 20, 196, pageHeight - 20);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(170, 170, 170);
      const footerMsg =
        settings.footerText || 'Invoice ini dibuat secara otomatis oleh sistem.';
      doc.text(footerMsg, 105, pageHeight - 14, { align: 'center' });
      doc.text(
        `Dicetak: ${new Date().toLocaleString('id-ID')}`,
        105,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.setTextColor(0, 0, 0);
    } else {
      // ─── MODERN TEMPLATE (DEFAULT) ───
      // Colored header band, modern fonts, accent colors

      // Header band background
      doc.setFillColor(primary.r, primary.g, primary.b);
      doc.rect(0, 0, 210, 50, 'F');

      // Logo on header band
      if (settings.logoUrl?.startsWith('data:')) {
        try {
          doc.addImage(settings.logoUrl, 'PNG', 14, 10, 25, 25);
        } catch {}
      }

      const logoOffset = settings.logoUrl?.startsWith('data:') ? 32 : 0;

      // Business name on header band
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text(displayName, 14 + logoOffset, 20);

      // Business info on header band
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      if (displayAddress) {
        doc.text(displayAddress, 14 + logoOffset, 27);
      }
      const infoY = displayAddress ? 32 : 27;
      if (displayPhone) {
        doc.text(`Tel: ${displayPhone}`, 14 + logoOffset, infoY);
      }
      if (displayEmail) {
        doc.text(displayEmail, 14 + logoOffset, infoY + (displayPhone ? 5 : 0));
      }
      if (displayWebsite) {
        const webOffset = infoY + (displayPhone ? 5 : 0) + (displayEmail ? 5 : 0);
        doc.text(displayWebsite, 14 + logoOffset, webOffset);
      }

      // Invoice title on header band (right)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('INVOICE', 140, 20);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`No: ${invoice.invoiceNumber}`, 140, 27);
      doc.text(
        `Tanggal: ${new Date(invoice.date).toLocaleDateString('id-ID')}`,
        140,
        33
      );

      if (invoice.dueDate) {
        doc.text(
          `Jatuh Tempo: ${new Date(invoice.dueDate).toLocaleDateString('id-ID')}`,
          140,
          39
        );
      }

      // Status badge on header band
      const statusLabel = {
        pending: 'BELUM BAYAR',
        paid: 'LUNAS',
        cancelled: 'DIBATALKAN',
        overdue: 'TERLAMBAT',
      }[invoice.status] || invoice.status.toUpperCase();

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      if (invoice.status === 'paid') {
        doc.setTextColor(134, 239, 172);
      } else if (invoice.status === 'overdue') {
        doc.setTextColor(252, 165, 165);
      } else {
        doc.setTextColor(253, 224, 71);
      }
      doc.text(
        `Status: ${statusLabel}`,
        140,
        invoice.dueDate ? 45 : 39
      );
      doc.setTextColor(0, 0, 0);

      // Accent line under header
      doc.setDrawColor(secondary.r, secondary.g, secondary.b);
      doc.setLineWidth(2);
      doc.line(0, 50, 210, 50);

      // Customer info
      const customerY = 60;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Kepada:', 14, customerY);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (invoice.customer) {
        doc.text(invoice.customer.name, 14, customerY + 6);
        if (invoice.customer.address)
          doc.text(invoice.customer.address, 14, customerY + 11);
        if (invoice.customer.email)
          doc.text(
            invoice.customer.email,
            14,
            customerY + (invoice.customer.address ? 16 : 11)
          );
        if (invoice.customer.phone)
          doc.text(
            invoice.customer.phone,
            14,
            customerY +
              (invoice.customer.address
                ? 21
                : invoice.customer.email
                  ? 16
                  : 11)
          );
      } else {
        doc.text('-', 14, customerY + 6);
      }

      // Items table
      const tableStartY = customerY + 30;

      autoTable(doc, {
        startY: tableStartY,
        head: [['No', 'Deskripsi', 'Qty', 'Harga', 'Total']],
        body: items.map((item, index) => [
          index + 1,
          item.description || '-',
          item.qty || 0,
          formatCurrency(item.price || 0),
          formatCurrency(item.total || 0),
        ]),
        styles: {
          fontSize: 9,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [primary.r, primary.g, primary.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 },
          1: { cellWidth: 70 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'right', cellWidth: 40 },
          4: { halign: 'right', cellWidth: 45 },
        },
      });

      const finalY = getLastAutoTableY(tableStartY + 60);

      // Totals section
      const totalsX = 130;
      let totalsY = finalY + 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Subtotal:', totalsX, totalsY);
      doc.text(formatCurrency(invoice.subtotal), totalsX + 50, totalsY, {
        align: 'right',
      });

      totalsY += 6;
      if (invoice.tax > 0) {
        doc.text(`Pajak (${invoice.tax}%):`, totalsX, totalsY);
        doc.text(formatCurrency(taxAmount), totalsX + 50, totalsY, {
          align: 'right',
        });
        totalsY += 6;
      }

      if (invoice.discount > 0) {
        doc.text(`Diskon (${invoice.discount}%):`, totalsX, totalsY);
        doc.text(
          `-${formatCurrency(discountAmount)}`,
          totalsX + 50,
          totalsY,
          { align: 'right' }
        );
        totalsY += 6;
      }

      // Separator line with primary color
      doc.setDrawColor(primary.r, primary.g, primary.b);
      doc.setLineWidth(0.5);
      doc.line(totalsX, totalsY, totalsX + 55, totalsY);
      totalsY += 6;

      // Total - primary color
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primary.r, primary.g, primary.b);
      doc.text('TOTAL:', totalsX, totalsY);
      doc.text(formatCurrency(invoice.total), totalsX + 50, totalsY, {
        align: 'right',
      });
      doc.setTextColor(0, 0, 0);

      // Payment info - use BusinessBankAccount if available
      let paymentY = totalsY + 15;
      const hasModernBanks = bankAccounts.length > 0;
      const hasModernLegacyBanks = settings.bankName || settings.bankAccount;
      if (hasModernBanks || hasModernLegacyBanks) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Informasi Pembayaran:', 14, paymentY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        if (hasModernBanks) {
          let bankLineY = paymentY + 6;
          for (let i = 0; i < bankAccounts.length; i++) {
            const ba = bankAccounts[i];
            const prefix = bankAccounts.length > 1 ? `${i + 1}. ` : '';
            doc.text(`Bank: ${prefix}${ba.bankName}`, 14, bankLineY);
            bankLineY += 5;
            doc.text(`No. Rekening: ${ba.accountNumber}`, 14, bankLineY);
            bankLineY += 5;
            doc.text(`Atas Nama: ${ba.accountHolder}`, 14, bankLineY);
            bankLineY += 7;
          }
          paymentY = bankLineY;
        } else {
          if (settings.bankName) {
            doc.text(`Bank: ${settings.bankName}`, 14, paymentY + 6);
          }
          if (settings.bankAccount) {
            doc.text(
              `No. Rekening: ${settings.bankAccount}`,
              14,
              paymentY + 11
            );
          }
          if (settings.bankHolder) {
            doc.text(
              `Atas Nama: ${settings.bankHolder}`,
              14,
              paymentY + 16
            );
          }
          paymentY += 25;
        }
      }

      // Notes section
      if (invoice.notes) {
        const notesY = paymentY;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Catatan:', 14, notesY);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(invoice.notes, 170);
        doc.text(splitNotes, 14, notesY + 5);
        paymentY += 5 + splitNotes.length * 5;
      }

      // Terms section
      if (settings.termsText) {
        const termsY = paymentY + 5;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Syarat & Ketentuan:', 14, termsY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const splitTerms = doc.splitTextToSize(settings.termsText, 170);
        doc.text(splitTerms, 14, termsY + 5);
      }

      // Signature
      const pageHeight = doc.internal.pageSize.height;
      if (settings.signatureUrl?.startsWith('data:')) {
        const finalFooterY = pageHeight - 45;
        try {
          doc.addImage(
            settings.signatureUrl,
            'PNG',
            140,
            finalFooterY - 20,
            40,
            20
          );
        } catch {}
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Hormat kami,', 148, finalFooterY + 5);
      }

      // Footer with secondary accent line
      doc.setDrawColor(secondary.r, secondary.g, secondary.b);
      doc.setLineWidth(1);
      doc.line(0, pageHeight - 22, 210, pageHeight - 22);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      const footerMsg =
        settings.footerText || 'Invoice ini dibuat secara otomatis oleh sistem.';
      doc.text(footerMsg, 14, pageHeight - 15);
      doc.text(
        `Dicetak: ${new Date().toLocaleString('id-ID')}`,
        14,
        pageHeight - 10
      );
      doc.setTextColor(0, 0, 0);
    }

    // Generate base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // Save pdfUrl to database (store a reasonable length indicator)
    await db.businessInvoice.update({
      where: { id: invoice.id },
      data: {
        pdfUrl: `generated:${new Date().toISOString()}`,
      },
    });

    return NextResponse.json({
      pdfBase64,
      invoiceNumber: invoice.invoiceNumber,
      fileName: `Invoice_${invoice.invoiceNumber}.pdf`,
    });
  } catch (error) {
    console.error('Invoice PDF GET error:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice PDF' },
      { status: 500 }
    );
  }
}
