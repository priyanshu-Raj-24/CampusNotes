const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, '../frontend');

// CORS — allow same origin in production, localhost in dev
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server calls (no Origin header) and localhost in dev
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger — lightweight, safe for production
app.use((req, _res, next) => {
    console.log(`>> ${req.method} ${req.originalUrl}`);
    next();
});

app.use(express.static(frontendPath));

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'CampusNotes' });
});

// API Routes
app.use('/api', apiRoutes);

app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`CampusNotes server running on http://localhost:${PORT}`);
});
