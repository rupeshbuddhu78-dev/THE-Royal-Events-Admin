const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

const app = express();

// CORS Setting: GitHub Pages ki website ko allow karne ke liye
app.use(cors({
    origin: '*', // Abhi sab allow kiya hai, baad me yahan apne github page ka link daal dena
    methods: ['GET', 'POST']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    folder: 'RoyalEvents_Gallery', // Cloudinary me is folder me photo jayegi
    allowed_formats: ['jpg', 'jpeg', 'png', 'mp4', 'mov'],
    resource_type: 'auto' // Ye image aur video dono ko support karega
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

        // TODO: Is 'fileUrl' aur 'category' ko MongoDB me save karna hoga next step me
        console.log("Upload Success!");
        console.log("Category:", category);
        console.log("Cloudinary URL:", fileUrl);
        
        // Admin Page ko response wapas bhejna
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

// Test Route
app.get('/', (req, res) => {
    res.send("The Royal Events Backend is Running!");
});

// Server Start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
