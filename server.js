const express = require('express');
const fs = require('fs'); // <--- Importamos el módulo File System
const path = require('path');
const app = express();
const PORT =  process.env.PORT || 3000;

// 💡 1. Definición de la ruta del archivo normalizado
const RUTA_NORMALIZADA = path.join(__dirname, 'productos_normalizados.json');

// Middleware para permitir CORS (necesario para el navegador)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*'); 
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// 2. Ruta de la API para /api/productos
app.get('/api/productos', (req, res) => {
    console.log('Petición recibida en /api/productos');
    
    try {
        // 3. LEER EL ARCHIVO: Leer el contenido del archivo de forma síncrona
        const datosCrudos = fs.readFileSync(RUTA_NORMALIZADA, 'utf8');
        
        // 4. PARSEAR: Convertir la cadena de texto JSON a un objeto JavaScript
        const productosNormalizados = JSON.parse(datosCrudos);
        console.log(productosNormalizados)
        
        // 5. RESPONDER: Enviar los datos del archivo como respuesta JSON
        res.json(productosNormalizados);

    } catch (error) {
        console.error("❌ Error al servir los datos normalizados:", error.message);
        
        // Manejo de errores: Si el archivo no existe o está mal formado
        if (error.code === 'ENOENT') {
            res.status(404).json({ 
                error: `Archivo no encontrado: ${RUTA_NORMALIZADA}`,
                mensaje: "Asegúrate de haber ejecutado el script de normalización previamente."
            });
        } else if (error instanceof SyntaxError) {
             res.status(500).json({ 
                error: "El archivo JSON está corrupto o mal formado.",
                mensaje: "Verifica el contenido de productos_normalizados.json."
            });
        } else {
            res.status(500).json({ error: "Error interno del servidor" });
        }
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
    console.log(`🔗 Sirviendo datos desde el archivo: ${RUTA_NORMALIZADA}`);
});