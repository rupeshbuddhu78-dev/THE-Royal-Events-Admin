const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; 
const mongoose = require('mongoose'); 
const https = require('https');
require('dotenv').config();

const app = express();

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());
app.use(express.static(__dirname)); 

// --- 1. DATABASE ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Ready!"))
  .catch(err => console.log("❌ DB Error:", err.message));

const Media = mongoose.model('Media', new mongoose.Schema({
    category: String, url: String, filename: String 
}));

// --- 2. CLOUDINARY CONFIG ---
// Hum sirf Cloud Name use karenge unsigned ke liye taaki signature na bane
cloudinary.config({ 
  cloud_name: 'dksk72xzh',
  secure: true
}); 

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 3. UPLOAD API (Purely Unsigned - No Signature Error!) ---
app.post('/upload', upload.single('mediaFile'), async (req, res) => {
    console.log("🚦 Uploading using Pure Unsigned Method...");
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No file selected!" });

        // Buffer ko Base64 mein badal rahe hain kyunki unsigned_upload ke liye ye zaroori hai
        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

        // Ye hai asli Unsigned function
        const result = await cloudinary.uploader.unsigned_upload(
            fileBase64, 
            "royal_preset", // Aapka banaya hua Unsigned Preset
            { resource_type: "auto" }
        );

        const newMedia = new Media({
            category: req.body.category,
            url: result.secure_url,
            filename: result.public_id
        });
        await newMedia.save();

        console.log("✅ Success! Photo is live.");
        res.status(200).json({ success: true, url: result.secure_url });

    } catch (err) {
        console.log("🚨 Cloudinary Error:", err.message);
        res.status(500).json({ success: false, message: "Cloudinary Error: " + err.message });
    }
});

// --- 4. GALLERY & DELETE ---
app.get('/media', async (req, res) => {
    try {
        const items = await Media.find().sort({ _id: -1 });
        res.json({ items });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Note: Delete ke liye API_SECRET chahiye hota hai, isliye hum yahan manually config bhejenge
app.delete('/delete/:id', async (req, res) => {
    try {
        const item = await Media.findById(req.params.id);
        if (item) {
            // Delete ke liye temp config
            await cloudinary.uploader.destroy(item.filename, {
                api_key: '528438734126249',
                api_secret: 'DnmnEIWQD4eE1AmOlBHd3IAqA3Y'
            });
            await Media.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Keep Alive
setInterval(() => {
    https.get("https://the-royal-events-admin.onrender.com");
}, 800000);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Master Server Live on Port ${PORT}`));
