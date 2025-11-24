require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 5000;

/* -----------------------------------------------------
   MIDDLEWARES
----------------------------------------------------- */
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// Serve upload folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -----------------------------------------------------
   PROTECT STATIC HTML PAGES
----------------------------------------------------- */
const protectedPages = [
  "/dashboard.html",
];

app.use((req, res, next) => {
  if (!protectedPages.includes(req.path)) return next();

  const token = req.cookies.token;
  if (!token) return res.redirect("/auth.html");

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (err) {
    return res.redirect("/auth.html");
  }
});

/* -----------------------------------------------------
   SEO FRIENDLY BRAND PAGE ROUTE
----------------------------------------------------- */
app.get("/brand/:slug", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "brand.html"));
});

/* -----------------------------------------------------
   STATIC PUBLIC FOLDER
----------------------------------------------------- */
app.use(express.static(path.join(__dirname, "public")));

/* -----------------------------------------------------
   DATABASE CONNECTION
----------------------------------------------------- */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
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

        await Admin.create({
          email: process.env.ADMIN_EMAIL,
          passwordHash: hash,
        });

        console.log("Admin seeded:", process.env.ADMIN_EMAIL);
      }
    }
  } catch (err) {
    console.error("Admin seed error:", err);
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
   API 404
----------------------------------------------------- */
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API route not found" });
});

/* -----------------------------------------------------
   ROOT PAGE
----------------------------------------------------- */
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "auth.html"));
});

/* -----------------------------------------------------
   STATIC FILE MISSING → 404
----------------------------------------------------- */
app.use((req, res, next) => {
  if (req.path.includes(".")) {
    return res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
  }
  next();
});

/* -----------------------------------------------------
   EVERYTHING ELSE → 404
----------------------------------------------------- */
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

/* -----------------------------------------------------
   START SERVER
----------------------------------------------------- */
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
