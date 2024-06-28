import { buscarVideoEnYouTube, obtenerMetadataDeVideo, descargarAudio, descargarAudioDeYouTube, descargarVideoDeYouTube, combinarVideoAudio } from '../services/youtubeService.js';
import Song from '../models/song.js';
import Video from '../models/video.js';
import Youtube from '../models/youtube.js';
import path from 'path';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';

// Accede a tu clave API como una variable de entorno
const genAI = new GoogleGenerativeAI(process.env.GEMENI_API_KEY);
const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,  // Asegúrate de tener la clave API para Claude
});

// Leer géneros desde el archivo JSON
const genresData = JSON.parse(fs.readFileSync('./config/genres.json', 'utf-8')).genres;

const inferGenreWithGoogleGenerativeAI = async (title, author) => {
  if (!title || title.length === 0) {
    title = 'desconocido';
  }
  if (!author) {
    author = 'Descripción no proporcionada';
  }

  const prompt = `Determina el género musical de una canción con las siguientes características:\n\nEtiquetas: ${title}\nDescripción: ${author}\n\nLos géneros posibles incluyen: ${genresData.join(', ')}.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = await response.text();

    // Extraer solo el género de la respuesta
    const genreMatch = text.match(/\*\*(.*?)\*\*/);
    const genre = genreMatch ? genreMatch[1] : 'unknown';

    return { genre, source: 'Google Gemini' };
  } catch (error) {
    console.error('Error al inferir género con Google Generative AI:', error.message);
    return { genre: 'unknown', source: 'Google Gemini' };
  }
};

const inferGenreWithClaude = async (title, author) => {
  const prompt = `Determina el género musical de una canción con las siguientes características:\n\nEtiquetas: ${title}\nDescripción: ${author}\n\nLos géneros posibles incluyen: ${genresData.join(', ')}.`;

  try {
    const response = await anthropic.completions.create({
      model: 'claude-3-sonnet-20240229',
      prompt,
      max_tokens_to_sample: 300,
    });

    const text = response.completion;

    // Extraer solo el género de la respuesta
    const genreMatch = text.match(/\*\*(.*?)\*\*/);
    const genre = genreMatch ? genreMatch[1] : 'unknown';

    console.log('GENERO (Claude)', genre);
    return { genre, source: 'Claude' };
  } catch (error) {
    console.error('Error al inferir género con Claude:', error.message);
    return { genre: 'unknown', source: 'Claude' };
  }
};

export const descargarMultimedia = async (req, res) => {
  const { nombreVideo } = req.body;

  try {
    const videoId = await buscarVideoEnYouTube(nombreVideo);
    if (!videoId) {
      return res.status(404).json({ message: 'Video no encontrado' });
    }

    const metadata = await obtenerMetadataDeVideo(videoId);
    const nombreArchivo = metadata.title.replace(/[\/:*?"<>|]/g, '');

    // Descargar audio para la música
    const audioFilePath = await descargarAudio(videoId, nombreArchivo);

    // Descargar audio para el video
    const videoAudioFilePath = await descargarAudioDeYouTube(videoId, nombreArchivo);

    // Descargar video
    const videoFilePath = await descargarVideoDeYouTube(videoId, nombreArchivo);

    // Inferir el género usando Google Generative AI
    let { genre, source } = await inferGenreWithGoogleGenerativeAI(metadata.title || '', metadata.author || '');

    if (genre === 'unknown') {
      const result = await inferGenreWithClaude(metadata.title || '', metadata.author || '');
      genre = result.genre;
      source = result.source;
    }

    console.log('GENERO', genre, 'SOURCE', source);

    if (videoAudioFilePath && videoFilePath) {
      const outputFilePath = path.join(process.cwd(), `${nombreArchivo}.mp4`);
      await combinarVideoAudio(videoFilePath, videoAudioFilePath, outputFilePath);

      // Mover el archivo combinado a la carpeta 'uploads/videos'
      const newVideoRelativePath = path.join('uploads/videos', `${nombreArchivo}.mp4`);
      const newVideoAbsolutePath = path.join(process.cwd(), newVideoRelativePath);

      fs.rename(outputFilePath, newVideoAbsolutePath, async (err) => {
        if (err) {
          console.error('Error al mover el archivo combinado:', err);
          return res.status(500).json({ message: 'Error al mover el archivo combinado' });
        } else {
          console.log(`Archivo combinado movido a: ${newVideoAbsolutePath}`);
          // Guardar metadata en el modelo Video
          const video = new Video({
            title: metadata.title,
            author: metadata.author,
            duration: metadata.duration,
            genre: genre,
            videoId: videoId,
            thumbnailPath: metadata.thumbnailPath,
            filePath: newVideoRelativePath,
            source: source
          });
          await video.save();
        }
      });
    }

    if (audioFilePath) {
      // Guardar metadata en el modelo Song
      const song = new Song({
        title: metadata.title,
        artist: metadata.author, // Asegúrate de usar 'artist' en lugar de 'author' aquí
        duration: metadata.duration,
        genre: genre,
        videoId: videoId,
        thumbnailPath: metadata.thumbnailPath,
        filePath: audioFilePath,
        source: source
      });
      await song.save();

      if (audioFilePath) {
        const youtube = new Youtube({ ...metadata, videoId });
        await youtube.save();
      }

      // Enviar respuesta una vez que ambos archivos se hayan procesado
      return res.status(200).json({ message: 'Audio y video descargados y guardados exitosamente', song });
    } else {
      return res.status(500).json({ message: 'Error durante la descarga de multimedia' });
    }

    res.status(200).json({ message: 'Análisis completado', genre, source });
  } catch (error) {
    console.error('Error durante el proceso de descarga:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

export const obtenerCanciones = async (req, res) => {
  try {
    const songs = await Song.find();
    res.status(200).json(songs);
  } catch (error) {
    console.error('Error al obtener canciones:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

export const obtenerVideos = async (req, res) => {
  try {
    const videos = await Video.find();
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error al obtener videos:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};