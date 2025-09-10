# Usar una imagen oficial de Node.js. Alpine es una versión muy ligera.
FROM node:18-alpine

# Establecer el directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar los archivos de dependencias. El `*` asegura que tanto package.json como package-lock.json se copien.
COPY package*.json ./

# Instalar las dependencias del proyecto
RUN npm install

# Copiar el resto de los archivos de la aplicación al directorio de trabajo
COPY . .

# Exponer el puerto 3000 para que sea accesible desde fuera del contenedor
EXPOSE 3000

# El comando para iniciar la aplicación cuando el contenedor se levante
CMD [ "node", "--watch", "server.js" ]
