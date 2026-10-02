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
// Note: Isme aap apni wahi MongoDB Atlas live cloud connection string connect karenge
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/zx_master_db";
const JWT_SECRET = process.env.JWT_SECRET || "ZX_SUPER_SECRET_KEY_PROD_2026";

mongoose.connect(MONGO_URI)
    .then(() => console.log("Admin Engine Connected to Master Database ✅"))
    .catch(err => console.error("Database Connection Error:", err));

// Test Database Structure (Exact matching schema)
const ZxTestSchema = new mongoose.Schema({
    targetBatch: String,
    testTitle: String,
    totalQuestions: Number,
    testDuration: Number,
    examDate: String,
    questions: Array
});
const ZxTest = mongoose.model('ZxTest', ZxTestSchema, 'zxtests');

// Secure Admin JWT Verification Middleware
const verifyAdminJWT = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Access Denied! Security Token Missing." });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: "Session Expired! Please login again." });
        req.admin = decoded;
        next();
    });
};

// API: Admin Authentication Login
app.post('/api/zx-admin/login', (req, res) => {
    const { username, password } = req.body;
    // Hardcoded credentials for super safety
    if (username === 'zx_super_admin' && password === 'pw_portal_pass_2026') {
        const token = jwt.sign({ role: 'super_admin' }, JWT_SECRET, { expiresIn: '48h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ error: "Invalid Admin Credentials!" });
});

// API: MAIN BULK BATCH AUTO-UPDATE (Excel Parse Router)
app.post('/api/zx-admin/auto-update-tests', verifyAdminJWT, upload.single('excelDoc'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Please attach valid test sheet." });

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (rows.length === 0) return res.status(400).json({ error: "Sheet is empty." });

        // Pehli row se configurations nikalna
        const detectedBatch = rows[0].targetBatch;
        const detectedTitle = rows[0].testTitle;
        const detectedDate = rows[0].examDate;
        const detectedDuration = rows[0].testDuration || 180;

        if (!detectedBatch || !detectedTitle) {
            return res.status(400).json({ error: "Excel error: targetBatch or testTitle columns are missing in row 1." });
        }

        // Saare rows ko loop me structural process karna
        const processedQuestions = rows.map(row => ({
            subject: row.subject,
            questionType: row.questionType,
            questionText: row.questionText,
            options: [row.optA, row.optB, row.optC, row.optD].filter(Boolean),
            correctAnswer: String(row.correctAnswer).trim()
        }));

        // Database me check karke direct insert ya override karna (Upsert logic)
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

        res.json({ success: true, message: `Zx Portal Auto-Updated! '${detectedTitle}' is now completely live inside '${detectedBatch}'.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error during Excel data injection." });
    }
});

// Default dashboard render
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log(`Admin Console engine active on port ${PORT}`));
