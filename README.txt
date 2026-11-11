METEO HOME – PAQUETE PWA
========================

CONTENIDO
---------
meteo-home/
  index.html
  styles.css
  app.js
  manifest.webmanifest
  service-worker.js
  icons/icon.svg

QUÉ HACE
--------
- Muestra dos ubicaciones: Hortaleza y Oco.
- Incluye Inicio, 48 horas, 5 días y Avisos.
- Lee el archivo JSON que ya genera el workflow de Meteo.
- No consulta servicios meteorológicos desde la tablet.
- Guarda la última previsión descargada para poder consultarla sin conexión.
- Muestra "—" cuando falta un dato; no convierte datos ausentes en cero.

IMPORTANTE: DÓNDE DEBE IR
-------------------------
Sube la carpeta completa "meteo-home" a la raíz del repositorio Meteo,
al mismo nivel que las carpetas ".github", "data" y "meteo-agent".

La estructura debe quedar así:

Meteo/
  data/
    meteo_home.json
  meteo-home/
    index.html
    styles.css
    app.js
    manifest.webmanifest
    service-worker.js
    icons/
      icon.svg

La ruta de datos está configurada como:
  ../data/meteo_home.json

No copies el JSON de ejemplo dentro de meteo-home. La app debe leer el
archivo vivo que actualiza el workflow existente.

ACTIVAR GITHUB PAGES
--------------------
1. En GitHub abre el repositorio luishao11-cmyk/Meteo.
2. Entra en Settings.
3. En el menú lateral abre Pages.
4. En "Build and deployment", elige "Deploy from a branch".
5. Selecciona la rama "main".
6. Selecciona la carpeta "/ (root)".
7. Pulsa Save.
8. Espera a que GitHub publique la página.

La dirección tendrá este formato:
  https://luishao11-cmyk.github.io/Meteo/meteo-home/

INSTALAR EN LA TABLET
---------------------
1. Abre esa dirección en Chrome o Samsung Internet.
2. Espera a que cargue la previsión.
3. Abre el menú del navegador.
4. Elige "Instalar aplicación" o "Añadir a pantalla de inicio".
5. Confirma la instalación.

PRUEBA RECOMENDADA
------------------
- Cambia entre Hortaleza y Oco.
- Abre Inicio, 48 horas, 5 días y Avisos.
- Comprueba la fecha de última actualización.
- Tras cargar una vez con conexión, activa el modo avión y vuelve a abrir
  la aplicación para comprobar que conserva la última previsión guardada.

NOTAS
-----
- La primera carga necesita conexión.
- La disponibilidad de instalación PWA depende del navegador y de que
  GitHub Pages esté publicado bajo HTTPS.
- El archivo JSON se actualiza cuando termina correctamente el workflow
  "Meteo Home - actualización de datos".
- Esta app no modifica ningún archivo ni workflow del motor meteorológico.
