const express = require('express')
require('dotenv').config()
const app = express()
const connectDB = require('./config/db.js')
const userModel = require('./models/userModel.js')
const courseModel = require('./models/courseModel.js')
const { Message, GroupChat } = require('./models/messageModal.js')

const bcrypt = require('bcryptjs')
const cors = require('cors')
const jwt = require('jsonwebtoken')

const jwtSecret = process.env.JWT

app.use(cors())

// Connect with DB
connectDB()

// Body Parser Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Check the Credintal user
function authenticateToken(req, res, next) {
  // Get the token from the request headers
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  // If the token is not present, return a 401 Unauthorized response
  if (!token) {
    return res.status(401).json({ message: 'Missing token' })
  }

  // Verify the token using the jwtSecret
  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' })
    }

    // If the token is valid, set the user object on the request and call next()
    req.user = user
    next()
  })
}

// ****** Messages ****** //

// Create a new message
app.post('/messages', authenticateToken, async (req, res) => {
  const { sender, receiver, body } = req.body

  const senderUser = await userModel.User.findById(sender, { password: 0 })
  const receiverUser = await userModel.User.findById(receiver, { password: 0 })
  if (!senderUser['isAdmin'] && !receiverUser['isAdmin']) {
    return res
      .status(400)
      .json({ message: 'Cannot Send messages between students!' })
  }
  const message = new Message({
    sender,
    receiver,
    body,
  })

  await message.save()

  res.json(message)
})

// Get all messages between two users
app.get(
  '/messages/:senderId/:receiverId',
  authenticateToken,
  async (req, res) => {
    const { senderId, receiverId } = req.params

    const senderUser = await userModel.User.findById(senderId, { password: 0 })
    const receiverUser = await userModel.User.findById(receiverId, {
      password: 0,
    })
    if (!senderUser['isAdmin'] && !receiverUser['isAdmin']) {
      return res.status(404).json({ message: 'No messages between students!' })
    }
    console.log(senderUser, receiverUser)
    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId },
      ],
    })

    res.json(messages)
  }
)

// ****** User ******* //

// Register endpoint
app.post('/register', async (req, res) => {
  const { username, email, password, repeatPassword } = req.body
  console.log(req.body)

  try {
    // Validate Username
    if (!username || username.length < 8) {
      return res
        .status(400)
        .json({ message: 'Username must be at least 8 characters long.' })
    }

    // Validate Email
    if (!email) {
      return res
        .status(400)
        .json({ message: 'Please provide an email address.' })
    }

    // Validate Password
    if (!password) {
      return res.status(400).json({ message: 'Please provide a password.' })
    }

    // Validate Repeated Password
    if (password !== repeatPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }

    // Create User
    const user = new userModel.User({ username, email, password })

    // Save User to Database
    await user.save()

    // Return Success Response
    // res.redirect(301,'http://localhost:3000/')
    res.status(200).json({ user, message: 'User registered successfully.' })
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate email error
      return res.status(400).send({ message: 'Email already in use' })
    }
    console.log(error.code)
    res.status(400).json({
      message:
        'Password have to be at least one uppercase letter, one lowercase letter, one digit, and one special character from the given set, and a minimum length of 6 characters',
    })
  }
})

// Login endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body

  // Find the user with the given email
  const user = await userModel.User.findOne({ email })

  if (!user) {
    // User not found error
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // const isMatch = await bcrypt.compare(password, user.password);
  // if (!isMatch) {
  //   return res.status(400).send('Invalid email or password');
  // }
  if (password !== user.password) {
    // Incorrect password error
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  // Check if the user active
  // user.active = true;
  if (!user.active) {
    return res.status(401).json({
      error:
        'This account is inactive, please wait for the administrator to activate your account',
    })
  }

  await user.save()

  // Create JWT token
  const accessToken = jwt.sign({ email: user.email }, jwtSecret, {
    expiresIn: '1d',
  })
  const refreshToken = jwt.sign({ email: user.email }, jwtSecret, {
    expiresIn: '7d',
  })
  res.status(200).json({
    _id: user._id,
    email: user.email,
    isAdmin: user.isAdmin,
    active: user.active,
    accessToken,
    refreshToken,
  })
})

// refresh access token endpoint
app.post('/api/refresh-token', (req, res) => {
  const { refreshToken } = req.body

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not provided' })
  }

  try {
    const decoded = jwt.verify(refreshToken, jwtSecret)

    // Create new access token
    const accessToken = jwt.sign({ email: decoded.email }, jwtSecret, {
      expiresIn: '1h',
    })

    res.json({ accessToken })
  } catch (err) {
    res.status(401).json({ message: 'Invalid refresh token' })
  }
})

// Get all users endpoint
app.get('/users', authenticateToken, async (req, res) => {
  try {
    const users = await userModel.User.find({})
    res.status(200).json(users)
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user by id endpoint
app.get('/users/:id', authenticateToken, async (req, res) => {
  const id = req.params.id

  try {
    const user = await userModel.User.findById(id, { password: 0 })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      active: user.active,
      isAdmin: user.isAdmin,
      courses: user.courses,
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user by email endpoint
app.get('/user/:email', authenticateToken, async (req, res) => {
  const email = req.params.email

  try {
    const user = await userModel.User.findOne({ email })
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.status(200).json({
      _id: user._id,
      username: user.username,
      email: user.email,
      active: user.active,
      isAdmin: user.isAdmin,
      courses: user.courses,
    })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Update user endpoint
app.patch('/users/update/:id', authenticateToken, async (req, res) => {
  const id = req.params.id
  const { username, email, active } = req.body

  try {
    const user = await userModel.User.findById(id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    if (username) {
      user.username = username
    }
    if (email) {
      user.email = email
    }
    if (active !== undefined) {
      user.active = active
    }
    await user.save()
    res.status(200).json(user)
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Delete user endpoint
app.delete('/users/delete/:id', authenticateToken, async (req, res) => {
  const id = req.params.id

  try {
    const user = await userModel.User.findByIdAndDelete(id)
    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    res.status(200).json({ message: 'User deleted successfully' })
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ****** Course ******* //

// Get all courses endpoint
app.get('/courses', authenticateToken, async (req, res) => {
  try {
    const courses = await courseModel.Course.find({})
    res.status(200).json(courses)
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get all user courses endpoint
app.get(
  '/courses/:userId/studentCourses',
  authenticateToken,
  async (req, res) => {
    try {
      const user = await userModel.User.findById(req.params.userId)
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      // coursesFields= user.courses.map(async (course)=>{
      //     // const sub = await courseModel.Course.findById(course);
      //     // console.log(sub);
      //     return {
      //         subject: sub.subject,
      //         passMark: sub.passMark,
      //         mark: sub.mark
      //     }
      // })
      // console.log(coursesFields);
      // Promise.all(coursesFields)
      //     .then((results) => {
      //         // handle the resolved values
      //         // console.log(results);
      //         res.status(200).json(results);
      //     })
      //     .catch((error) => {
      //         // handle any errors
      //         console.log(error);
      //     });
      res.status(200).json(user.courses)
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Add course endpoint
app.post('/courses/addCourse', authenticateToken, async (req, res) => {
  try {
    const course = new courseModel.Course({
      subject: req.body.subject,
      passMark: req.body.passMark,
    })
    await course.save()
    res.json({ course, message: 'Course added successfully.' })
  } catch (error) {
    console.error(error)
    res.status(500).json({ success: false, message: 'Failed to add course.' })
  }
})

// Assign course to user endpoint
app.post('/courses/:userId/:courseId/assign', async (req, res) => {
  try {
    const user = await userModel.User.findById(req.params.userId)
    const course = await courseModel.Course.findById(req.params.courseId)

    user.courses.push({
      _id: course['_id'],
      subject: course['subject'],
      passMark: course['passMark'],
      mark: course['mark'],
    })
    await user.save()
    res.json({
      user,
      success: true,
      message: 'Course added to user successfully.',
    })
  } catch (error) {
    console.error(error)
    res
      .status(500)
      .json({ success: false, message: 'Failed to add course to user.' })
  }
})

// Set course mark for student endpoint
app.patch(
  '/courses/:userId/:courseId/setMark',
  authenticateToken,
  async (req, res) => {
    const { mark } = req.body
    try {
      const user = await userModel.User.findById(req.params.userId)
      // const user = await userModel.User.findById(req.params.userId).populate('courses');
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }
      const course = user.courses.find(
        (course) => course._id == req.params.courseId
      )
      console.log(course)
      if (!course) {
        return res.status(404).json({ error: 'Course not found for this user' })
      }
      course.mark = mark
      // console.log(course)
      await userModel.User.updateOne({ _id: user._id }, user)
      // await courseModel.Course.findByIdAndUpdate(course._id, course)
      res.status(200).json(user)
    } catch (err) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

// Default endpoint
app.get('*', (req, res) => {
  res.send({ message: 'Page Not Found' })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
