const fs = require('fs');
const path = require('path');

// Create the logs directory if missing
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logFile = path.join(logDir, 'access.log');

module.exports = function logger(req, res, next) {
    const start = Date.now();

    res.on('finish', () => {
        const entry = {
            timestamp:  new Date().toISOString(),
            ip:         req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            method:     req.method,
            url:        req.originalUrl,
            status:     res.statusCode,
            durationMs: Date.now() - start
        };
        fs.appendFile(logFile, JSON.stringify(entry) + '\n', err => {
            if (err) console.error('logger write failed:', err.message);
        });
    });

    next();   // critical — without this every request hangs
};