const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Rating = require("../models/Rating");
const Category = require("../models/Category");

console.log("🔥 Rating routes loaded - USING REAL MONGODB DATA");

// GET overall rating for a category (REAL DATA)
router.get("/rating/:categoryId", async (req, res) => {
  try {
    console.log("📊 GET REAL Rating for category:", req.params.categoryId);
    
    const { categoryId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    // REAL MongoDB aggregation
    const stats = await Rating.aggregate([
      { $match: { categoryId: new mongoose.Types.ObjectId(categoryId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const result = stats[0] || { avgRating: 0, totalRatings: 0 };
    result.avgRating = Number((result.avgRating || 0).toFixed(2));
    
    console.log("📊 REAL Rating result:", result);
    res.json(result);
    
  } catch (err) {
    console.error("❌ GET /api/rating error:", err);
    res.status(500).json({ message: "Failed to load rating" });
  }
});

// POST a rating for a category (REAL DATA)
router.post("/rate/:categoryId", async (req, res) => {
  try {
    console.log("⭐ POST REAL Rating:", {
      categoryId: req.params.categoryId,
      rating: req.body.rating,
      userToken: req.cookies.ratingToken ? "Present" : "Missing"
    });

    const { categoryId } = req.params;
    const { rating } = req.body;
    const userToken = req.cookies.ratingToken;

    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid category id" });
    }

    const r = Number(rating);
    if (!r || r < 1 || r > 5) {
      return res.status(400).json({ message: "Invalid rating value" });
    }

    // Ensure category exists
    const cat = await Category.findById(categoryId);
    if (!cat) {
      console.log("❌ Category not found:", categoryId);
      return res.status(404).json({ message: "Category not found" });
    }

    if (!userToken) {
      return res.status(400).json({ message: "User token required" });
    }

    // Create REAL rating in MongoDB
    await Rating.create({
      categoryId,
      rating: r,
      userToken
    });

    // Recompute stats with REAL data
    const stats = await Rating.aggregate([
      { $match: { categoryId: new mongoose.Types.ObjectId(categoryId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          totalRatings: { $sum: 1 }
        }
      }
    ]);

    const result = stats[0] || { avgRating: 0, totalRatings: 0 };
    result.avgRating = Number((result.avgRating || 0).toFixed(2));
    
    console.log("✅ REAL Rating submitted successfully:", result);
    res.json(result);

  } catch (err) {
    console.error("❌ POST /api/rate error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "You already rated this brand." });
    }
    res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;