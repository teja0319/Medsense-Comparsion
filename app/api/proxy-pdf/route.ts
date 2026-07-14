import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    if (!url) {
      return new NextResponse('Missing URL parameter', { status: 400 });
    }

    const decodedUrl = decodeURIComponent(url);
    const response = await fetch(decodedUrl);
    
    if (!response.ok) {
      return new NextResponse('Failed to fetch PDF from source', { status: response.status });
    }

    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        // Optional: enable some basic caching
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('PDF Proxy Error:', error);
    return new NextResponse('Proxy failed', { status: 500 });
  }
}
