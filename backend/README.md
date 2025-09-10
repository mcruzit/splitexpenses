# Backend: API del Divisor de Gastos

Este es el servicio de backend para la aplicación "Divisor de Gastos". Es una API RESTful construida con Node.js y Express, diseñada para manejar la lógica de negocio, la persistencia de datos y los cálculos de deudas.

## Características

-   **API RESTful:** Endpoints claros y bien definidos para gestionar grupos, personas y gastos.
-   **Persistencia de Datos:** Utiliza una base de datos PostgreSQL para almacenar toda la información de forma segura.
-   **Lógica de Cálculo Centralizada:** Contiene el algoritmo para calcular y simplificar las deudas entre los miembros de un grupo.
-   **Containerizado con Docker:** Listo para ser desplegado y ejecutado en cualquier entorno compatible con Docker, gracias a su `Dockerfile` y a la orquestación con Docker Compose.

## Tecnologías Utilizadas

-   **Node.js:** Entorno de ejecución para JavaScript del lado del servidor.
-   **Express.js:** Framework minimalista para construir la API y gestionar las rutas.
-   **PostgreSQL:** Base de datos relacional para la persistencia de los datos.
-   **pg (node-postgres):** Driver para la comunicación entre Node.js y PostgreSQL.
-   **Docker:** Para la containerización de la aplicación.

## Estructura del Proyecto

```
backend/
├── Dockerfile          # Define cómo construir la imagen de Docker para la aplicación.
├── calculator.js       # Contiene la clase con la lógica pura para el cálculo de deudas.
├── db.js               # Gestiona la conexión a la base de datos y la inicialización de las tablas.
├── package.json        # Define las dependencias y scripts del proyecto.
└── server.js           # El punto de entrada de la API. Define todos los endpoints.
```

## API Endpoints

A continuación se detallan los endpoints disponibles en la API:

### Grupos (`/api/groups`)

-   `POST /api/groups`
    -   **Descripción:** Crea un nuevo grupo de gastos.
    -   **Body:** `{ "name": "Nombre del Grupo" }`
    -   **Respuesta:** `201 Created` con el objeto del grupo creado.

-   `GET /api/groups/:groupUuid`
    -   **Descripción:** Obtiene los detalles de un grupo, incluyendo sus personas y gastos.
    -   **Respuesta:** `200 OK` con el objeto completo del grupo.

-   `PUT /api/groups/:groupUuid`
    -   **Descripción:** Actualiza el nombre de un grupo existente.
    -   **Body:** `{ "name": "Nuevo Nombre" }`
    -   **Respuesta:** `200 OK` con el objeto del grupo actualizado.

-   `DELETE /api/groups/:groupUuid`
    -   **Descripción:** Elimina un grupo y todos sus datos asociados (personas, gastos).
    -   **Respuesta:** `204 No Content`.

### Personas (`/api/groups/.../people` y `/api/people`)

-   `POST /api/groups/:groupUuid/people`
    -   **Descripción:** Añade una nueva persona a un grupo.
    -   **Body:** `{ "name": "Nombre de la Persona" }`
    -   **Respuesta:** `201 Created` con el objeto de la persona creada.

-   `PUT /api/people/:personId`
    -   **Descripción:** Actualiza el nombre de una persona.
    -   **Body:** `{ "name": "Nuevo Nombre" }`
    -   **Respuesta:** `200 OK` con el objeto de la persona actualizado.

-   `DELETE /api/groups/:groupUuid/people/:personId`
    -   **Descripción:** Elimina a una persona de un grupo. Falla si la persona tiene gastos registrados.
    -   **Respuesta:** `204 No Content`.

### Gastos (`/api/groups/.../expenses` y `/api/expenses`)

-   `POST /api/groups/:groupUuid/expenses`
    -   **Descripción:** Registra un nuevo gasto en un grupo.
    -   **Body:** `{ "description": "Cena", "amount": 50.00, "pagador": "Nombre Persona" }`
    -   **Respuesta:** `201 Created` con el objeto del gasto creado.

-   `PUT /api/expenses/:expenseId`
    -   **Descripción:** Actualiza la descripción y el monto de un gasto.
    -   **Body:** `{ "description": "Nueva Descripción", "amount": 75.50 }`
    -   **Respuesta:** `200 OK` con el objeto del gasto actualizado.

-   `DELETE /api/expenses/:expenseId`
    -   **Descripción:** Elimina un gasto.
    -   **Respuesta:** `204 No Content`.

### Cálculo

-   `GET /api/groups/:groupUuid/calculate`
    -   **Descripción:** Realiza el cálculo de deudas para un grupo específico y devuelve las transacciones simplificadas.
    -   **Respuesta:** `200 OK` con un array de objetos de transacción. `[{ "deudor": "Persona A", "acreedor": "Persona B", "monto": 10.00 }]`

## Puesta en Marcha

La forma más sencilla y recomendada de ejecutar el backend junto con el frontend y la base de datos es utilizando Docker Compose.

### Requisitos

-   Docker
-   Docker Compose

### Pasos

1.  **Clonar el Repositorio:** Asegúrate de tener todo el proyecto en tu máquina local.

2.  **Navegar a la Raíz del Proyecto:** Abre una terminal y sitúate en la carpeta principal del proyecto (`divisor-gastos/`), donde se encuentra el archivo `docker-compose.yml`.

3.  **Levantar los Servicios:** Ejecuta el siguiente comando. Este comando construirá las imágenes de Docker y levantará todos los servicios.

    ```bash
    docker-compose up --build
    ```

4.  **Verificar:** El servicio de backend estará disponible en **`http://localhost:3000`**. Se conectará automáticamente al servicio de base de datos `db` a través de la red interna de Docker.

## Variables de Entorno

-   `DATABASE_URL`: La cadena de conexión a la base de datos PostgreSQL. Esta variable es configurada automáticamente por `docker-compose.yml` al levantar los servicios.