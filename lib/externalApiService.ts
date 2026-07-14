export async function sendFileToExternalApi(buffer: Buffer, filename: string, webhookUrl: string, projectId: string) {
  // Construct FormData
  const formData = new FormData();
  
  // Next.js (Node >= 18) handles File and Blob natively
  const blob = new Blob([new Uint8Array(buffer)], { type: 'application/pdf' });
  formData.append('file', blob, filename);

  const targetUrl = new URL(`https://medsenseqa-caemg7c6h6azhadc.centralindia-01.azurewebsites.net//api/v1/tenants/dev-testing-db64/projects/${projectId}/reports`);
  targetUrl.searchParams.append('webhook_url', webhookUrl);

  const response = await fetch(targetUrl.toString(), {
    method: 'POST',
    headers: {
      'X-API-Key': 'sk_dev-testing-db64_G_7wqmKjqF8BaPV7-d3JhD0DJhoPrpwV',
      'Accept': 'application/json'
    },
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API responded with status ${response.status}: ${errorText}`);
  }

  return await response.json();
}
