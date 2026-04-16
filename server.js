const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose'); 
const path = require('path');
require('dotenv').config();

const app = express();

// CORS Setting
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 

// --- DEBUGGING MIDDLEWARE (Ye batayega kaunsi API call hui hai) ---
app.use((req, res, next) => {
    console.log(`\n🚦 Nayi Request Aayi Hai: ${req.method} ${req.url}`);
    next();
});

// --- 1. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => {
      console.log("\n❌ MONGODB CONNECTION ERROR:");
      console.log(err.message || err);
  });

const MediaSchema = new mongoose.Schema({
    category: String,
    url: String,
    filename: String 
});
const Media = mongoose.model('Media', MediaSchema);

// --- 2. CLOUDINARY CONFIGURATION ---
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'RoyalEvents_Gallery', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
    resource_type: 'auto' 
  },
});
const upload = multer({ storage: storage });

// --- 3. API ROUTE: UPLOAD ---
app.post('/upload', upload.single('mediaFile'), async (req, res) => {
    try {
        console.log("➡️ Upload process shuru hua...");
        
        if (!req.file) {
            console.log("❌ Error: Koi file backend tak nahi aayi!");
            return res.status(400).json({ success: false, message: "No file uploaded!" });
        }
        
        console.log("✅ File Cloudinary pe chali gayi. URL:", req.file.path);

        const newMedia = new Media({
            category: req.body.category,
            url: req.file.path,
            filename: req.file.filename
        });
        
        console.log("➡️ Ab MongoDB me save kar rahe hain...");
        await newMedia.save();
        console.log("✅ MongoDB me save ho gaya!");
        
        res.status(200).json({ 
            success: true, 
            message: "File uploaded and saved to database!",
            category: req.body.category,
            url: req.file.path 
        });

    } catch (error) {
        // JASUSI LOGS FOR UPLOAD ERROR
        console.log("\n================================================");
        console.log("🚨 UPLOAD MEIN BHAYANKAR ERROR AAYA HAI 🚨");
        console.log("Error Message:", error.message);
        console.log("Pura Error:", JSON.stringify(error, null, 2)); // Ye [object Object] ko khol ke dikhayega
        console.log("================================================\n");
        
        res.status(500).json({ 
            success: false, 
            message: "Upload failed: " + (error.message || "Unknown Error") 
        });
    }
});

// --- 4. API ROUTE: GET GALLERY ---
app.get('/media', async (req, res) => {
    try {
        const items = await Media.find().sort({ _id: -1 }); 
        res.status(200).json({ items: items });
    } catch (error) {
        console.log("\n❌ GET MEDIA ERROR:", error.message);
        res.status(500).json({ success: false, message: "Failed to fetch media." });
    }
});

// --- 5. API ROUTE: DELETE ---
app.delete('/delete/:id', async (req, res) => {
    try {
        const item = await Media.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Item not found in Database." });

        await cloudinary.uploader.destroy(item.filename);
        await Media.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Deleted successfully!" });
    } catch (error) {
        console.log("\n❌ DELETE ERROR:", error.message);
        res.status(500).json({ success: false, message: "Failed to delete item." });
    }
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
