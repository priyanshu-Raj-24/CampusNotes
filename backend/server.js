const express = require('express');
const cors = require('cors');
require('dotenv').config();
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static('../frontend'));

// API Routes
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`CampusNotes server running on http://localhost:${PORT}`);
});