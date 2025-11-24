const express = require("express");
const router = express.Router();
const Coupon = require("../models/Coupon");
const requireAuth = require("../middleware/auth");

// list
router.get("/",  async (req, res) => {
  const list = await Coupon.find().populate("category").sort({ createdAt: -1 });
  res.json(list);
});

// create
router.post("/", requireAuth, async (req, res) => {
  const { title, description, code, url, category } = req.body;
  if (!title || !code)
    return res.status(400).json({ message: "title and code required" });

  const coupon = await Coupon.create({
    title,
    description,
    code,
    url,
    category: category || null,
  });

  res.json(coupon);
});

// update
router.put("/:id", requireAuth, async (req, res) => {
  const updates = req.body;
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, updates, {
    new: true,
  }).populate("category");

  if (!coupon) return res.status(404).json({ message: "not found" });

  res.json(coupon);
});

// delete
router.delete("/:id", requireAuth, async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ message: "Coupon deleted" });
});

module.exports = router;
