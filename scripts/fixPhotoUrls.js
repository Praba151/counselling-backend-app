require('dotenv').config();
const mongoose = require('mongoose');
const CounselorProfile = require('../models/CounselorProfile');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await CounselorProfile.collection.updateMany(
    { photoUrl: { $in: [500, '500'] } },
    { $set: { photoUrl: '' } }
  );
  console.log(`Fixed ${result.modifiedCount} profile(s).`);
  await mongoose.disconnect();
})();