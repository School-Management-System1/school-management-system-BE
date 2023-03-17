const mongoose = require('mongoose')

// Message schema
const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  body: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
})

// Group chat schema
const groupChatSchema = new mongoose.Schema({
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  messages: [messageSchema],
})

const Message = mongoose.model('Message', messageSchema)
const GroupChat = mongoose.model('GroupChat', groupChatSchema)
module.exports = {
  Message,
  GroupChat,
}
