const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const dotenv = require('dotenv');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();

const app = express();
const server = http.createServer(app);

// Allow all origins (for global API access)
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

// Middleware
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// Inject io into requests
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

  // Seed admin
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
}).catch(err => console.error('MongoDB connection error:', err));

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

// Socket.IO Events
io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
