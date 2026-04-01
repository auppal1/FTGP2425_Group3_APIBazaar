const fs = require('fs');
const path = require('path');

// Creating logs directory
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

module.exports = function logger(req, res, next){
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now()- start;
        const logEntry = {
            timestamp: new Date().toISOString(),
            ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        }
    })
}