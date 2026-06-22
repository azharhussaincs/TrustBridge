'use client';

export const discoverServer = async () => {
  // Try to connect to the server using different methods
  const possibleUrls = [
    // Try the current hostname
    window.location.hostname,
    // Try localhost
    'localhost',
    // Try the network IP (will be set by environment)
    process.env.NEXT_PUBLIC_SERVER_IP || '',
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
  return process.env.NEXT_PUBLIC_SERVER_IP || window.location.hostname;
};
