import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 20,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      // No default — absent on guest users so the sparse unique index ignores them
    },
    avatar: {
      type: String,
      default: '',
    },
    passwordHash: {
      type: String,
      // No default — absent on guest/Google users
    },
    googleId: {
      type: String,
      // No default — absent on guest/email users
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    gamesPlayed: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Sparse unique indexes — null values are excluded from uniqueness enforcement
userSchema.index({ email: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

const User = mongoose.model('User', userSchema);

export default User;
