require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 5000;

/* -----------------------------------------------------
   MIDDLEWARES
----------------------------------------------------- */
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

/* -----------------------------------------------------
   CRITICAL: SERVE STATIC FILES - FIXED ORDER
----------------------------------------------------- */
// Serve uploads folder FIRST
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log("✅ Created uploads directory:", uploadsPath);
}

app.use("/uploads", express.static(uploadsPath, {
  maxAge: "1d",
  etag: true,
  setHeaders: (res, path) => {
    res.set("Access-Control-Allow-Origin", "*");
  }
}));

// Serve public folder
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir));

console.log("✅ Serving uploads from:", uploadsPath);
console.log("✅ Serving public from:", publicDir);

/* -----------------------------------------------------
   PROTECT DASHBOARD
----------------------------------------------------- */
app.use("/dashboard.html", (req, res, next) => {
  const token = req.cookies.token;
  if (!token) return res.redirect("/auth.html");

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.redirect("/auth.html");
  }
});

/* -----------------------------------------------------
   DATABASE CONNECTION
----------------------------------------------------- */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/* -----------------------------------------------------
   SEED ADMIN
----------------------------------------------------- */
const Admin = require("./models/Admin");
(async function seedAdmin() {
  try {
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
      if (!existing) {
        const bcrypt = require("bcryptjs");
        const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await Admin.create({ email: process.env.ADMIN_EMAIL, passwordHash: hash });
        console.log("✅ Admin seeded:", process.env.ADMIN_EMAIL);
      }
    }
  } catch (err) {
    console.error("❌ Admin seed error:", err);
  }
})();

/* -----------------------------------------------------
   API ROUTES
----------------------------------------------------- */
app.use("/api/auth", require("./routes/auth"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/categories", require("./routes/categories"));
app.use("/api/coupons", require("./routes/coupons"));

/* -----------------------------------------------------
   DEBUG & TEST ROUTES
----------------------------------------------------- */
// Test uploads accessibility
app.get("/test-uploads", (req, res) => {
  try {
    const files = fs.readdirSync(uploadsPath);
    const fileInfo = files.map(file => {
      const filePath = path.join(uploadsPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        url: `http://localhost:${PORT}/uploads/${file}`,
        directUrl: `/uploads/${file}`,
        size: stats.size,
        created: stats.birthtime
      };
    });

    res.json({
      success: true,
      uploadsPath,
      fileCount: files.length,
      files: fileInfo
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      uploadsPath,
      exists: fs.existsSync(uploadsPath)
    });
  }
});

// Test individual file access
app.get("/test-file/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsPath, filename);
  
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ 
      error: "File not found", 
      filePath,
      files: fs.readdirSync(uploadsPath) 
    });
  }
});

/* -----------------------------------------------------
   BRAND PAGE
----------------------------------------------------- */
app.get("/brand/:slug", (req, res) => {
  res.sendFile(path.join(publicDir, "brand.html"));
});

/* -----------------------------------------------------
   ROOT ROUTE
----------------------------------------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "auth.html"));
});

/* -----------------------------------------------------
   CATCH ALL ROUTES
----------------------------------------------------- */
app.get("*", (req, res) => {
  res.status(404).sendFile(path.join(publicDir, "404.html"));
});

/* -----------------------------------------------------
   START SERVER
----------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads accessible at: http://localhost:${PORT}/uploads/`);
  console.log(`🔧 Test uploads: http://localhost:${PORT}/test-uploads`);
});