import mongoose from 'mongoose';

const youtubeSchema = new mongoose.Schema({
  title: String,
  author: String,
  duration: Number,
  videoId: String,
  createdAt: { type: Date, default: Date.now },
});

const Youtube = mongoose.model('Youtube', youtubeSchema);

export default Youtube;