const express = require('express');
const cors = require('cors');
const fs = require('fs'); // <--- Importamos el módulo File System
const { exec } = require('child_process'); // Módulo para ejecutar comandos del sistema
const bodyParser = require('body-parser'); // Para leer el JSON que envía React


const app = express();
app.use(bodyParser.json()); // Habilita Express para leer cuerpos JSON
const path = require('path');

const PORT =  process.env.PORT || 3000;

// 💡 1. Definición de la ruta del archivo normalizado
const RUTA_NORMALIZADA = path.join(__dirname, 'productos_normalizados.json');

app.use(cors()); 
app.use(bodyParser.json());

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

app.post('/api/verificar', (req, res) => {
    // 1. Obtiene la URL enviada por React desde el cuerpo de la petición
    const urlProyecto = req.body.url; 

    if (!urlProyecto) {
        return res.status(400).json({ error: "Falta el campo 'url' en la petición." });
    }
    
    console.log(`\n▶️ Solicitud de verificación recibida para URL: ${urlProyecto}`);

    // 2. Comando para ejecutar el script de Python, pasándole la URL como argumento
    // Necesitas modificar tu script de Python para leer sys.argv[1] (VER NOTA ABAJO)
    const comando = `python verificar_tabla.py "${urlProyecto}"`;

    // 3. Ejecuta el comando en el sistema operativo
    exec(comando, (error, stdout, stderr) => {
        if (error) {
            console.error(`❌ Error al ejecutar Python: ${stderr}`);
            return res.status(500).json({ 
                status: 'error', 
                mensaje: 'Error en la ejecución del bot de Python.', 
                detalles: stderr 
            });
        }
        
        // 4. Envía la salida de la consola de Python (stdout) de vuelta a React
        console.log('✅ Bot de Python finalizado con éxito.');
        res.json({
            status: 'success',
            mensaje: 'Verificación completada.',
            resultados_bot: stdout // Contiene los mensajes de ÉXITO/FALLO
        });
    });
});





// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
    console.log(`🔗 Sirviendo datos desde el archivo: ${RUTA_NORMALIZADA}`);
});