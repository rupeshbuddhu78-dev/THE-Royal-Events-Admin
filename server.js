const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const path = require('path'); // Naya add kiya: Files read karne ke liye
require('dotenv').config();

const app = express();

// CORS Setting
app.use(cors({
    origin: '*', 
    methods: ['GET', 'POST', 'DELETE'] // Aage delete bhi karenge isliye add kiya
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- NAYA CODE YAHAN HAI ---
// Ye line server ko bolegi ki folder me jo index.html hai, use website pe dikhao
app.use(express.static(__dirname)); 

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// Multer aur Cloudinary Storage Set karna
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'RoyalEvents_Gallery', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
    resource_type: 'auto' 
  },
});

const upload = multer({ storage: storage });

// API Route for Uploading
app.post('/upload', upload.single('mediaFile'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded!" });
        }

        const category = req.body.category;
        const fileUrl = req.file.path; 

        console.log("Upload Success!");
        console.log("Category:", category);
        console.log("Cloudinary URL:", fileUrl);
        
        res.status(200).json({ 
            success: true, 
            message: "File uploaded to Cloudinary successfully!",
            category: category,
            url: fileUrl 
        });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ success: false, message: "Upload failed on server." });
    }
});

// Puraana app.get('/') wala hissa hata diya kyunki ab 'express.static' automatically index.html dikhayega

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
