const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const courseModel = require('./courseModel.js')

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      minlength: 8,
    },
    email: {
      type: String,
      required: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      /* 
        (?=.*[0-9]) - Assert a string has at least one number;
        (?=.*[!@#$%^&*]) - Assert a string has at least one special character.
        */
      match:
        /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+=[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+=[\]{};':"\\|,.<>/?]{6,}$/,
      // match: /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/
    },
    active: {
      type: Boolean,
      default: false,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    courses: [],
  },
  {
    timestamps: true,
  }
)

// Encrypting password
// userSchema.pre('save', async function (next) {
//     const user = this;
//     if (user.isModified('password') || user.isNew) {
//       const hash = await bcrypt.hash(user.password, 10);
//       user.password = hash;
//     }
//     next();
//   });

// User Model
const User = mongoose.model('User', userSchema)

module.exports = {
  User,
}
