import { Handler } from '@netlify/functions';

// SSRF Protection: Block requests to internal/private IP ranges
const BLOCKED_HOSTS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^fd[0-9a-f]{2}:/i,
  /^169\.254\.\d+\.\d+$/,    // Link-local
  /\.internal$/i,
  /\.local$/i,
];

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'];
const MAX_BODY_SIZE = 2 * 1024 * 1024; // 2MB
const REQUEST_TIMEOUT_MS = 8000;

// Sensitive header keys that must NEVER be logged or forwarded back
const SENSITIVE_HEADERS = ['authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token', 'proxy-authorization'];

function isBlockedHost(hostname: string): boolean {
  return BLOCKED_HOSTS.some(pattern => pattern.test(hostname));
}

export const handler: Handler = async (event, _context) => {
  // Dynamic CORS: restrict to known origins in production
  const requestOrigin = event.headers?.origin || event.headers?.referer || '';
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:8888',
    'https://nodlync.netlify.app',
    'https://nodlync.com',
  ];
  const corsOrigin = allowedOrigins.find(o => requestOrigin.startsWith(o)) || allowedOrigins[0];

  const corsHeaders = {
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': ALLOWED_METHODS.join(', ') + ', OPTIONS',
    'Vary': 'Origin',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Method Not Allowed.' })
    };
  }

  // Payload size guard
  if (event.body && event.body.length > MAX_BODY_SIZE) {
    return {
      statusCode: 413,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Payload Too Large. Max 2MB.' })
    };
  }

  let parsedPayload: any = {};
  try {
    parsedPayload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON payload.' }) };
  }

  const { targetUrl, method, headers, body } = parsedPayload;

  if (!targetUrl || typeof targetUrl !== 'string') {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing or invalid targetUrl.' }) };
  }

  // URL Scheme Validation — only allow http/https
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Malformed URL.' }) };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Blocked protocol: ${parsedUrl.protocol}` }) };
  }

  // SSRF Protection — block internal/private hosts
  if (isBlockedHost(parsedUrl.hostname)) {
    return { statusCode: 403, headers: corsHeaders, body: JSON.stringify({ error: 'Blocked: requests to internal networks are not permitted.' }) };
  }

  // Method validation
  const safeMethod = (method || 'GET').toUpperCase();
  if (!ALLOWED_METHODS.includes(safeMethod)) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Invalid HTTP method: ${safeMethod}` }) };
  }

  // Sanitized logging — never log tokens or full URLs with query params
  console.log(`[PROXY] ${safeMethod} -> ${parsedUrl.hostname}${parsedUrl.pathname}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const requestHeaders = new Headers();
    if (headers && typeof headers === 'object') {
      const HOP_BY_HOP = ['host', 'connection', 'content-length', 'accept-encoding', 'transfer-encoding', 'te', 'trailer', 'upgrade'];
      Object.entries(headers).forEach(([key, value]) => {
        const lk = key.toLowerCase().trim();
        if (!HOP_BY_HOP.includes(lk) && lk && typeof value === 'string') {
          requestHeaders.append(key.trim(), value);
        }
      });
    }

    const fetchOptions: RequestInit = {
      method: safeMethod,
      headers: requestHeaders,
      signal: controller.signal,
      redirect: 'follow',
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(safeMethod)) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const targetResponse = await fetch(targetUrl, fetchOptions);
    clearTimeout(timeoutId);

    // Build safe response — strip sensitive headers from response
    const safeResponseHeaders: Record<string, string> = {};
    targetResponse.headers.forEach((v, k) => {
      if (!SENSITIVE_HEADERS.includes(k.toLowerCase())) {
        safeResponseHeaders[k] = v;
      }
    });

    const responseText = await targetResponse.text();

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: targetResponse.status,
        statusText: targetResponse.statusText,
        headers: safeResponseHeaders,
        data: responseText
      })
    };

  } catch (error: any) {
    clearTimeout(timeoutId);
    const isTimeout = error.name === 'AbortError';

    // Never expose raw error messages or stack traces
    console.error(`[PROXY ERROR] ${parsedUrl.hostname} | ${isTimeout ? 'Timeout' : 'Network Error'}`);
    
    return {
      statusCode: isTimeout ? 504 : 502,
      headers: corsHeaders,
      body: JSON.stringify({ 
        error: isTimeout ? 'Gateway Timeout: target server unresponsive.' : 'Bad Gateway: unable to reach target.',
        code: isTimeout ? 'TIMEOUT' : 'BAD_GATEWAY'
      })
    };
  }
};
