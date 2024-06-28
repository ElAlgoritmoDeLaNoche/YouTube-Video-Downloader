import express from 'express';
import connectDB from './config/database.js';
import youtubeRoutes from './routes/youtubeRoutes.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());

connectDB();

app.use('/api', youtubeRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});