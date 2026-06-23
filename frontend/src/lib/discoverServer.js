'use client';

export const discoverServer = async () => {
  const possibleUrls = [
    window.location.hostname,
    'localhost',
    '127.0.0.1',
  ];

  for (const host of possibleUrls) {
    if (!host) continue;
    try {
      const url = `http://${host}:5000/api/health`;
      const response = await fetch(url, { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      if (response.ok) {
        console.log(`✅ Found server at: ${host}`);
        return host;
      }
    } catch (e) {
      console.log(`❌ Could not connect to: ${host}`);
    }
  }
  
  // If no server found, use the configured one
  return window.location.hostname;
};
