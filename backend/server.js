// Dependencies import karo
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const Message = require("./models/Message");

// Express app initialize karo
const app = express();
const server = http.createServer(app);

// Update: allow multiple origins (Vercel and Localhost)
const allowedOrigins = [
  "https://chat-application-xupo.vercel.app",
  "http://localhost:3000",
  "http://localhost:5173" // For Vite users
];

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Connection with error handling
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully!"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
  });

// Basic route
app.get("/", (req, res) => {
  res.send("Chat Server is Running! 🚀");
});

// Health check route for Vercel
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// API: Get all previous messages
app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(50);
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Socket.io Connection Handler
io.on("connection", (socket) => {
  console.log("👤 User connected:", socket.id);

  socket.on("user-joined", (username) => {
    socket.broadcast.emit("user-joined", username);
  });

  socket.on("send-message", async (data) => {
    try {
      const newMessage = new Message({
        username: data.username,
        message: data.message,
      });
      await newMessage.save();

      io.emit("receive-message", {
        username: data.username,
        message: data.message,
        timestamp: newMessage.timestamp,
      });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("👋 User disconnected");
  });
});

// Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// CRITICAL FIX FOR VERCEL: Export the app
module.exports = app;