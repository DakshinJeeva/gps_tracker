require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const jwt = require("jsonwebtoken");
require("./config/passport");
const registerUser = require("./fabric/registerUser");
const enrollUser = require("./fabric/enrollUser");

const User = require("./models/User");

const app = express();

// Middleware
app.use(express.json());

// Cookie session for passport
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false } // set secure:true in production with HTTPS
    })
);
app.use(passport.initialize());
app.use(passport.session());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// --------------------------------------------
// Google Auth Routes
// --------------------------------------------

// 1️⃣ Redirect to Google Login
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// 2️⃣ Google callback
app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        // Create JWT token
        const token = jwt.sign(
            { id: req.user._id, email: req.user.email },
            process.env.JWT_SECRET
        );

        res.json({
            message: "Login success",
            token,
            user: req.user
        });
    }
);

// --------------------------------------------

// Protected route example
app.get("/profile", async (req, res) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) return res.status(401).json({ error: "No token" });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        res.json({ user });
    } catch (error) {
        res.status(401).json({ error: "Invalid token" });
    }
});

app.post("/googleLogin", async (req, res) => {
  const googleUser = req.body; // contains email, name, googleId...

  // store user in MongoDB
  const user = await User.findOneAndUpdate(
    { email: googleUser.email },
    googleUser,
    { upsert: true, new: true }
  );

  // Register user in CA
  const secret = await registerUser(user.email);

  // Enroll user in CA
  const msp = await enrollUser(user.email, secret);

  // Optional: store MSP in MongoDB (encrypted)
  user.fabricIdentity = msp;
  await user.save();

  res.json({ message: "User logged in + enrolled in Fabric", msp });
});


const PORT = 5000;
app.listen(PORT, () => console.log(`Server up on ${PORT}`));
