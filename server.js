import express from "express";
import cors from "cors"; 
import path from "path";
import fs from "fs";
import puppeteer from "puppeteer-core"; // Usamos la versión core
import chromium from "@sparticuz/chromium"; // Importamos el ejecutable optimizado

// Usamos __dirname, que funciona con modules (ESM) si se importa el módulo 'url'
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000; // Agregamos un fallback por si acaso

// ----------------------------------------------------------------------
// MIDDLEWARES Y CONFIGURACIÓN
// ----------------------------------------------------------------------

// Solución Forzada para el Preflight Request (OPTIONS)
app.options('*', cors()); 
// Permite peticiones desde cualquier origen ('*')
app.use(cors()); 

// Middleware para leer cuerpos JSON
app.use(express.json()); 


// ----------------------------------------------------------------------
// DECLARACIONES GLOBALES
// ----------------------------------------------------------------------

const DATOS_ESPERADOS = [
    { nombre: "Laptop", cantidad: 25, precio: 2000},
    { nombre: "Cama", cantidad: 20, precio: 1500.9 },
    { nombre: "TV", cantidad: 14, precio: 12000.5 },
    { nombre: "Lavadora", cantidad: 100, precio: 11000 }
];
const TABLA_SELECTOR = "#tablaProductos tbody";
const RUTA_NORMALIZADA = path.join(__dirname, 'productos_normalizados.json');


/**
 * Función central que usa Puppeteer para navegar y extraer la tabla.
 * @param {string} url - La URL del proyecto React/HTML a verificar.
 */
async function extraerYVerificarTabla(url) {
    let browser;
    let resultados = { status: 'FALLO', mensaje: '', obtenidos: [] };

    try {
        // 💡 CAMBIO CRUCIAL PARA RENDER: Inicializa Puppeteer con Chromium optimizado
        browser = await puppeteer.launch({
            executablePath: await chromium.executablePath(), // Le indica a Puppeteer dónde está el ejecutable en Render
            headless: chromium.headless,                    
            args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'], // Argumentos de seguridad para entorno de servidor
            defaultViewport: chromium.defaultViewport,
        });
        const page = await browser.newPage();
        
        // 1. Navegar a la URL
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }); 
        
        // 2. Esperar a que la tabla se llene
        await page.waitForSelector(TABLA_SELECTOR, { timeout: 10000 }); 
        
        // 3. Evaluar y extraer los datos
        const productosObtenidos = await page.evaluate((selector) => {
            const filas = Array.from(document.querySelectorAll(`${selector} tr`));
            
            return filas.map(fila => {
                const celdas = Array.from(fila.querySelectorAll('td'));
                if (celdas.length !== 3) return null;
                
                // Limpieza de datos (eliminando $ y comas)
                const precioLimpio = celdas[2].textContent.replace('$', '').replace(',', '');
                
                return {
                    Nombre: celdas[0].textContent,
                    Cantidad: parseInt(celdas[1].textContent, 10), 
                    Precio: parseFloat(precioLimpio) 
                };
            }).filter(p => p !== null);
            
        }, TABLA_SELECTOR); 
        
        resultados.obtenidos = productosObtenidos;
        
        // 4. Verificación
        if (productosObtenidos.length === 0) {
            resultados.mensaje = '❌ FALLO: No se encontraron datos en la tabla.';
        } else if (JSON.stringify(productosObtenidos) === JSON.stringify(DATOS_ESPERADOS)) {
            resultados.status = 'ÉXITO';
            resultados.mensaje = '✅ ÉXITO: Los datos extraídos coinciden con los datos esperados.';
        } else {
            resultados.mensaje = '❌ FALLO: Los datos no coinciden.';
            resultados.esperados = DATOS_ESPERADOS; 
        }

    } catch (e) {
        console.error("Puppeteer Error:", e.message);
        resultados.mensaje = `❌ ERROR en la automatización: ${e.message}. Asegúrate que la URL sea pública y correcta.`;
    } finally {
        if (browser) await browser.close(); 
    }

    return resultados;
}

// ----------------------------------------------------------------------
// RUTAS DE LA API
// ----------------------------------------------------------------------

// Ruta GET para /api/productos
app.get('/api/productos', (req, res) => {
    console.log('Petición recibida en /api/productos');
    
    try {
        const datosCrudos = fs.readFileSync(RUTA_NORMALIZADA, 'utf8');
        const productosNormalizados = JSON.parse(datosCrudos);
        res.json(productosNormalizados);

    } catch (error) {
        console.error("❌ Error al servir los datos normalizados:", error.message);
        res.status(500).json({ error: "Error al leer los datos normalizados." });
    }
});


// Ruta POST para /api/verificar (Usando Puppeteer)
app.post('/api/verificar', async (req, res) => { 
    // Primer log para asegurar que el cuerpo JSON se está leyendo
    console.log("Cuerpo de la petición (req.body):", req.body);
    
    // Usamos optional chaining para evitar errores si req.body no tiene 'url'
    const urlProyecto = req.body?.url; 
    
    if (!urlProyecto) {
        return res.status(400).json({ error: "Falta el campo 'url' en la petición." });
    }
    
    console.log(`\n▶️ Solicitud de verificación recibida para URL: ${urlProyecto}`);
    
    // Ejecuta la función asíncrona de Puppeteer
    const resultadoVerificacion = await extraerYVerificarTabla(urlProyecto);

    if (resultadoVerificacion.status === 'FALLO' || resultadoVerificacion.mensaje.includes('ERROR')) {
        return res.status(400).json(resultadoVerificacion);
    }
    
    res.json(resultadoVerificacion);
});


// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express escuchando en el puerto ${PORT}`);
});