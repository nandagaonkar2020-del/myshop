const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const requireAuth = require("../middleware/auth");

// list (admin + frontend)
router.get("/", async (req, res) => {
  try {
    const list = await Category.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to load categories" });
  }
});

// create
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, imagePath, bannerImagePath } = req.body;

    if (!title || !imagePath || !bannerImagePath) {
      return res.status(400).json({ 
        message: "Title, logo image, and banner image are required" 
      });
    }

    // generate slug
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");

    // Check if slug already exists
    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: "Category with this title already exists" });
    }

    const cat = await Category.create({
      title,
      imagePath,
      bannerImagePath,
      slug
    });

    console.log('✅ Category created:', cat.title);
    res.json(cat);

  } catch (error) {
    console.error('❌ Create category error:', error);
    res.status(500).json({ message: "Failed to create category" });
  }
});

// update
router.put("/:id", requireAuth, async (req, res) => {
  try {
    const { title, imagePath, bannerImagePath } = req.body;

    const cat = await Category.findById(req.params.id);
    if (!cat) return res.status(404).json({ message: "Category not found" });

    // Update fields if provided
    if (title) {
      cat.title = title;
      // Only update slug if title changes
      cat.slug = title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9\-]/g, "");
    }

    if (imagePath) cat.imagePath = imagePath;
    if (bannerImagePath) cat.bannerImagePath = bannerImagePath;

    await cat.save();
    console.log('✅ Category updated:', cat.title);
    res.json(cat);

  } catch (error) {
    console.error('❌ Update category error:', error);
    res.status(500).json({ message: "Failed to update category" });
  }
});

// delete
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    console.log('✅ Category deleted:', category.title);
    res.json({ message: "Category deleted successfully" });
    
  } catch (error) {
    console.error('❌ Delete category error:', error);
    res.status(500).json({ message: "Failed to delete category" });
  }
});

module.exports = router;