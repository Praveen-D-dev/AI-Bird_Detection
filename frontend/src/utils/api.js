// Dynamic API base URL resolver with automatic protocol correction and self-healing fallback
export const getApiUrl = (path) => {
  if (!path) return '';
  // Pass-through for full absolute URLs (e.g. Cloudinary)
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const hostname = window.location.hostname;
  const protocol = window.location.protocol; // 'http:' or 'https:'
  
  let base;
  
  if (import.meta.env.VITE_API_URL) {
    let envUrl = import.meta.env.VITE_API_URL.trim();
    
    // Auto-fix: if the URL is just an internal service name (no dots), append the Render domain
    if (!envUrl.includes('.') && envUrl.length > 0 && !envUrl.includes('localhost')) {
      envUrl = `${envUrl}.onrender.com`;
    }
    
    // 1. Check if the environment variable doesn't start with http:// or https://
    if (!/^https?:\/\//i.test(envUrl)) {
      // If it looks like a local address, use http, otherwise match the site's protocol (or force https if not local)
      const isLocalEnv = envUrl.includes('localhost') || envUrl.includes('127.0.0.1');
      const proto = isLocalEnv ? 'http:' : protocol;
      envUrl = `${proto}//${envUrl}`;
    }
    
    // 2. If the current site is loaded over HTTPS, force HTTPS for the API endpoint (unless it's localhost)
    if (protocol === 'https:' && envUrl.startsWith('http://') && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
      envUrl = envUrl.replace(/^http:\/\//i, 'https://');
    }
    
    base = envUrl;
  } else {
    // 3. Fallback: If VITE_API_URL is empty, try to derive it.
    // If we're on localhost, the backend is probably on port 5000
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      base = 'http://localhost:5000';
    } else {
      // If the frontend is hosted at 'xxx-frontend.onrender.com', the backend is at 'xxx-node-backend.onrender.com'
      // Use the current protocol (so if frontend is https, backend is requested over https)
      const backendHostname = hostname.replace('frontend', 'node-backend');
      base = `${protocol}//${backendHostname}`;
    }
  }
  
  // Clean up leading/trailing slashes to avoid double slashes or missing slashes
  // Remove trailing slash from base if present
  base = base.replace(/\/+$/, '');
  // Ensure path starts with a single slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${base}${cleanPath}`;
};
