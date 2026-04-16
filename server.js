const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; 
const mongoose = require('mongoose'); 
const https = require('https');
require('dotenv').config();

const app = express();

// --- SETTINGS ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());
app.use(express.static(__dirname)); 

// --- 1. DATABASE CONNECTION ---
// Ab ye seedha Render ke environment variables se MONGO_URI uthayega
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connection Successful!"))
  .catch(err => console.log("❌ MongoDB Error:", err.message));

const Media = mongoose.model('Media', new mongoose.Schema({
    category: String, url: String, filename: String 
}));

// --- 2. CLOUDINARY CONFIG ---
// Ye line automatic process.env.CLOUDINARY_URL ko detect kar legi
cloudinary.config(); 

console.log("🛠️ Cloudinary System: Initialized via Environment Variable");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 3. UPLOAD API ---
app.post('/upload', upload.single('mediaFile'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file selected!" });

        console.log("🚦 Uploading to Cloudinary...");

        const stream = cloudinary.uploader.upload_stream(
            { folder: "RoyalEvents_Gallery", resource_type: "auto" },
            async (error, result) => {
                if (error) {
                    console.log("🚨 Cloudinary Error:", error.message);
                    return res.status(500).json({ success: false, message: error.message });
                }

                const newMedia = new Media({
                    category: req.body.category,
                    url: result.secure_url,
                    filename: result.public_id
                });
                await newMedia.save();
                console.log("✅ Upload Success! Photo is live.");
                res.status(200).json({ success: true, url: result.secure_url });
            }
        );
        stream.end(req.file.buffer);

    } catch (err) {
        console.log("🚨 Server Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
});

// --- 4. GALLERY & DELETE API ---
app.get('/media', async (req, res) => {
    try {
        const items = await Media.find().sort({ _id: -1 });
        res.json({ items });
    } catch (err) { res.status(500).json({ success: false }); }
});

app.delete('/delete/:id', async (req, res) => {
    try {
        const item = await Media.findById(req.params.id);
        if (item) {
            await cloudinary.uploader.destroy(item.filename);
            await Media.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// --- 5. KEEP-ALIVE SYSTEM ---
setInterval(() => {
    https.get("https://the-royal-events-admin.onrender.com");
    console.log("📡 Ping: Server awake");
}, 840000); // 14 minutes

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Master Server Live on Port ${PORT}`));
