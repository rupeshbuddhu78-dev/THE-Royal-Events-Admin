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
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Ready for Bulk Uploads!"))
  .catch(err => console.log("❌ DB Error:", err.message));

const Media = mongoose.model('Media', new mongoose.Schema({
    category: String, 
    url: String, 
    filename: String 
}));

// --- 2. CLOUDINARY CONFIG ---
cloudinary.config({ 
  cloud_name: 'dksk72xzh',
  secure: true
}); 

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 3. MULTI-UPLOAD API ---
app.post('/upload', upload.array('mediaFiles', 10), async (req, res) => {
    console.log(`🚦 Nayi Request: ${req.files ? req.files.length : 0} files aayi hain.`);
    
    try {
        if (!req.files || req.files.length === 0) {
            console.log("❌ Error: Koi file nahi mili!");
            return res.status(400).json({ success: false, message: "No files selected!" });
        }

        const uploadResults = [];

        for (const file of req.files) {
            console.log(`➡️ Uploading: ${file.originalname}`);

            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            const result = await cloudinary.uploader.unsigned_upload(
                fileBase64, 
                "royal_preset", 
                { resource_type: "auto" }
            );

            const newMedia = new Media({
                category: req.body.category,
                url: result.secure_url,
                filename: result.public_id
            });
            await newMedia.save();
            
            uploadResults.push(result.secure_url);
        }

        console.log("✅ Bulk Upload Success!");
        res.status(200).json({ 
            success: true, 
            message: `${uploadResults.length} photos uploaded!`,
            urls: uploadResults 
        });

    } catch (err) {
        console.log("🚨 Server Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

// --- 4. GALLERY API ---
app.get('/media', async (req, res) => {
    try {
        const items = await Media.find().sort({ _id: -1 });
        res.json({ items });
    } catch (err) { res.status(500).json({ success: false }); }
});

// --- 5. SMART DELETE API (Website se hamesha clean karega) ---
app.delete('/delete/:id', async (req, res) => {
    try {
        const item = await Media.findById(req.params.id);
        
        if (item) {
            // Step A: Cloudinary se delete karne ki koshish karo
            try {
                await cloudinary.uploader.destroy(item.filename, {
                    api_key: '528438734126249',
                    api_secret: 'DnmnEIWQD4eE1AmOlBHd3IAqA3Y'
                });
                console.log(`☁️ Cloudinary se delete hua: ${item.filename}`);
            } catch (cloudErr) {
                // Agar cloudinary pe photo nahi mili (already deleted manualy), toh yahan aayega
                console.log(`⚠️ Cloudinary pe nahi mila, par aage badh rahe hain...`);
            }

            // Step B: ZIDDI DELETE - MongoDB se toh 100% udayega hi udayega
            await Media.findByIdAndDelete(req.params.id);
            console.log(`🗑️ Database (Website) se completely delete ho gaya!`);
        }
        
        res.json({ success: true, message: "Item removed completely!" });
    } catch (err) { 
        console.log("🚨 Delete Route Error:", err.message);
        res.status(500).json({ success: false }); 
    }
});

// Keep Alive
setInterval(() => {
    https.get("https://the-royal-events-admin.onrender.com");
}, 800000);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Master Server Live on Port ${PORT}`));
