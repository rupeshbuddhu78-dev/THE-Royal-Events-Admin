const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose'); 
const path = require('path');

const app = express();

// CORS Settings
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// --- 1. DATABASE CONNECTION ---
const MONGO_URI = "mongodb+srv://manojcob65_db_user:T2rfZYRVRwwZCduH@cluster0.ztgswg3.mongodb.net/?appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => console.log("❌ MongoDB Connection Error:", err.message));

const MediaSchema = new mongoose.Schema({
    category: String,
    url: String,
    filename: String 
});
const Media = mongoose.model('Media', MediaSchema);

// --- 2. CLOUDINARY CONFIGURATION ---
cloudinary.config({
  cloud_name: 'dksk72xzh',
  api_key: '528438734126249',
  api_secret: 'DnmnEIWQD4eE1AmOlBHd3IAqA3Y'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'RoyalEvents_Gallery', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
    resource_type: 'auto' 
  },
});

// Multer setup
const upload = multer({ storage: storage }).single('mediaFile');

// --- 3. API ROUTE: UPLOAD (SUPER DEBUG VERSION) ---
app.post('/upload', (req, res) => {
    console.log("🚦 Nayi Upload Request Aayi Hai...");

    // Manual handling of upload to catch [object Object] errors
    upload(req, res, async function (err) {
        if (err) {
            console.log("🚨 CLOUDINARY UPLOAD ERROR DETAILS:");
            // Ye line asli error message nikaalegi
            const errorMsg = err.message || JSON.stringify(err);
            console.log("ASLI WAJAH:", errorMsg);
            
            return res.status(500).json({ 
                success: false, 
                message: "Cloudinary Error: " + errorMsg 
            });
        }

        // Agar raste mein koi error nahi aaya, toh ab DB mein save karenge
        try {
            if (!req.file) {
                console.log("❌ Error: Backend ko file nahi mili!");
                return res.status(400).json({ success: false, message: "No file selected!" });
            }

            console.log("✅ Photo Cloudinary pe chali gayi! URL:", req.file.path);

            const newMedia = new Media({
                category: req.body.category,
                url: req.file.path,
                filename: req.file.filename
            });

            await newMedia.save();
            console.log("✅ Database mein bhi entry ho gayi!");

            res.status(200).json({ 
                success: true, 
                message: "Success! Photo is now live.",
                url: req.file.path 
            });

        } catch (dbError) {
            console.log("🚨 DATABASE SAVE ERROR:", dbError.message);
            res.status(500).json({ success: false, message: "DB Error: " + dbError.message });
        }
    });
});

// --- 4. GET & DELETE ROUTES ---
app.get('/media', async (req, res) => {
    try {
        const items = await Media.find().sort({ _id: -1 }); 
        res.status(200).json({ items });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.delete('/delete/:id', async (req, res) => {
    try {
        const item = await Media.findById(req.params.id);
        if (item) {
            await cloudinary.uploader.destroy(item.filename);
            await Media.findByIdAndDelete(req.params.id);
        }
        res.status(200).json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server live on port ${PORT}`));
