const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;
const frontendPath = path.join(__dirname, '../frontend');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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