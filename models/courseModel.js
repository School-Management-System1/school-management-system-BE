const mongoose = require('mongoose')
const courseSchema = new mongoose.Schema(
  {
    subject: {
      type: String,
      required: true,
      unique: true,
    },
    passMark: {
      type: Number,
      required: true,
    },
    mark: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// User Model
const Course = mongoose.model('Course', courseSchema)

module.exports = {
  Course,
  courseSchema,
}
