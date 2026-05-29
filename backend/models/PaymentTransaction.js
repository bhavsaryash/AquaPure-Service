import mongoose from 'mongoose';

const paymentTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: String,
      enum: ['razorpay'],
      default: 'razorpay',
    },
    razorpay_order_id: { type: String },
    razorpay_payment_id: { type: String, unique: true, sparse: true },
    razorpay_signature: { type: String },

    amount: { type: Number },
    currency: { type: String, default: 'INR' },

    status: {
      type: String,
      enum: ['created', 'verified', 'linked', 'failed'],
      default: 'created',
    },
    verifiedAt: { type: Date },

    contextType: { type: String, enum: ['service', 'amc', null], default: null },
    contextId: { type: mongoose.Schema.Types.ObjectId, default: null },

    raw: { type: Object },
  },
  { timestamps: true }
);

export default mongoose.model('PaymentTransaction', paymentTransactionSchema);

