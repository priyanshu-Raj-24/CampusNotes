const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { db } = require('../config/firebase');
const { getAuth } = require('firebase-admin/auth');

const router = express.Router();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// MULTER (hold file in memory before Cloudinary upload)
const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// CLOUDINARY UPLOAD HELPER
// resource_type:'raw' is required for PDFs, DOCX, TXT, etc. so Cloudinary
// stores them as raw files and serves them with a publicly accessible URL.
// 'auto' maps those types to 'image', which can trigger 401 ACL errors.
const uploadToCloudinary = (fileBuffer, mimetype) => {
    // Use 'image' only for true image uploads; everything else (PDF, DOCX, TXT…) → 'raw'
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    const resourceType = imageTypes.includes(mimetype) ? 'image' : 'raw';

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: resourceType,
                folder: 'campusnotes',
                // type:'upload' is the default public delivery type
                type: 'upload',
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
};

// AUTH MIDDLEWARE  — verifies Firebase ID token from Bearer header
async function verifyFirebaseToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: No token provided.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        req.user = decodedToken; // attach uid, email, etc. to request
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(403).json({ error: 'Forbidden: Invalid or expired token.' });
    }
}

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
        console.error('Database fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch resources' });
    }
});

// GET: Search and filter resources
router.get('/search', async (req, res) => {
    try {
        const { q, year, semester, category } = req.query;
        let queryRef = db.collection('resources').where('status', '==', 'published');

        if (year)     queryRef = queryRef.where('academicYear',   '==', parseInt(year));
        if (semester) queryRef = queryRef.where('semesterNumber', '==', parseInt(semester));
        if (category) queryRef = queryRef.where('category',       '==', category);

        const snapshot = await queryRef.orderBy('createdAt', 'desc').get();
        let resources = [];
        snapshot.forEach(doc => resources.push({ id: doc.id, ...doc.data() }));

        // Client-side text filter (Firestore doesn't do full-text search natively)
        if (q) {
            const lower = q.toLowerCase();
            resources = resources.filter(r =>
                r.title.toLowerCase().includes(lower) ||
                r.subject.toLowerCase().includes(lower)
            );
        }

        res.status(200).json(resources);
    } catch (error) {
        console.error('Search API error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

// POST: Upload a new resource
router.post('/resources', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { title, academicYear, semester, subject, category, fileExtension } = req.body;

        // Required field validation
        if (!title || !academicYear || !semester || !subject || !category) {
            return res.status(400).json({ error: 'Missing required fields: title, academicYear, semester, subject, category' });
        }

        const originalFilename = req.file.originalname;
        const ext = fileExtension || originalFilename.split('.').pop().toLowerCase();

        // Upload to Cloudinary
        const cloudResult = await uploadToCloudinary(req.file.buffer, req.file.mimetype);

        // Save metadata to Firestore
        const resourceId   = db.collection('resources').doc().id;
        const resourceData = {
            id:                resourceId,
            title:             title.trim(),
            academicYear:      parseInt(academicYear),
            semesterNumber:    parseInt(semester),
            subject:           subject.trim(),
            category,
            fileExtension:     ext,
            originalFilename,
            storageObjectPath: cloudResult.public_id,
            downloadUrl:       cloudResult.secure_url,
            mimeType:          req.file.mimetype,
            fileSizeBytes:     req.file.size,
            status:            'pending_review', // Admin must approve before it goes public
            createdAt:         new Date().toISOString(),
        };

        await db.collection('resources').doc(resourceId).set(resourceData);
        res.status(201).json({ message: 'Upload successful – pending review', resource: resourceData });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Upload failed due to a server error' });
    }
});

// GET: Download a resource — forces file download via Content-Disposition header
router.get('/download/:id', async (req, res) => {
    try {
        const doc = await db.collection('resources').doc(req.params.id).get();

        if (!doc.exists) {
            return res.status(404).json({ error: 'Resource not found.' });
        }

        const resource = doc.data();

        if (resource.status !== 'published') {
            return res.status(403).json({ error: 'This resource is not available for download.' });
        }

        // Fetch the file from Cloudinary 
        const fileUrl  = resource.downloadUrl;
        const filename = resource.originalFilename || `file.${resource.fileExtension || 'bin'}`;

        const https    = require('https');
        const http     = require('http');
        const protocol = fileUrl.startsWith('https') ? https : http;

        protocol.get(fileUrl, (fileStream) => {
            if (fileStream.statusCode !== 200) {
                return res.status(502).json({ error: 'Failed to fetch file from storage.' });
            }

            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
            res.setHeader('Content-Type', resource.mimeType || 'application/octet-stream');
            fileStream.pipe(res);
        }).on('error', (err) => {
            console.error('Download proxy error:', err);
            res.status(502).json({ error: 'Download failed.' });
        });

    } catch (error) {
        console.error('Download route error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
});

// GET: Fetch all resources (any status) — admin only
router.get('/admin/resources', verifyFirebaseToken, async (req, res) => {
    try {
        const snapshot = await db.collection('resources')
            .orderBy('createdAt', 'desc')
            .get();
        const resources = [];
        snapshot.forEach(doc => resources.push({ id: doc.id, ...doc.data() }));
        res.status(200).json(resources);
    } catch (error) {
        console.error('Admin fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch admin resources' });
    }
});

// PATCH: Update resource status — admin only
router.patch('/admin/resources/:id/status', verifyFirebaseToken, async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['published', 'pending_review', 'restricted'];

        if (!status || !allowed.includes(status)) {
            return res.status(400).json({ error: `Invalid status. Must be one of: ${allowed.join(', ')}` });
        }

        await db.collection('resources').doc(req.params.id).update({ status });
        res.status(200).json({ message: `Resource status updated to ${status}` });
    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;