const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { db } = require('../config/firebase'); 
require('dotenv').config();

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer to hold files in memory temporarily
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Helper function to stream memory buffer to Cloudinary
const uploadToCloudinary = (fileBuffer, originalFilename) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { 
                resource_type: 'auto', // Automatically handles PDFs, DOCX, Images, etc.
                folder: 'campusnotes' 
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(fileBuffer);
    });
};

// GET: Fetch published resources
router.get('/resources', async (req, res) => {
    try {
        const snapshot = await db.collection('resources').where('status', '==', 'published').orderBy('createdAt', 'desc').get();
        const resources = [];
        snapshot.forEach(doc => resources.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(resources);
    } catch (error) {
        // ADD THIS LINE to reveal the hidden error:
        console.error("Database Fetch Error:", error); 
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// POST: Upload a new resource
router.post('/resources', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { title, academicYear, semester, subject, category } = req.body;
        const originalFilename = req.file.originalname;

        // 1. Upload file to Cloudinary
        const cloudResult = await uploadToCloudinary(req.file.buffer, originalFilename);
        
        // 2. Save metadata to Firestore
        const resourceId = db.collection('resources').doc().id;
        const resourceData = {
            id: resourceId,
            title,
            academicYear: parseInt(academicYear),
            semesterNumber: parseInt(semester),
            subject,
            category,
            originalFilename,
            storageObjectPath: cloudResult.public_id,
            downloadUrl: cloudResult.secure_url, // Persistent global URL
            mimeType: req.file.mimetype,
            fileSizeBytes: req.file.size,
            status: 'published',
            createdAt: new Date().toISOString()
        };

        await db.collection('resources').doc(resourceId).set(resourceData);
        res.status(201).json({ message: 'Upload successful', resource: resourceData });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: 'Upload failed due to server error' });
    }
});

// GET: Search and filter resources
router.get('/search', async (req, res) => {
    try {
        const { q, year, semester, category } = req.query;
        let queryRef = db.collection('resources').where('status', '==', 'published');

        if (year) queryRef = queryRef.where('academicYear', '==', parseInt(year));
        if (semester) queryRef = queryRef.where('semesterNumber', '==', parseInt(semester));
        if (category) queryRef = queryRef.where('category', '==', category);

        const snapshot = await queryRef.orderBy('createdAt', 'desc').get();
        let resources = [];
        snapshot.forEach(doc => resources.push({ id: doc.id, ...doc.data() }));

        if (q) {
            const searchLower = q.toLowerCase();
            resources = resources.filter(r => 
                r.title.toLowerCase().includes(searchLower) || 
                r.subject.toLowerCase().includes(searchLower)
            );
        }

        res.status(200).json(resources);
    } catch (error) {
        // ADD THIS LINE to reveal the missing index link:
        console.error("Search API Error:", error); 
        res.status(500).json({ error: 'Search failed' });
    }
});
// GET: Admin fetch all resources
router.get('/admin/resources', async (req, res) => {
    try {
        const snapshot = await db.collection('resources').orderBy('createdAt', 'desc').get();
        const resources = [];
        snapshot.forEach(doc => resources.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(resources);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch admin resources' });
    }
});

// PATCH: Admin change resource status
router.patch('/admin/resources/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        await db.collection('resources').doc(req.params.id).update({ status });
        res.status(200).json({ message: `Resource status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;