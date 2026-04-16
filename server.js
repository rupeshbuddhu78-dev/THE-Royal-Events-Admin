const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const mongoose = require('mongoose'); // Naya: Database ke liye
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

// --- 1. MONGODB CONNECTION ---
// Ye code aapke Render se MONGO_URI uthayega aur database connect karega
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch(err => console.log("❌ MongoDB Error:", err));

// Database Model (Ye humara table hai jisme photo ki details save hogi)
const MediaSchema = new mongoose.Schema({
    category: String,
    url: String,
    filename: String // Cloudinary se delete karne ke liye iski zaroorat padegi
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

// --- 3. API ROUTE: UPLOAD (Photo aayegi aur DB me save hogi) ---
app.post('/upload', upload.single('mediaFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded!" });
        }

        // Nayi photo ki entry Database me save karna
        const newMedia = new Media({
            category: req.body.category,
            url: req.file.path,
            filename: req.file.filename // Cloudinary ID
        });
        await newMedia.save();

        console.log("Upload & DB Save Success!");
        
        res.status(200).json({ 
            success: true, 
            message: "File uploaded and saved to database!",
            category: req.body.category,
            url: req.file.path 
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: "Upload failed on server." });
    }
});

// --- 4. API ROUTE: GET GALLERY (Admin panel me show karne ke liye) ---
app.get('/media', async (req, res) => {
    try {
        // Database se saari photos utha kar frontend ko bhejna (Latest photo sabse upar)
        const items = await Media.find().sort({ _id: -1 }); 
        res.status(200).json({ items: items });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch media." });
    }
});

// --- 5. API ROUTE: DELETE (Trash button click hone par) ---
app.delete('/delete/:id', async (req, res) => {
    try {
        const item = await Media.findById(req.params.id);
        if (!item) return res.status(404).json({ success: false, message: "Item not found in Database." });

        // Step A: Cloudinary storage se photo udana
        await cloudinary.uploader.destroy(item.filename);
        
        // Step B: MongoDB Database se link udana
        await Media.findByIdAndDelete(req.params.id);

        res.status(200).json({ success: true, message: "Deleted successfully!" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Failed to delete item." });
    }
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
