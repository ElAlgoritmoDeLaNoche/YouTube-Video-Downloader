
# YouTube Video Downloader

Este proyecto permite buscar, descargar y combinar videos y audios de YouTube utilizando Node.js y MongoDB. La aplicación expone una API RESTful que puede ser probada utilizando Postman.

## Características

- Busca videos de YouTube por nombre.
- Descarga el video y el audio por separado.
- Combina el video y el audio en un archivo MP4.
- Guarda la metadata del video en MongoDB.

## Requisitos

- Node.js
- MongoDB
- ffmpeg

## Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/tu_usuario/youtube-video-downloader.git
cd youtube-video-downloader
```

2. Instala las dependencias:

```bash
yarn install
```

3. Configura las variables de entorno:

Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

```plaintext
PORT=4002
MONGO_URI=mongodb://localhost:27017/yourdbname
API_KEY_YT=your_youtube_api_key
URL_SEARCH_YT=https://www.googleapis.com/youtube/v3/search
URL_WATCH_YT=https://www.youtube.com/watch
```

Reemplaza `yourdbname` con el nombre de tu base de datos MongoDB y `your_youtube_api_key` con tu clave de API de YouTube.

4. Asegúrate de tener `ffmpeg` instalado. Puedes instalarlo con:

```bash
sudo apt update
sudo apt install ffmpeg
```

## Uso

1. Inicia el servidor:

```bash
node --watch index.js
```

##### NOTA: Tener version 22.1.0 o superior

2. Abre Postman y crea una nueva solicitud POST a `http://localhost:5000/api/youtube/descargar-video`.

3. Configura el cuerpo de la solicitud con el siguiente JSON:

```json
{
  "nombreVideo": "mirame blessd"
}
```

4. Envía la solicitud. Deberías recibir una respuesta con la metadata del video descargado y guardado.

## Estructura del Proyecto

```plaintext
project-root/
│
├── controllers/
│   └── youtubeController.js
├── models/
│   └── video.js
├── routes/
│   └── youtubeRoutes.js
├── config/
│   └── database.js
│   └── dotenv.js
├── services/
│   └── youtubeService.js
├── index.js
└── .env
```

## Archivos Clave

### `index.js`

Punto de entrada del servidor. Configura Express y conecta a MongoDB.

### `controllers/youtubeController.js`

Controlador que maneja las solicitudes para descargar videos de YouTube.

### `models/video.js`

Modelo Mongoose para almacenar la metadata de los videos en MongoDB.

### `routes/youtubeRoutes.js`

Define las rutas de la API para descargar videos de YouTube.

### `services/youtubeService.js`

Contiene las funciones para buscar, descargar y combinar videos y audios de YouTube.

### `config/database.js`

Configura la conexión a MongoDB.

## Contribuciones

Si deseas contribuir a este proyecto, por favor sigue estos pasos:

1. Haz un fork del repositorio.
2. Crea una nueva rama (`git checkout -b feature/nueva-funcionalidad`).
3. Realiza tus cambios y haz commit (`git commit -am 'Añadir nueva funcionalidad'`).
4. Haz push a la rama (`git push origin feature/nueva-funcionalidad`).
5. Abre un Pull Request.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT.

## Contacto

- **Autor:** [FrankN11](https://github.com/ElAlgoritmoDeLaNoche)
- **Email:** franknavarrete11@icloud.com
