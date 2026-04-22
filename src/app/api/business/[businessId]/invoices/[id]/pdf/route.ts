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

    // Dynamically import jspdf (server-side)
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();

    // Parse invoice items
    let items: Array<{ description: string; qty: number; price: number; total: number }> = [];
    try {
      items = typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items;
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

    // Business header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.business.name, 14, 20);

    if (invoice.business.address) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(invoice.business.address, 14, 27);
    }
    if (invoice.business.phone) {
      doc.text(`Tel: ${invoice.business.phone}`, 14, invoice.business.address ? 33 : 27);
    }

    // Invoice title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', 140, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`No: ${invoice.invoiceNumber}`, 140, 27);
    doc.text(`Tanggal: ${new Date(invoice.date).toLocaleDateString('id-ID')}`, 140, 33);

    if (invoice.dueDate) {
      doc.text(`Jatuh Tempo: ${new Date(invoice.dueDate).toLocaleDateString('id-ID')}`, 140, 39);
    }

    // Status badge
    const statusLabel = {
      pending: 'BELUM BAYAR',
      paid: 'LUNAS',
      cancelled: 'DIBATALKAN',
      overdue: 'TERLAMBAT',
    }[invoice.status] || invoice.status.toUpperCase();

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    if (invoice.status === 'paid') {
      doc.setTextColor(22, 163, 74); // green
    } else if (invoice.status === 'overdue') {
      doc.setTextColor(239, 68, 68); // red
    } else {
      doc.setTextColor(245, 158, 11); // yellow/amber
    }
    doc.text(`Status: ${statusLabel}`, 140, invoice.dueDate ? 45 : 39);
    doc.setTextColor(0, 0, 0); // reset

    // Customer info
    const customerY = invoice.business.address && invoice.business.phone ? 43 : (invoice.business.address || invoice.business.phone ? 38 : 33);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Kepada:', 14, customerY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (invoice.customer) {
      doc.text(invoice.customer.name, 14, customerY + 6);
      if (invoice.customer.address) doc.text(invoice.customer.address, 14, customerY + 11);
      if (invoice.customer.email) doc.text(invoice.customer.email, 14, customerY + (invoice.customer.address ? 16 : 11));
      if (invoice.customer.phone) doc.text(invoice.customer.phone, 14, customerY + (invoice.customer.address ? 21 : (invoice.customer.email ? 16 : 11)));
    } else {
      doc.text('-', 14, customerY + 6);
    }

    // Items table
    const tableStartY = customerY + 30;

    (doc as unknown as Record<string, (...args: unknown[]) => void>).autoTable({
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
        fillColor: [30, 41, 59],
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

    const finalY = ((doc as unknown as Record<string, Record<string, number>>).lastAutoTable?.finalY) || tableStartY + 60;

    // Totals section
    const totalsX = 130;
    let totalsY = finalY + 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal:', totalsX, totalsY);
    doc.text(formatCurrency(invoice.subtotal), totalsX + 50, totalsY, { align: 'right' });

    totalsY += 6;
    if (invoice.tax > 0) {
      doc.text(`Pajak:`, totalsX, totalsY);
      doc.text(formatCurrency(invoice.tax), totalsX + 50, totalsY, { align: 'right' });
      totalsY += 6;
    }

    if (invoice.discount > 0) {
      doc.text('Diskon:', totalsX, totalsY);
      doc.text(`-${formatCurrency(invoice.discount)}`, totalsX + 50, totalsY, { align: 'right' });
      totalsY += 6;
    }

    // Separator line
    doc.setDrawColor(30, 41, 59);
    doc.setLineWidth(0.5);
    doc.line(totalsX, totalsY, totalsX + 55, totalsY);
    totalsY += 6;

    // Total
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL:', totalsX, totalsY);
    doc.text(formatCurrency(invoice.total), totalsX + 50, totalsY, { align: 'right' });

    // Notes section
    if (invoice.notes) {
      totalsY += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Catatan:', 14, totalsY);
      doc.setFont('helvetica', 'normal');
      const splitNotes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(splitNotes, 14, totalsY + 5);
    }

    // Footer
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text('Invoice ini dibuat secara otomatis oleh sistem.', 14, pageHeight - 15);
    doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, pageHeight - 10);

    // Generate base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    // Save pdfUrl to database
    await db.businessInvoice.update({
      where: { id: invoice.id },
      data: {
        pdfUrl: `data:application/pdf;base64,${pdfBase64.substring(0, 50)}...`,
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
