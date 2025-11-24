const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  imagePath: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.models.Category || mongoose.model('Category', CategorySchema);
