require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
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
   ⭐ ANONYMOUS USER RATING TOKEN (IMPORTANT)
----------------------------------------------------- */
app.use((req, res, next) => {
  if (!req.cookies.ratingToken) {
    const newToken = uuidv4();
    res.cookie("ratingToken", newToken, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365 * 5, // 5 years
    });
    console.log("🍪 New rating token created");
  }
  next();
});

/* -----------------------------------------------------
   STATIC FILE HANDLING
----------------------------------------------------- */
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
   DEBUG & TEST ROUTES
----------------------------------------------------- */
app.get("/api/debug-routes", (req, res) => {
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const route = handler.route;
          routes.push({
            path: route.path,
            methods: Object.keys(route.methods)
          });
        }
      });
    }
  });
  
  res.json({
    message: "Registered routes",
    totalRoutes: routes.length,
    routes: routes.filter(route => route.path.includes('/api'))
  });
});

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    ratingToken: req.cookies.ratingToken ? "Present" : "Missing"
  });
});

/* -----------------------------------------------------
   API ROUTES
----------------------------------------------------- */
console.log("📋 Loading API routes...");

// Load routes with individual error handling
try {
  app.use("/api/auth", require("./routes/auth"));
  console.log("✅ Auth routes loaded");
} catch (err) {
  console.error("❌ Failed to load auth routes:", err.message);
}

try {
  app.use("/api/upload", require("./routes/upload"));
  console.log("✅ Upload routes loaded");
} catch (err) {
  console.error("❌ Failed to load upload routes:", err.message);
}

try {
  app.use("/api/categories", require("./routes/categories"));
  console.log("✅ Categories routes loaded");
} catch (err) {
  console.error("❌ Failed to load categories routes:", err.message);
}

try {
  app.use("/api/coupons", require("./routes/coupons"));
  console.log("✅ Coupons routes loaded");
} catch (err) {
  console.error("❌ Failed to load coupons routes:", err.message);
}

// RATING ROUTES - USING REAL MONGODB DATA
try {
  console.log("📁 Loading rating routes with MongoDB...");
  
  const ratingRoutesPath = path.join(__dirname, "routes", "rating.js");
  if (!fs.existsSync(ratingRoutesPath)) {
    console.error("❌ Rating routes file does not exist:", ratingRoutesPath);
    throw new Error("Rating routes file not found");
  }
  
  console.log("✅ Rating routes file exists");
  const ratingRoutes = require('./routes/rating');
  
  if (ratingRoutes && typeof ratingRoutes === 'function') {
    app.use('/api', ratingRoutes);
    console.log("✅ Rating routes loaded successfully - USING REAL MONGODB DATA");
  } else {
    console.error("❌ Rating routes is not a valid Express router");
    throw new Error("Invalid rating routes export");
  }
  
} catch (err) {
  console.error("❌ CRITICAL: Failed to load rating routes:", err.message);
  
  // Emergency fallback routes (will show 0 ratings)
  app.get("/api/rating/:categoryId", (req, res) => {
    console.log("🔄 Emergency fallback GET rating - NO MOCK DATA");
    res.json({ 
      avgRating: 0, 
      totalRatings: 0,
      message: "Rating system temporarily unavailable"
    });
  });

  app.post("/api/rate/:categoryId", (req, res) => {
    console.log("🔄 Emergency fallback POST rating - NO MOCK DATA");
    res.status(500).json({ 
      message: "Rating system temporarily unavailable - please try again later",
      error: "Real rating system failed to load"
    });
  });
}

console.log("✅ All API routes loaded");

// API REQUEST LOGGER
app.use("/api/*", (req, res, next) => {
  console.log(`🔍 [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

/* -----------------------------------------------------
   UPLOAD TEST ROUTES
----------------------------------------------------- */
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
   ROOT
----------------------------------------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "auth.html"));
});

/* -----------------------------------------------------
   404 PAGE
----------------------------------------------------- */
app.get("*", (req, res) => {
  // Don't send 404 for API routes - return JSON instead
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({
      error: "API endpoint not found",
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  }
  res.status(404).sendFile(path.join(publicDir, "404.html"));
});

/* -----------------------------------------------------
   START SERVER
----------------------------------------------------- */
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Uploads accessible at: http://localhost:${PORT}/uploads/`);
  console.log(`🔧 Test uploads: http://localhost:${PORT}/test-uploads`);
  console.log(`🔍 Debug routes: http://localhost:${PORT}/api/debug-routes`);
  console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Rating system: USING REAL MONGODB DATA`);
});