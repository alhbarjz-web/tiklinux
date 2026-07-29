const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3002;
const ROOT = __dirname;

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
};

// Mock stats data (matching the live site format)
let mockStats = {
  totalVisitors: 5340,
  activeNow: 1,
  sessions: []
};

// Handle API routes
function handleAPI(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return true;
  }

  if (req.url === '/api/stats' && req.method === 'GET') {
    // Clean up old sessions (older than 5 minutes)
    const now = Date.now();
    mockStats.sessions = mockStats.sessions.filter(s => now - s.lastSeen < 5 * 60 * 1000);
    mockStats.activeNow = Math.max(1, mockStats.sessions.length);

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(mockStats));
    console.log(`  â†’ API: GET /api/stats â†’ 200 (${mockStats.sessions.length} sessions)`);
    return true;
  }

  if (req.url === '/api/stats/visit' && req.method === 'POST') {
    mockStats.totalVisitors += 1;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, totalVisitors: mockStats.totalVisitors }));
    console.log(`  â†’ API: POST /api/stats/visit â†’ 200 (total: ${mockStats.totalVisitors})`);
    return true;
  }

  if (req.url === '/api/stats/web-heartbeat' && req.method === 'POST') {
    // Read the POST body to get session info
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        // Update or add session
        const existing = mockStats.sessions.find(s => s.sid === data.sid);
        if (existing) {
          existing.lastSeen = Date.now();
        } else {
          mockStats.sessions.push({
            sid: data.sid || 'unknown',
            overlay: data.overlay || 'unknown',
            username: data.username || 'unknown',
            since: Date.now(),
            lastSeen: Date.now()
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    });
    console.log(`  â†’ API: POST /api/stats/web-heartbeat â†’ 200`);
    return true;
  }

  return false; // Not an API route
}

// Serve static files
function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0]; // Remove query string
  
  // Default to index.html
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(ROOT, urlPath);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // File not found - try index.html for SPA routing
      const indexPath = path.join(ROOT, 'index.html');
      fs.readFile(indexPath, (err2, data) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err3, data) => {
      if (err3) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

const server = http.createServer((req, res) => {
  const startTime = Date.now();
  
  // Try API routes first
  if (req.url.startsWith('/api/')) {
    const handled = handleAPI(req, res);
    if (handled) return;
  }

  // Serve static files
  serveStatic(req, res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”گ');
  console.log('  â”‚                                          â”‚');
  console.log('  â”‚   tiklinux Local Server                    â”‚');
  console.log('  â”‚                                          â”‚');
  console.log(`  â”‚   Local:    http://localhost:${PORT}          â”‚`);
  console.log(`  â”‚   Network:  http://192.168.1.18:${PORT}      â”‚`);
  console.log('  â”‚                                          â”‚');
  console.log('  â”‚   âœ… Static files + Mock API ready       â”‚');
  console.log('  â”‚                                          â”‚');
  console.log('  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”ک');
  console.log('');
});
