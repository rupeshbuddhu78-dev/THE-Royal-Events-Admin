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

// --- 3. MULTI-UPLOAD API (Purely Unsigned) ---
// Note: 'mediaFiles' wahi naam hai jo humne HTML input mein 'name' rakha hai.
// '10' ka matlab hai ek baar mein maximum 10 photos.
app.post('/upload', upload.array('mediaFiles', 10), async (req, res) => {
    console.log(`🚦 Multi-Upload Shuru: ${req.files ? req.files.length : 0} files aayi hain.`);
    
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ success: false, message: "No files selected!" });
        }

        const uploadResults = [];

        // Loop: Har file ke liye process chalega
        for (const file of req.files) {
            // Buffer ko Base64 mein badalna (Unsigned upload ke liye)
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // Cloudinary par upload (Aapka preset use ho raha hai)
            const result = await cloudinary.uploader.unsigned_upload(
                fileBase64, 
                "royal_preset", 
                { resource_type: "auto" }
            );

            // Database mein save karna
            const newMedia = new Media({
                category: req.body.category,
                url: result.secure_url,
                filename: result.public_id
            });
            await newMedia.save();
            
            uploadResults.push(result.secure_url);
        }

        console.log(`✅ Success! ${uploadResults.length} photos upload ho gayi.`);
        res.status(200).json({ 
            success: true, 
            message: `${uploadResults.length} Files uploaded successfully!`,
            urls: uploadResults 
        });

    } catch (err) {
        console.log("🚨 Multi-Upload Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

// --- 4. GALLERY & DELETE ---
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
app.listen(PORT, () => console.log(`🚀 Bulk Master Server Live on Port ${PORT}`));
