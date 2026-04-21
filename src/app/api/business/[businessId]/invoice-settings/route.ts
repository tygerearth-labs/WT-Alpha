import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

async function verifyBusinessOwnership(businessId: string, userId: string) {
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
  });
  return !!business;
}

const DEFAULT_SETTINGS = {
  template: 'modern',
  primaryColor: '#1E293B',
  secondaryColor: '#BB86FC',
  logoUrl: null,
  signatureUrl: null,
  businessName: null,
  businessAddress: null,
  businessPhone: null,
  businessEmail: null,
  businessWebsite: null,
  footerText: null,
  termsText: null,
  bankName: null,
  bankAccount: null,
  bankHolder: null,
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const settings = await db.invoiceSettings.findUnique({
      where: { businessId },
    });

    if (!settings) {
      return NextResponse.json({
        settings: { businessId, ...DEFAULT_SETTINGS },
        isDefault: true,
      });
    }

    return NextResponse.json({ settings, isDefault: false });
  } catch (error) {
    console.error('InvoiceSettings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice settings' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      template,
      primaryColor,
      secondaryColor,
      logoUrl,
      signatureUrl,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      businessWebsite,
      footerText,
      termsText,
      bankName,
      bankAccount,
      bankHolder,
    } = body;

    // Build the data object, only including fields that were explicitly provided
    const data: Record<string, unknown> = { businessId };

    if (template !== undefined) data.template = template;
    if (primaryColor !== undefined) data.primaryColor = primaryColor;
    if (secondaryColor !== undefined) data.secondaryColor = secondaryColor;
    if (logoUrl !== undefined) data.logoUrl = logoUrl;
    if (signatureUrl !== undefined) data.signatureUrl = signatureUrl;
    if (businessName !== undefined) data.businessName = businessName;
    if (businessAddress !== undefined) data.businessAddress = businessAddress;
    if (businessPhone !== undefined) data.businessPhone = businessPhone;
    if (businessEmail !== undefined) data.businessEmail = businessEmail;
    if (businessWebsite !== undefined) data.businessWebsite = businessWebsite;
    if (footerText !== undefined) data.footerText = footerText;
    if (termsText !== undefined) data.termsText = termsText;
    if (bankName !== undefined) data.bankName = bankName;
    if (bankAccount !== undefined) data.bankAccount = bankAccount;
    if (bankHolder !== undefined) data.bankHolder = bankHolder;

    const settings = await db.invoiceSettings.upsert({
      where: { businessId },
      update: data,
      create: { businessId, ...data },
    });

    return NextResponse.json({ settings }, { status: 201 });
  } catch (error) {
    console.error('InvoiceSettings POST error:', error);
    return NextResponse.json(
      { error: 'Failed to upsert invoice settings' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult;

    const { businessId } = await params;

    const ownsBusiness = await verifyBusinessOwnership(businessId, userId);
    if (!ownsBusiness) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      );
    }

    // Verify that settings exist before updating
    const existing = await db.invoiceSettings.findUnique({
      where: { businessId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Invoice settings not found. Use POST to create.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      template,
      primaryColor,
      secondaryColor,
      logoUrl,
      signatureUrl,
      businessName,
      businessAddress,
      businessPhone,
      businessEmail,
      businessWebsite,
      footerText,
      termsText,
      bankName,
      bankAccount,
      bankHolder,
    } = body;

    // Build the update object, only including fields that were explicitly provided
    const updateData: Record<string, unknown> = {};

    if (template !== undefined) updateData.template = template;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (signatureUrl !== undefined) updateData.signatureUrl = signatureUrl;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (businessAddress !== undefined) updateData.businessAddress = businessAddress;
    if (businessPhone !== undefined) updateData.businessPhone = businessPhone;
    if (businessEmail !== undefined) updateData.businessEmail = businessEmail;
    if (businessWebsite !== undefined) updateData.businessWebsite = businessWebsite;
    if (footerText !== undefined) updateData.footerText = footerText;
    if (termsText !== undefined) updateData.termsText = termsText;
    if (bankName !== undefined) updateData.bankName = bankName;
    if (bankAccount !== undefined) updateData.bankAccount = bankAccount;
    if (bankHolder !== undefined) updateData.bankHolder = bankHolder;

    const settings = await db.invoiceSettings.update({
      where: { businessId },
      data: updateData,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('InvoiceSettings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice settings' },
      { status: 500 }
    );
  }
}
