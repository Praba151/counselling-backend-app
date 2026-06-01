const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./models/User");
const Counselor = require("./models/Counselor");

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    const existing = await User.findOne({ email: "priya@mindbridge.com" });
    if (existing) {
      console.log("Demo counselor already exists. Skipping.");
      process.exit();
    }
    const hashedPassword = await bcrypt.hash("counselor123", 10);
    const user = await User.create({
      name: "Dr. Priya Sharma",
      email: "priya@mindbridge.com",
      password: hashedPassword,
      role: "counselor",
    });
    await Counselor.create({
      userId: user._id,
      bio: "I am a licensed counselor with 8 years of experience helping people with mental health, relationships, and career challenges. I create a safe, non-judgmental space for all my clients.",
      expertise: ["Mental Health", "Relationship Advice", "Stress Management"],
      sessionTypes: ["Mental Health", "Relationship Advice", "Career Counseling"],
      pricePerSession: 500,
      availableSlots: [
        { date: "2025-06-10", time: "10:00 AM", isBooked: false },
        { date: "2025-06-10", time: "2:00 PM",  isBooked: false },
        { date: "2025-06-11", time: "11:00 AM", isBooked: false },
        { date: "2025-06-12", time: "3:00 PM",  isBooked: false },
        { date: "2025-06-13", time: "10:00 AM", isBooked: false },
      ],
    });

    console.log("✅ Demo counselor created successfully!");
    console.log("   Email: priya@mindbridge.com");
    console.log("   Password: counselor123");
    process.exit();

  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seedData();
