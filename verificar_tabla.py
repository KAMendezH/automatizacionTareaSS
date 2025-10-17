from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service as ChromeService
import sys 
import json
import time

# -------------------------------------------------------------
# 1. DATOS DE CONFIGURACIÓN
# -------------------------------------------------------------

# <--- ¡REEMPLAZA ESTA URL CON LA URL DE TU PROYECTO DESPLEGADO! --->
if len(sys.argv) < 2:
    print("❌ ERROR: Debes proporcionar la URL del proyecto como argumento.")
    # Usamos exit() para detener si no hay URL
    sys.exit(1) 

URL_PROYECTO = sys.argv[1] 



# Datos esperados para la verificación (deben coincidir con tu JSON normalizado)
DATOS_ESPERADOS = [
    {"nombre": "Laptop", "cantidad": 15, "precio": 1200.50},
    {"nombre": "Mouse", "cantidad": 50, "precio": 15.99},
    {"nombre": "Monitor 27\"", "cantidad": 10, "precio": 350.00},
    {"nombre": "Teclado Mecánico", "cantidad": 25, "precio": 75.25}
]

# ID o selector CSS del cuerpo de la tabla (tbody)
TABLA_SELECTOR = "#tablaProductos tbody"

# -------------------------------------------------------------
# 2. FUNCIONES DE EXTRACCIÓN Y VERIFICACIÓN
# -------------------------------------------------------------

def obtener_datos_tabla(driver):
    """Navega a la URL y extrae los datos de la tabla."""
    print(f"Navegando a: {URL_PROYECTO}")
    driver.get(URL_PROYECTO)
    
    # Esperar un momento para que el fetch de JavaScript se complete
    # En un proyecto real, usarías WebDriverWait para esperar que las filas aparezcan
    time.sleep(5) 
    
    productos_obtenidos = []
    
    try:
        # Encuentra todas las filas (tr) dentro del cuerpo de la tabla (tbody)
        filas = driver.find_elements(By.CSS_SELECTOR, f"{TABLA_SELECTOR} tr")
        
        if not filas:
            print("❌ ERROR: No se encontraron filas en la tabla. Verifique el selector y la URL.")
            return []

        for fila in filas:
            # Obtiene todas las celdas (td) de la fila actual
            celdas = fila.find_elements(By.TAG_NAME, "td")
            
            if len(celdas) == 3: # Solo procesa si tiene las 3 columnas esperadas
                # Extrae el texto de las celdas
                nombre = celdas[0].text
                cantidad_str = celdas[1].text
                precio_str = celdas[2].text.replace('$', '').replace(',', '') # Limpia el símbolo de moneda
                
                # Convierte los valores a los tipos correctos
                try:
                    cantidad = int(cantidad_str)
                    precio = float(precio_str)
                except ValueError:
                    print(f"⚠️ Advertencia: No se pudo convertir Cantidad/Precio para {nombre}. Omitiendo fila.")
                    continue
                    
                productos_obtenidos.append({
                    "nombre": nombre,
                    "cantidad": cantidad,
                    "precio": precio
                })

        return productos_obtenidos

    except Exception as e:
        print(f"❌ ERROR durante la extracción de datos: {e}")
        return []

def verificar_datos(obtenidos, esperados):
    """Compara los datos extraídos con los datos esperados."""
    print(f"\n--- Verificación de Datos ---")
    
    if len(obtenidos) != len(esperados):
        print(f"❌ FALLO: El número de productos no coincide.")
        print(f"   Esperados: {len(esperados)}, Obtenidos: {len(obtenidos)}")
        return False

    # Convertimos ambas listas a un formato JSON string para una comparación sencilla
    # Esto funciona si el orden de los elementos es consistente.
    obtenidos_json = json.dumps(obtenidos, sort_keys=True)
    esperados_json = json.dumps(esperados, sort_keys=True)

    if obtenidos_json == esperados_json:
        print("✅ ÉXITO: Los datos obtenidos coinciden perfectamente con los datos esperados.")
        return True
    else:
        print("❌ FALLO: Los datos no coinciden. Detalles:")
        print("   Datos Esperados (JSON):", esperados_json)
        print("   Datos Obtenidos (JSON):", obtenidos_json)
        return False

# -------------------------------------------------------------
# 3. EJECUCIÓN PRINCIPAL
# -------------------------------------------------------------

# Modificación en la sección 3. EJECUCIÓN PRINCIPAL


if __name__ == "__main__":
    # --- Configuración para Headless Chrome en Render ---
    try:
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.chrome.service import Service as ChromeService
        from webdriver_manager.chrome import ChromeDriverManager
        
        # 1. Configuración de Opciones
        chrome_options = Options()
        chrome_options.add_argument("--headless") # Modo sin interfaz gráfica
        chrome_options.add_argument("--no-sandbox") # Necesario en entornos de servidor
        chrome_options.add_argument("--disable-dev-shm-usage") # Mejora la estabilidad
        
        # 2. Inicializa el driver de Chrome
        service = ChromeService(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.maximize_window()
        
    except Exception as e:
        print(f"❌ No se pudo inicializar Chrome WebDriver en modo Headless: {e}")
        print("Asegúrate de que tus dependencias de Python y Node.js estén instaladas correctamente.")
        exit()

    try:
        # ... El resto de tu lógica de extracción de datos (obtener_datos_tabla) sigue aquí ...
        
        # Obtener los datos del sitio
        datos_reales = obtener_datos_tabla(driver)
        
        # Ejecutar la verificación
        if datos_reales:
            verificar_datos(datos_reales, DATOS_ESPERADOS)
        
    finally:
        driver.quit()
        print("\nProceso de automatización finalizado.")