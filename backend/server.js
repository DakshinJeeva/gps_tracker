require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const jwt = require("jsonwebtoken");
require("./config/passport"); // Google strategy
const registerUser = require("./fabric/registerUser");
const enrollUser = require("./fabric/enrollUser");

const User = require("./models/User");

const app = express();

// ---------------------
// Middleware
// ---------------------
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // true in production with HTTPS
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ---------------------
// MongoDB connection
// ---------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ---------------------
// Google OAuth Routes
// ---------------------

// 1️⃣ Redirect to Google login
app.get("/auth/google", (req, res, next) => {
  console.log("➡️ Redirecting to Google login...");
  next();
}, passport.authenticate("google", { scope: ["profile", "email"] }));

// 2️⃣ Callback + Fabric automatic enrollment
app.get("/auth/google/callback",
  (req, res, next) => {
    console.log("➡️ Google callback route hit");
    next();
  },
  passport.authenticate("google", { failureRedirect: "/login" }),
  async (req, res) => {
    try {
      console.log("🔥 Inside callback handler");
      console.log("User object from Google:", req.user);

      // 1️⃣ Find or create user in MongoDB
      let user = await User.findOne({ email: req.user.email });
      console.log("Found user in DB:", user);

      if (!user) {
        console.log("User not found. Creating new user...");
        user = await User.create({
          googleId: req.user.googleId,
          email: req.user.email,
          name: req.user.name,
          picture: req.user.picture
        });
        console.log("New user created:", user);
      }

      // 2️⃣ Check Fabric identity
      console.log("Checking Fabric identity...");
      if (!user.fabricIdentity || !user.fabricIdentity.credentials?.certificate) {
        console.log("Fabric identity not found. Registering user in CA...");

        const secret = await registerUser(user.email);
        console.log("Secret from CA:", secret);

        const msp = await enrollUser(user.email, secret);
        console.log("MSP enrolled:", msp);

        // Save Fabric MSP in MongoDB
        user.fabricIdentity = msp;
        await user.save();
        console.log("Fabric identity saved to MongoDB");
      } else {
        console.log("User already has a Fabric identity:", user.fabricIdentity);
      }

      // 3️⃣ Create JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );
      console.log("JWT token created:", token);

      res.json({
        message: "Login + Fabric enrollment success",
        token,
        user
      });

    } catch (err) {
      console.error("❌ Error in Google callback:", err);
      res.status(500).json({
        error: "Fabric enrollment or login failed",
        details: err.message
      });
    }
  }
);

// ---------------------
// Protected route example
// ---------------------
app.get("/profile", async (req, res) => {
  try {
    console.log("➡️ /profile route hit");
    const token = req.headers.authorization?.split(" ")[1];
    console.log("Token received:", token);
    if (!token) return res.status(401).json({ error: "No token provided" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded);

    const user = await User.findById(decoded.id);
    console.log("User fetched from DB:", user);

    res.json({ user });
  } catch (error) {
    console.error("❌ Error in /profile route:", error);
    res.status(401).json({ error: "Invalid token" });
  }
});

// ---------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
