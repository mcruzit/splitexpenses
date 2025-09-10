# Frontend: Divisor de Gastos

Esta es la aplicación de frontend para el "Divisor de Gastos". Es una Progressive Web App (PWA) construida con componentes de Ionic y JavaScript puro (Vanilla JS), diseñada para ser rápida, funcionar sin conexión y ser instalable en dispositivos móviles y de escritorio.

La aplicación permite a los usuarios crear grupos, añadir personas y gastos, y calcular de forma simplificada quién le debe a quién.

## Tecnologías Utilizadas

-   **Ionic Framework (Componentes Web):** Para la interfaz de usuario, aprovechando sus componentes pre-diseñados y adaptables (`ion-card`, `ion-button`, `ion-alert`, etc.).
-   **JavaScript (Vanilla):** Toda la lógica de la aplicación está escrita en JavaScript puro, sin frameworks como Angular, React o Vue.
-   **Progressive Web App (PWA):**
    -   **Service Worker (`sw.js`):** Para el manejo de caché y la funcionalidad offline. Implementa una estrategia **Stale-While-Revalidate** para las llamadas a la API, lo que garantiza una carga instantánea y actualizaciones en segundo plano.
    -   **Web App Manifest (`manifest.json`):** Para permitir que la aplicación sea instalada en el dispositivo del usuario.
-   **Nginx:** Utilizado como servidor web ligero para servir los archivos estáticos en producción a través de Docker.

## Estructura del Proyecto

```
frontend/
├── Dockerfile          # Define cómo construir la imagen de Nginx para producción.
├── images/             # Contiene los iconos de la aplicación para la PWA.
├── js/
│   └── app.js          # El corazón de la aplicación. Contiene toda la lógica del frontend.
├── index.html          # El punto de entrada principal de la aplicación. Define la estructura de la UI.
├── manifest.json       # Manifiesto de la PWA.
└── sw.js               # El Service Worker que gestiona el caché y la funcionalidad offline.
```

## Puesta en Marcha

La forma más sencilla y recomendada de ejecutar el frontend junto con el backend y la base de datos es utilizando Docker Compose.

### Requisitos

-   Docker
-   Docker Compose

### Pasos

1.  **Clonar el Repositorio:** Asegúrate de tener todo el proyecto en tu máquina local.

2.  **Navegar a la Raíz del Proyecto:** Abre una terminal y sitúate en la carpeta principal del proyecto (`divisor-gastos/`), donde se encuentra el archivo `docker-compose.yml`.

3.  **Levantar los Servicios:** Ejecuta el siguiente comando. Este comando construirá las imágenes de Docker para el frontend y el backend, y levantará todos los servicios.

    ```bash
    docker-compose up --build
    ```

4.  **Acceder a la Aplicación:** Una vez que los contenedores estén en funcionamiento, abre tu navegador web y ve a:

    **`http://localhost:8080`**

La aplicación frontend se cargará y se comunicará automáticamente con el servicio de backend que se está ejecutando en el puerto 3000.