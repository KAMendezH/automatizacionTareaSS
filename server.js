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
// ... (Tus importaciones) ...
const puppeteer = require('puppeteer'); // <-- ¡NUEVA IMPORTACIÓN!
// ...

// Datos esperados para la verificación (deben coincidir con tu JSON normalizado)
// **IMPORTANTE: Si esta lista es larga, deberías moverla a un archivo separado (ej. expected_data.json)
const DATOS_ESPERADOS = [
    { Nombre: "Laptop", Cantidad: 15, Precio: 1200.50 },
    { Nombre: "Mouse", Cantidad: 50, Precio: 15.99 },
    { Nombre: "Monitor 27\"", Cantidad: 10, Precio: 350.00 },
    { Nombre: "Teclado Mecánico", Cantidad: 25, Precio: 75.25 }
];
const TABLA_SELECTOR = "#tablaProductos tbody";


/**
 * Función central que usa Puppeteer para navegar y extraer la tabla.
 */
async function extraerYVerificarTabla(url) {
    let browser;
    let resultados = { status: 'FALLO', mensaje: '', obtenidos: [] };

    try {
        // Inicializa Puppeteer en modo Headless (sin ventana gráfica)
        // Usa la opción 'args' para asegurar que funcione en Render
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        
        // 1. Navegar a la URL del proyecto del usuario
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        
        // 2. Esperar a que la tabla se llene (usando el selector de la tabla)
        // Esto es mucho mejor que un simple time.sleep
        await page.waitForSelector(TABLA_SELECTOR, { timeout: 10000 }); 
        
        // 3. Evaluar en el contexto del navegador para extraer los datos
        const productosObtenidos = await page.evaluate((selector) => {
            const filas = Array.from(document.querySelectorAll(`${selector} tr`));
            
            return filas.map(fila => {
                const celdas = Array.from(fila.querySelectorAll('td'));
                if (celdas.length !== 3) return null; // Ignorar filas incompletas
                
                // Extrae y limpia los datos
                const precioLimpio = celdas[2].textContent.replace('$', '').replace(',', '');
                
                return {
                    Nombre: celdas[0].textContent,
                    // Parseamos a número para una comparación precisa
                    Cantidad: parseInt(celdas[1].textContent, 10), 
                    Precio: parseFloat(precioLimpio) 
                };
            }).filter(p => p !== null);
            
        }, TABLA_SELECTOR); // Pasamos el selector a la función evaluate
        
        resultados.obtenidos = productosObtenidos;
        
        // 4. Verificación de Datos
        if (productosObtenidos.length === 0) {
            resultados.mensaje = '❌ FALLO: No se encontraron datos en la tabla.';
        } else if (JSON.stringify(productosObtenidos) === JSON.stringify(DATOS_ESPERADOS)) {
            resultados.status = 'ÉXITO';
            resultados.mensaje = '✅ ÉXITO: Los datos extraídos coinciden con los datos esperados.';
        } else {
            resultados.mensaje = '❌ FALLO: Los datos no coinciden.';
            resultados.esperados = DATOS_ESPERADOS; // Añadir para depuración
        }

    } catch (e) {
        console.error("Puppeteer Error:", e.message);
        resultados.mensaje = `❌ ERROR en la automatización: ${e.message}`;
    } finally {
        if (browser) await browser.close(); // Siempre cierra el navegador
    }

    return resultados;
}

// ----------------------------------------------------------------------
// NUEVO ENDPOINT POST PARA EJECUTAR EL BOT
// ----------------------------------------------------------------------

app.post('/api/verificar', async (req, res) => { // ¡Hacer el manejador asíncrono!
    const urlProyecto = req.body.url; 

    if (!urlProyecto) {
        return res.status(400).json({ error: "Falta el campo 'url' en la petición." });
    }
    
    console.log(`\n▶️ Solicitud de verificación recibida para URL: ${urlProyecto}`);
    
    // Ejecuta el bot de Puppeteer y espera el resultado
    const resultadoVerificacion = await extraerYVerificarTabla(urlProyecto);

    // Si hubo un fallo en la verificación o en la automatización, devuelve el estado 500 o 400
    if (resultadoVerificacion.status === 'FALLO' || resultadoVerificacion.mensaje.includes('ERROR')) {
        return res.status(400).json(resultadoVerificacion);
    }
    
    // Si fue exitoso, devuelve 200 (OK)
    res.json(resultadoVerificacion);
});
});





// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en http://localhost:${PORT}`);
    console.log(`🔗 Sirviendo datos desde el archivo: ${RUTA_NORMALIZADA}`);
});