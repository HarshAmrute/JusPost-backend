const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // Your frontend URL
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

// Middleware
const allowedOrigins = ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
app.use(express.json());

// Make io accessible to our router
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected');
  // Ensure admin user exists
  const User = require('./models/userModel');
  const seedAdmin = async () => {
    try {
      const admin = await User.findOneAndUpdate(
        { username: 'harsh-admin' },
        { username: 'harsh-admin', nickname: 'Admin', role: 'admin' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log('Admin user ensured:', admin.username);
    } catch (error) {
      console.error('Error seeding admin user:', error);
    }
  };
  seedAdmin();
}).catch(err => console.log('MongoDB connection error:', err));

// Routes
app.get('/', (req, res) => {
  res.send('JusPost Backend API is running...');
});
const postsRoutes = require('./routes/posts');
const usersRoutes = require('./routes/users');
const privatePostsRoutes = require('./routes/privatePosts');

app.use('/api/posts', postsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/private-posts', privatePostsRoutes);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
