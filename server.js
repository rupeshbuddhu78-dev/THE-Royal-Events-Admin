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

// B. Booking Model (Updated with Reference Image)
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
    referenceImage: String, // NAYA: Cloudinary ka URL yahan save hoga
    status: { type: String, default: 'Pending' }, // Pending, Confirmed, Completed
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

// Bulk Upload Gallery
app.post('/upload', upload.array('mediaFiles', 10), async (req, res) => {
    console.log(`🚦 Gallery Upload Request: ${req.files ? req.files.length : 0} files.`);
    try {
        if (!req.files || req.files.length === 0) return res.status(400).json({ success: false, message: "No files!" });
        const uploadResults = [];
        for (const file of req.files) {
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            const result = await cloudinary.uploader.unsigned_upload(fileBase64, "royal_preset", { resource_type: "auto" });
            const newMedia = new Media({ category: req.body.category, url: result.secure_url, filename: result.public_id });
            await newMedia.save();
            uploadResults.push(result.secure_url);
        }
        res.status(200).json({ success: true, message: `${uploadResults.length} photos uploaded!`, urls: uploadResults });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

// Get Gallery
app.get('/media', async (req, res) => {
    try {
        const items = await Media.find().sort({ _id: -1 });
        res.json({ items });
    } catch (err) { res.status(500).json({ success: false }); }
});

// Delete Gallery Media
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
            } catch (cloudErr) { console.log(`⚠️ Cloudinary pe nahi mila, par aage badh rahe hain...`); }
            await Media.findByIdAndDelete(req.params.id);
        }
        res.json({ success: true, message: "Item removed!" });
    } catch (err) { 
        res.status(500).json({ success: false }); 
    }
});


// ==========================================
//          📝 BOOKING APIs (UPDATED)
// ==========================================

// 1. Submit New Booking (Website se aayega, ab Photo ke sath!)
// upload.single('referenceImage') isiliye lagaya taaki image handle ho sake
app.post('/api/bookings', upload.single('referenceImage'), async (req, res) => {
    try {
        let uploadedImageUrl = "";

        // Check karo ki form ke sath koi photo aayi hai ya nahi
        if (req.file) {
            console.log("📸 Booking ke sath ek suggestion photo aayi hai!");
            const fileBase64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
            
            // Photo Cloudinary pe upload karo
            const result = await cloudinary.uploader.unsigned_upload(fileBase64, "royal_preset", { resource_type: "auto" });
            uploadedImageUrl = result.secure_url; // Cloudinary ka link save karlo
        }

        // MongoDB ke liye naya booking object banao (text + image URL)
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
            referenceImage: uploadedImageUrl // 👈 Link database me chala gaya
        });

        await newBooking.save();
        console.log("🔔 New Booking Saved Successfully:", req.body.name);
        
        res.status(201).json({ success: true, message: "Booking Saved Successfully!" });
    } catch (err) {
        console.log("❌ Booking Error:", err.message);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// 2. Get All Bookings (Admin Dashboard ke liye)
app.get('/api/bookings', async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ dateSubmit: -1 });
        res.json({ success: true, data: bookings });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 3. Update Booking Status (Pending -> Confirmed)
app.put('/api/bookings/:id', async (req, res) => {
    try {
        await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true, message: "Status Updated!" });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 4. Delete Booking
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

// 1. Submit Review with Multiple Photos/Videos
app.post('/api/reviews', upload.array('reviewMedia', 10), async (req, res) => {
    try {
        console.log(`⭐ New Review from ${req.body.name} with ${req.files ? req.files.length : 0} files.`);
        const uploadedMedia = [];

        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
                const result = await cloudinary.uploader.unsigned_upload(fileBase64, "royal_preset", { resource_type: "auto" });
                
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

// 2. Get All Reviews
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 }); 
        res.json({ success: true, data: reviews });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

// 3. Delete Review
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
