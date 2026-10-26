const express = require('express');
const multer = require('multer');
const { db, bucket } = require('../config/firebase');
const router = express.Router();

// Use memory storage for Multer to forward to Firebase
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET: Fetch published resources
router.get('/resources', async (req, res) => {
    try {
        const snapshot = await db.collection('resources')
            .where('status', '==', 'published')
            .orderBy('createdAt', 'desc')
            .get();
            
        const resources = [];
        snapshot.forEach(doc => resources.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(resources);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// POST: Upload a new resource
router.post('/resources', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { title, academicYear, semester, subject, category } = req.body;
        const originalFilename = req.file.originalname;
        const mimeType = req.file.mimetype;
        const fileSizeBytes = req.file.size;

        // Create a unique storage path
        const resourceId = db.collection('resources').doc().id;
        const storageObjectPath = `resources/${resourceId}/${Date.now()}_${originalFilename}`;
        const file = bucket.file(storageObjectPath);

        // Upload to Firebase Storage
        await file.save(req.file.buffer, {
            metadata: { contentType: mimeType }
        });

        // Make file public (since we have no auth yet)
        await file.makePublic();
        const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${storageObjectPath}`;

        // Save metadata to Firestore
        const resourceData = {
            id: resourceId,
            title,
            academicYear: parseInt(academicYear),
            semesterNumber: parseInt(semester),
            subject,
            category,
            originalFilename,
            storageObjectPath,
            downloadUrl, // Temporary direct link for V1
            mimeType,
            fileSizeBytes,
            status: 'published', // Auto-publish since no admin panel yet
            createdAt: new Date().toISOString()
        };

        await db.collection('resources').doc(resourceId).set(resourceData);

        res.status(201).json({ message: 'Upload successful', resource: resourceData });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: 'Upload failed due to server error' });
    }
});

module.exports = router;