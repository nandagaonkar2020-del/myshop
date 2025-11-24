const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const CouponSchema = new Schema({
  title: { type: String, required: true },
  description: String,
  code: { type: String, required: true },
  url: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category' }
}, { timestamps: true });

module.exports = mongoose.models.Coupon || mongoose.model('Coupon', CouponSchema);
