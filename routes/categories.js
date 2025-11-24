const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const requireAuth = require("../middleware/auth");

// list (admin + frontend)
router.get("/", async (req, res) => {
  const list = await Category.find().sort({ createdAt: -1 });
  res.json(list);
});

// create
router.post("/", requireAuth, async (req, res) => {
  const { title, imagePath } = req.body;

  if (!title || !imagePath)
    return res.status(400).json({ message: "title and imagePath required" });

  // 🔥 AUTO GENERATE SLUG
  const slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, "");

  const cat = await Category.create({ title, imagePath, slug });

  res.json(cat);
});

// update
router.put("/:id", requireAuth, async (req, res) => {
  const { title, imagePath } = req.body;
  const cat = await Category.findById(req.params.id);

  if (!cat) return res.status(404).json({ message: "Not found" });

  if (title) {
    cat.title = title;

    // 🔥 UPDATE SLUG TOO
    cat.slug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }

  if (imagePath) cat.imagePath = imagePath;

  await cat.save();
  res.json(cat);
});

// delete
router.delete("/:id", requireAuth, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: "Category deleted" });
});

module.exports = router;
