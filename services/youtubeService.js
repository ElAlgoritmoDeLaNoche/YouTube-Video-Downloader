import axios from 'axios';
import ytdl from 'ytdl-core';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';

const createDirectories = () => {
  const dirs = [
    path.join(process.cwd(), 'uploads'),
    path.join(process.cwd(), 'uploads/music'),
    path.join(process.cwd(), 'uploads/videos'),
    path.join(process.cwd(), 'uploads/thumbnails')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

createDirectories();

export const buscarVideoEnYouTube = async (query) => {
  const videoCategoryId = 10;
  const urlBusqueda = `${process.env.URL_SEARCH_YT}?part=snippet&type=video&q=${encodeURIComponent(query)}&videoCategoryId=${videoCategoryId}&key=${process.env.API_KEY_YT}`;

  try {
    const response = await axios.get(urlBusqueda);
    const videos = response.data.items;
    if (videos.length === 0) {
      console.log('No se encontraron videos de música.');
      return null;
    }
    return videos[0].id.videoId;
  } catch (error) {
    console.error('Error durante la búsqueda:', error.response?.data?.error?.message || error.message);
    return null;
  }
};

export const obtenerMetadataDeVideo = async (videoId) => {
  const url = `${process.env.URL_WATCH_YT}?v=${videoId}`;
  try {
    const info = await ytdl.getInfo(url);
    const metadata = {
      title: info.videoDetails.title,
      author: info.videoDetails.author.name,
      duration: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url
    };
    console.log('Metadata del Video:', metadata);

    // Guardar la portada
    const thumbnailUrl = metadata.thumbnail;
    const thumbnailRelativePath = path.join('uploads/thumbnails', `${metadata.title.replace(/[\/:*?"<>|]/g, '')}.jpg`);
    const thumbnailAbsolutePath = path.join(process.cwd(), thumbnailRelativePath);
    const writer = fs.createWriteStream(thumbnailAbsolutePath);
    const response = await axios({
      url: thumbnailUrl,
      method: 'GET',
      responseType: 'stream'
    });

    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log(`Portada guardada en: ${thumbnailAbsolutePath}`);

    return { ...metadata, thumbnailPath: thumbnailRelativePath };
  } catch (error) {
    console.error('Error al obtener la metadata del video:', error);
    return null;
  }
};

export const descargarAudio = async (videoId, nombreArchivo) => {
  const url = `${process.env.URL_WATCH_YT}?v=${videoId}`;
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    if (!format) {
      console.log('No se encontró un formato de audio adecuado.');
      return null;
    }

    const tempFilePath = path.join(process.cwd(), `${nombreArchivo}_temp.mp3`);
    const outputFilePath = path.join(process.cwd(), 'uploads/music', `${nombreArchivo}.mp3`);
    const writer = fs.createWriteStream(tempFilePath);

    return new Promise((resolve, reject) => {
      ytdl(url, { format: format })
        .on('progress', (chunkLength, downloaded, total) => {
          const percent = (downloaded / total) * 100;
          console.log(`Progreso de descarga de audio: ${percent.toFixed(2)}%`);
        })
        .pipe(writer)
        .on('finish', () => {
          console.log(`Descarga de audio completada: ${tempFilePath}`);
          fs.stat(tempFilePath, (err, stats) => {
            if (err) {
              console.error('Error al verificar el archivo:', err);
              reject(err);
            } else if (stats.size < 1024) {
              console.error('El archivo descargado parece estar corrupto o incompleto.');
              reject(new Error('El archivo descargado parece estar corrupto o incompleto.'));
            } else {
              console.log('El archivo de audio se descargó correctamente y parece estar íntegro.');
              // Convertir el audio a 320 kbps
              ffmpeg(tempFilePath)
                .audioCodec('libmp3lame')
                .audioBitrate('320k')
                .on('progress', (progress) => {
                  console.log(`Progreso de conversión de audio: ${progress.percent.toFixed(2)}%`);
                })
                .on('end', () => {
                  console.log(`Conversión de audio completada: ${outputFilePath}`);
                  fs.unlinkSync(tempFilePath); // Eliminar el archivo temporal
                  resolve(`uploads/music/${nombreArchivo}.mp3`); // Retornar la ruta relativa del archivo
                })
                .on('error', (err) => {
                  console.error('Error durante la conversión:', err);
                  reject(err);
                })
                .save(outputFilePath);
            }
          });
        })
        .on('error', (err) => {
          console.error('Error al descargar el audio:', err);
          reject(err);
        });
    });
  } catch (error) {
    console.error('Error durante la descarga de audio:', error);
    throw error;
  }
};

export const descargarAudioDeYouTube = async (videoId, nombreArchivo) => {
  const url = `${process.env.URL_WATCH_YT}?v=${videoId}`;
  const audioFilePath = path.join(process.cwd(), `${nombreArchivo}.audio.mp4`);
  const tempAudioFilePath = path.join(process.cwd(), `${nombreArchivo}.temp.audio.mp4`);

  try {
    const audioStream = ytdl(url, { quality: 'highestaudio' });
    const audioWriter = fs.createWriteStream(tempAudioFilePath);
    audioStream.pipe(audioWriter);

    await new Promise((resolve, reject) => {
      audioWriter.on('finish', resolve);
      audioWriter.on('error', reject);
    });

    await new Promise((resolve, reject) => {
      ffmpeg(tempAudioFilePath)
        .audioCodec('aac')
        .format('mp4')
        .on('progress', (progress) => {
          console.log(`Progreso de conversión de audio: ${progress.percent.toFixed(2)}%`);
        })
        .on('end', resolve)
        .on('error', reject)
        .save(audioFilePath);
    });

    fs.unlink(tempAudioFilePath, (err) => {
      if (err) {
        console.error('Error al eliminar el archivo de audio temporal:', err);
      } else {
        console.log(`Archivo de audio temporal eliminado: ${tempAudioFilePath}`);
      }
    });

    return audioFilePath;

  } catch (error) {
    console.error('Error durante la descarga de audio:', error);
    return null;
  }
};

export const descargarVideoDeYouTube = async (videoId, nombreArchivo) => {
  const url = `${process.env.URL_WATCH_YT}?v=${videoId}`;
  const videoFilePath = path.join(process.cwd(), `${nombreArchivo}.video.mp4`);

  try {
    const videoStream = ytdl(url, { quality: 'highestvideo' });
    const videoWriter = fs.createWriteStream(videoFilePath);

    ytdl(url, { quality: 'highestvideo' })
      .on('progress', (chunkLength, downloaded, total) => {
        const percent = (downloaded / total) * 100;
        console.log(`Progreso de descarga de video: ${percent.toFixed(2)}%`);
      })
      .pipe(videoWriter)
      .on('finish', () => {
        console.log(`Descarga de video completada: ${videoFilePath}`);
      })
      .on('error', (err) => {
        console.error('Error al descargar el video:', err);
      });

    await new Promise((resolve, reject) => {
      videoWriter.on('finish', resolve);
      videoWriter.on('error', reject);
    });

    return videoFilePath;

  } catch (error) {
    console.error('Error durante la descarga de video:', error);
    return null;
  }
};

export const combinarVideoAudio = async (videoFilePath, audioFilePath, outputFilePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoFilePath)
      .videoCodec('libx264')
      .input(audioFilePath)
      .audioCodec('aac')
      .format('mp4')
      .outputOptions('-shortest')
      .on('progress', (progress) => {
        console.log(`Progreso de combinación de video y audio: ${progress.percent.toFixed(2)}%`);
      })
      .on('end', () => {
        console.log(`Combinación de video y audio completada: ${outputFilePath}`);
        fs.unlink(videoFilePath, (err) => {
          if (err) {
            console.error('Error al eliminar el archivo de video temporal:', err);
          } else {
            console.log(`Archivo de video temporal eliminado: ${videoFilePath}`);
          }
        });
        fs.unlink(audioFilePath, (err) => {
          if (err) {
            console.error('Error al eliminar el archivo de audio temporal:', err);
          } else {
            console.log(`Archivo de audio temporal eliminado: ${audioFilePath}`);
          }
        });
        resolve();
      })
      .on('error', reject)
      .save(outputFilePath);
  });
};