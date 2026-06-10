import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

const MEDSENSE_API_BASE = 'https://medsensedev-c5fbg8htfbhtgqck.centralindia-01.azurewebsites.net/api/v1';
const TENANT_ID = 'dev-testing-db64';
const PROJECT_ID = '857d529e-75cf-4210-bea3-ca023a15ed1d';
const API_KEY = 'sk_dev-testing-db64_G_7wqmKjqF8BaPV7-d3JhD0DJhoPrpwV';
const WEBHOOK_URL = 'https://yirahealthcampapidev.azurewebsites.net/api/Account/webhooktest';

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    const currentUser = await usersCollection.findOne({ email: user.email });

    if (currentUser?.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Read the incoming form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Build the external API URL
    const externalUrl = `${MEDSENSE_API_BASE}/tenants/${TENANT_ID}/projects/${PROJECT_ID}/reports?webhook_url=${encodeURIComponent(WEBHOOK_URL)}`;

    // Forward the file to external API
    const externalFormData = new FormData();
    externalFormData.append('file', file);

    const externalResponse = await fetch(externalUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
      },
      body: externalFormData,
    });

    const responseData = await externalResponse.json().catch(() => ({
      status: externalResponse.status,
      statusText: externalResponse.statusText,
    }));

    if (!externalResponse.ok) {
      return NextResponse.json(
        {
          error: 'External API returned an error',
          details: responseData,
          status: externalResponse.status,
        },
        { status: externalResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      data: responseData,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
