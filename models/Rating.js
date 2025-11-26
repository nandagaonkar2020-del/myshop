const mongoose = require("mongoose");

const ratingSchema = new mongoose.Schema({
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true,
  },
  rating: { type: Number, required: true, min: 1, max: 5 },
  userToken: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Ensure one rating per userToken per category
ratingSchema.index({ categoryId: 1, userToken: 1 }, { unique: true });

module.exports = mongoose.models.Rating || mongoose.model("Rating", ratingSchema);