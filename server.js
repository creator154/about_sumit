const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const xlsx = require('xlsx');
const cors = require('cors');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 6000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/zx_master_db";

mongoose.connect(MONGO_URI)
    .then(() => console.log("Bypassed Admin Engine Connected ✅"))
    .catch(err => console.error("Database Connection Error:", err));

// Test Database Structure
const ZxTestSchema = new mongoose.Schema({
    targetBatch: String,
    testTitle: String,
    totalQuestions: Number,
    testDuration: Number,
    examDate: String,
    questions: Array
});
const ZxTest = mongoose.model('ZxTest', ZxTestSchema, 'zxtests');

// Helper function: Kisi bhi JWT token ko bina security key ke direct open/decode karne ke liye
function decodeTokenWithoutKey(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
        return JSON.parse(payload);
    } catch (e) {
        return null;
    }
}

// 1. API: PW Token ko direct parse karke data screen par show karne ka bypass route
app.post('/api/zx-admin/verify-token', (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token string missing!" });

    const decoded = decodeTokenWithoutKey(token);
    
    if (!decoded) {
        return res.status(400).json({ error: "Corrupted Token String!" });
    }

    // Token decode hone par user profile feedback verify ho jayegi
    console.log("Token successfully bypassed for user:", decoded.data?.firstName);

    // PW batch systems ki automated master array structure return karega
    res.json({ 
        success: true, 
        allowedBatches: [
            'Yakeen NEET Hindi 2027', 
            'Yakeen NEET Hindi 2026',
            'Yakeen NEET Hindi 3.0 2025',
            'Prayas JEE 2024',
            'Prayas JEE 3.0 2025',
            'Prayas JEE 2.0 2026',
            'Lakshya JEE', 
            'Arjuna NEET'
        ] 
    });
});

// 2. API: Dynamic Batch Excel Auto-Uploader (Bypassed Security)
app.post('/api/zx-admin/auto-update-tests', upload.single('excelDoc'), async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) return res.status(401).json({ error: "Authentication Token Missing!" });

        const decoded = decodeTokenWithoutKey(token);
        if (!decoded) return res.status(403).json({ error: "Session authentication failed." });

        if (!req.file) return res.status(400).json({ error: "Please attach valid test sheet." });

        const workbook = xlsx.readFile(req.file.path);
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames]);

        if (rows.length === 0) return res.status(400).json({ error: "Excel data rows are empty." });

        // First row elements structure map validation
        const firstRow = rows[0];
        const detectedBatch = firstRow.targetBatch;
        const detectedTitle = firstRow.testTitle;
        const detectedDate = firstRow.examDate;
        const detectedDuration = firstRow.testDuration || 180;

        if (!detectedBatch || !detectedTitle) {
            return res.status(400).json({ error: "Excel structural error: targetBatch or testTitle columns are missing." });
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

        res.json({ success: true, message: `Successfully updated! '${detectedTitle}' is now live inside batch portal.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Excel structural parsing failure." });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Bypassed Admin Core running on port ${PORT}`));
