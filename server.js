const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 6000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/zx_master_db";
const JWT_SECRET = process.env.JWT_SECRET || "ZX_SUPER_SECRET_KEY_PROD_2026";

mongoose.connect(MONGO_URI)
    .then(() => console.log("Admin Token Engine Connected ✅"))
    .catch(err => console.error("Database Connection Error:", err));

const ZxTestSchema = new mongoose.Schema({
    targetBatch: String,
    testTitle: String,
    totalQuestions: Number,
    testDuration: Number,
    examDate: String,
    questions: Array
});
const ZxTest = mongoose.model('ZxTest', ZxTestSchema, 'zxtests');

// 1. API: Token verify karte hi batch permissions auto-extract karne ka route
app.post('/api/zx-admin/verify-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token string missing!" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Invalid or Expired Token Matrix!" });
        
        // Token se allowed batches ki array return karega (e.g. ['Yakeen NEET', 'Prayas JEE'])
        res.json({ 
            success: true, 
            allowedBatches: decoded.allowedBatches || ['Yakeen NEET', 'Prayas JEE', 'Arjuna JEE', 'Lakshya NEET'] 
        });
    });
});

// 2. API: Secure Bulk Upload Routing with Token Check
app.post('/api/zx-admin/auto-update-tests', upload.single('excelDoc'), async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ error: "Security Token Missing from request header!" });

        // Token Decode Logic
        let decoded;
        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch(e) {
            return res.status(403).json({ error: "Unauthorized! Token has expired." });
        }

        if (!req.file) return res.status(400).json({ error: "Please attach valid test sheet." });

        const workbook = xlsx.readFile(req.file.path);
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames]);

        if (rows.length === 0) return res.status(400).json({ error: "Excel data rows are empty." });

        const detectedBatch = rows[0].targetBatch;
        const detectedTitle = rows[0].testTitle;
        const detectedDate = rows[0].examDate;
        const detectedDuration = rows[0].testDuration || 180;

        // Security Check: Kya is token ke paas is batch me upload karne ki permission hai?
        const allowedBatches = decoded.allowedBatches || ['Yakeen NEET', 'Prayas JEE', 'Arjuna JEE', 'Lakshya NEET'];
        if (!allowedBatches.includes(detectedBatch)) {
            return res.status(403).json({ error: `Access Denied! Your token doesn't have permissions for '${detectedBatch}'.` });
        }

        const processedQuestions = rows.map(row => ({
            subject: row.subject,
            questionType: row.questionType,
            questionText: row.questionText,
            options: [row.optA, row.optB, row.optC, row.optD].filter(Boolean),
            correctAnswer: String(row.correctAnswer).trim()
        }));

        await ZxTest.findOneAndUpdate(
            { targetBatch: detectedBatch, testTitle: detectedTitle },
            {
                targetBatch: detectedBatch,
                testTitle: detectedTitle,
                examDate: detectedDate,
                testDuration: detectedDuration,
                totalQuestions: processedQuestions.length,
                questions: processedQuestions
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: `Successfully updated! '${detectedTitle}' is now live in '${detectedBatch}'.` });
    } catch (error) {
        res.status(500).json({ error: "Excel structural mapping failure." });
    }
});

// Serve Frontend Screen directly
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Admin Core active on channel ${PORT}`));
