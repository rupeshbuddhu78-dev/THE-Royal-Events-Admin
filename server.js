const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2; 
const mongoose = require('mongoose'); 
const https = require('https');
require('dotenv').config();

const app = express();

// --- SETTINGS ---
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'DELETE', 'PUT'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Form data read karne ke liye
app.use(express.static(__dirname)); 

// --- 1. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Ready for Royal Events!"))
  .catch(err => console.log("❌ DB Error:", err.message));

// --- DATABASE MODELS (TABLES) ---

// A. Gallery Model
const Media = mongoose.model('Media', new mongoose.Schema({
    category: String, 
    url: String, 
    filename: String 
}));

// B. Booking Model
const Booking = mongoose.model('Booking', new mongoose.Schema({
    name: String,
    phone: String,
    whatsapp: String,
    email: String,
    type: String,
    date: String,
    time: String,
    guests: String,
    location: String,
    budget: String,
    decor: String,
    catering: String,
    photography: String,
    band: String,
    message: String,
    referenceImage: String, // Cloudinary URL
    status: { type: String, default: 'Pending' }, 
    dateSubmit: { type: Date, default: Date.now }
}));

// C. Review Model
const Review = mongoose.model('Review', new mongoose.Schema({
    name: String,
    event: String,
    date: String,
    rating: Number,
    comment: String,
    media: Array, // Cloudinary URLs
    createdAt: { type: Date, default: Date.now }
}));

// D. Stage Model 
const Stage = mongoose.model('Stage', new mongoose.Schema({
    heading: String,
    text: String,
    price: String,
    imageUrl: String,    // Cloudinary URL
    imageId: String,     // Cloudinary Public ID (Delete karne ke kaam aayega)
    createdAt: { type: Date, default: Date.now }
}));

// --- 2. CLOUDINARY CONFIG ---
cloudinary.config({ 
  cloud_name: 'dksk72xzh',
  secure: true
}); 

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==========================================
//          📸 GALLERY APIs
// ==========================================

app.post('/upload', upload.array('mediaFiles', 10), async (req, res) => {
    console.log(`🚦 Gallery Upload Request: ${req.files ? req.files.length : 0} files.`);
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: "No files!" });
        const uploadResults = [];
        for (const file of req.files) {
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            
            const result = await cloudinary.uploader.unsigned_upload(fileBase64, "royal_preset", { 
                resource_type: "auto",
                folder: "Royal_Gallery" 
            });
            
            const newMedia = new Media({ category: req.body.category, url: result.secure_url, filename: result.public_id });
            await newMedia.save();
            uploadResults.push(result.secure_url);
        }
        res.status(200).json({ success: true, message: `${uploadResults.length} photos uploaded!`, urls: uploadResults });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

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
            try {
                await cloudinary.uploader.destroy(item.filename, {
                    api_key: '528438734126249',
                    api_secret: 'DnmnEIWQD4eE1AmOlBHd3IAqA3Y'
                });
                console.log(`☁️ Cloudinary se delete hua: ${item.filename}`);
            } catch (cloudErr) { console.log(`⚠️ Cloudinary pe nahi mila...`); }
            await Media.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true, message: "Item removed!" });
    } catch (err) { 
        res.status(500).json({ success: false }); 
    }
});


// ==========================================
//          ✨ STAGE DECOR APIs
// ==========================================

app.post('/api/stages', upload.single('stageImage'), async (req, res) => {
    try {
        console.log("✨ New Stage Upload Request!");
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a stage image." });
        }

        // 1. Upload to Cloudinary in 'Royal_Stages' folder
        const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const result = await cloudinary.uploader.unsigned_upload(fileBase64, "royal_preset", { 
            resource_type: "auto",
            folder: "Royal_Stages"
        });

        // 2. Save Data to MongoDB
        const newStage = new Stage({
            heading: req.body.heading,
            text: req.body.text,
            price: req.body.price,
            imageUrl: result.secure_url,
            imageId: result.public_id
        });

        await newStage.save();
        console.log("✅ New Stage Saved Successfully:", req.body.heading);
        
        res.status(201).json({ success: true, message: "Stage Added Successfully!", data: newStage });
    } catch (err) {
        console.log("❌ Stage Upload Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

app.get('/api/stages', async (req, res) => {
    try {
        const stages = await Stage.find().sort({ createdAt: -1 }); // Naya stage sabse upar dikhega
        res.json({ success: true, data: stages });
    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to fetch stages" });
    }
});

// 🔥 NAYA ADD KIYA HUA EDIT (PUT) API 🔥
app.put('/api/stages/:id', async (req, res) => {
    try {
        const { heading, text, price } = req.body;
        
        const updatedStage = await Stage.findByIdAndUpdate(
            req.params.id, 
            { heading, text, price }, 
            { new: true } // Update hone ke baad naya data return karega
        );
        
        if (!updatedStage) {
            return res.status(404).json({ success: false, message: "Stage not found!" });
        }

        console.log(`✏️ Stage Updated: ${updatedStage.heading}`);
        res.json({ success: true, message: "Stage Details Updated Successfully!", data: updatedStage });
    } catch (err) {
        console.log("❌ Stage Update Error:", err.message);
        res.status(500).json({ success: false, message: "Error updating stage details" });
    }
});

app.delete('/api/stages/:id', async (req, res) => {
    try {
        const stage = await Stage.findById(req.params.id);
        if (stage) {
            // Delete image from Cloudinary first
            try {
                if (stage.imageId) {
                    await cloudinary.uploader.destroy(stage.imageId, {
                        api_key: '528438734126249',
                        api_secret: 'DnmnEIWQD4eE1AmOlBHd3IAqA3Y'
                    });
                }
            } catch (cloudErr) {
                console.log(`⚠️ Cloudinary image delete failed:`, cloudErr);
            }
            // Delete from Database
            await Stage.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true, message: "Stage Deleted Successfully!" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error deleting stage" });
    }
});


// ==========================================
//          📝 BOOKING APIs
// ==========================================

app.post('/api/bookings', upload.single('referenceImage'), async (req, res) => {
    try {
        let uploadedImageUrl = "";

        if (req.file) {
            console.log("📸 Booking ke sath ek suggestion photo aayi hai!");
            const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            
            const result = await cloudinary.uploader.unsigned_upload(fileBase64, "royal_preset", { 
                resource_type: "auto",
                folder: "Royal_Bookings"
            });
            uploadedImageUrl = result.secure_url; 
        }

        const newBooking = new Booking({
            name: req.body.name,
            phone: req.body.phone,
            whatsapp: req.body.whatsapp,
            email: req.body.email,
            type: req.body.type,
            date: req.body.date,
            time: req.body.time,
            guests: req.body.guests,
            location: req.body.location,
            budget: req.body.budget,
            decor: req.body.decor,
            catering: req.body.catering,
            photography: req.body.photography,
            band: req.body.band,
            message: req.body.message,
            referenceImage: uploadedImageUrl 
        });

        await newBooking.save();
        console.log("🔔 New Booking Saved Successfully:", req.body.name);
        
        res.status(201).json({ success: true, message: "Booking Saved Successfully!" });
    } catch (err) {
        console.log("❌ Booking Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ dateSubmit: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.put('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true, message: "Status Updated!" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Booking Deleted!" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});


// ==========================================
//          ⭐ REVIEW APIs
// ==========================================

app.post('/api/reviews', upload.array('reviewMedia', 10), async (req, res) => {
    try {
        console.log(`⭐ New Review from ${req.body.name} with ${req.files ? req.files.length : 0} files.`);
        const uploadedMedia = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                
                const result = await cloudinary.uploader.unsigned_upload(fileBase64, "royal_preset", { 
                    resource_type: "auto",
                    folder: "Royal_Reviews"
                });
                
                const type = file.mimetype.startsWith('video/') ? 'video' : 'image';
                uploadedMedia.push({ url: result.secure_url, type: type });
            }
        }

        const newReview = new Review({
            name: req.body.name,
            event: req.body.event,
            date: req.body.date,
            rating: req.body.rating,
            comment: req.body.comment,
            media: uploadedMedia
        });

        await newReview.save();
        res.status(201).json({ success: true, message: "Review posted!", data: newReview });

    } catch (err) {
        console.log("❌ Review Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 }); 
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        await Review.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Review Deleted!" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});


// Keep Alive
setInterval(() => {
    https.get("https://the-royal-events-admin.onrender.com");
}, 800000);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Master Server Live on Port ${PORT}`));
