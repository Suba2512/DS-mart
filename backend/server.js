const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DS_CORE_EXE = path.join(__dirname, 'ds_core.exe');
const DS_CORE_C = path.join(__dirname, 'ds_core.c');

// Helper to execute C binary with arguments
function runCEngine(args = []) {
    return new Promise((resolve, reject) => {
        execFile(DS_CORE_EXE, args, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                // If binary run failed, fallback or report
                console.error('C binary execution error:', error, stderr);
                return reject({ error: error.message, stderr, stdout });
            }
            try {
                const parsed = JSON.parse(stdout.trim());
                resolve(parsed);
            } catch (parseErr) {
                console.error('JSON parse error on C output:', parseErr, stdout);
                reject({ error: 'Failed to parse C engine JSON output', raw: stdout });
            }
        });
    });
}

// MIME types
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav'
};

const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // API routes for C Data Structures engine
    if (pathname.startsWith('/api/ds/')) {
        res.setHeader('Content-Type', 'application/json');

        // Helper to parse JSON body
        const parseBody = () => new Promise((resolve) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (e) {
                    resolve({});
                }
            });
        });

        try {
            if (pathname === '/api/ds/state' && req.method === 'GET') {
                const result = await runCEngine(['state']);
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === '/api/ds/stack/push' && req.method === 'POST') {
                const data = await parseBody();
                const name = data.name || 'Unknown Item';
                const price = (data.price !== undefined) ? String(data.price) : '3.00';
                const cat = data.category || 'General';
                const result = await runCEngine(['push', name, price, cat]);
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === '/api/ds/stack/pop' && req.method === 'POST') {
                const result = await runCEngine(['pop']);
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === '/api/ds/list/search' && req.method === 'POST') {
                const data = await parseBody();
                const name = data.name || '';
                const result = await runCEngine(['search', name]);
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === '/api/ds/queue/dequeue' && req.method === 'POST') {
                const result = await runCEngine(['dequeue']);
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === '/api/ds/queue/enqueue' && req.method === 'POST') {
                const data = await parseBody();
                const name = data.name || 'Shopper';
                const items = String(data.items || 2);
                const total = String(data.total || 10.0);
                const result = await runCEngine(['enqueue', name, items, total]);
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === '/api/ds/reset' && req.method === 'POST') {
                const result = await runCEngine(['reset']);
                res.writeHead(200);
                res.end(JSON.stringify(result));
                return;
            }

            if (pathname === '/api/ds/c-source' && req.method === 'GET') {
                const cCode = fs.readFileSync(DS_CORE_C, 'utf-8');
                res.writeHead(200);
                res.end(JSON.stringify({ source: cCode }));
                return;
            }

            res.writeHead(404);
            res.end(JSON.stringify({ error: 'Endpoint not found' }));
            return;
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal C Engine Error', details: err }));
            return;
        }
    }

    // Static file serving
    let filePath = pathname === '/' ? path.join(PUBLIC_DIR, 'index.html') : path.join(PUBLIC_DIR, pathname);

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                // Return index.html for SPA if not found
                fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, fallbackContent) => {
                    if (e2) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('404 Not Found');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(fallbackContent, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`[DS Mart Server] Running at http://localhost:${PORT}`);
    console.log(`[C Data Structures Engine] Connected to ${DS_CORE_EXE}`);
});
