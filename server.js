const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; // Official SDK
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
// Maine aapke screenshot se 100% sahi values daal di hain
cloudinary.config({
  cloud_name: 'dksk72xzh',
  api_key: '528438734126249',
  api_secret: 'DnmnEIWQD4eE1AmOlBHd3IAqA3Y' 
});

// Multer: Ab hum photo ko pehle memory me rakhenge fir bhejenge
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- 3. API ROUTE: UPLOAD (Official Stream Method) ---
app.post('/upload', upload.single('mediaFile'), async (req, res) => {
    console.log("🚦 Nayi Upload Request Aayi Hai...");

    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file selected!" });
        }

        // --- ASLI MAGIC YAHAN HAI (Official Cloudinary Upload) ---
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: "RoyalEvents_Gallery",
                resource_type: "auto", // Image aur Video dono ke liye
            },
            async (error, result) => {
                if (error) {
                    console.log("🚨 CLOUDINARY ERROR:", error.message);
                    return res.status(500).json({ success: false, message: error.message });
                }

                // Agar Cloudinary pe chali gayi, toh MongoDB me save karo
                try {
                    const newMedia = new Media({
                        category: req.body.category,
                        url: result.secure_url, // Cloudinary ka link
                        filename: result.public_id // Delete karne ke liye ID
                    });

                    await newMedia.save();
                    console.log("✅ Success! Photo live ho gayi.");

                    res.status(200).json({ 
                        success: true, 
                        message: "Success!",
                        url: result.secure_url 
                    });
                } catch (dbErr) {
                    res.status(500).json({ success: false, message: "DB Error" });
                }
            }
        );

        // Photo ka data pipe (bhej) rahe hain Cloudinary ko
        uploadStream.end(req.file.buffer);

    } catch (err) {
        console.log("🚨 SERVER ERROR:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
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
            // Official Delete Method
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
