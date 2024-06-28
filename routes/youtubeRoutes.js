import express from 'express';
import { descargarMultimedia, obtenerCanciones, obtenerVideos } from '../controllers/youtubeController.js';

const router = express.Router();

router.post('/descargar-video', descargarMultimedia);
router.get('/obtener-songs', obtenerCanciones);
router.get('/obtener-videos', obtenerVideos);

export default router;