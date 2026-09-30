# Chat-Ti Mobile

Aplicación móvil React Native para Chat-Ti, desarrollada con Expo.

## 🚀 Características

- 💬 **Chat en tiempo real** con WebSocket
- 📱 **Notificaciones push** nativas
- 👥 **Indicadores de presencia** (usuarios online, escribiendo...)
- 🎨 **Diseño moderno** con tema naranja y verde
- 🔄 **Reconexión automática** en caso de pérdida de conexión
- 💾 **Persistencia de usuario** con AsyncStorage

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- npm o pnpm
- Expo Go app (para testing en dispositivo físico)
  - [iOS](https://apps.apple.com/app/expo-go/id982107779)
  - [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)
- O un emulador configurado:
  - iOS Simulator (solo macOS)
  - Android Emulator

## 🛠️ Instalación

1. **Navegar al directorio del proyecto:**
   ```bash
   cd chatti-mobile
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

## 🎯 Ejecución

### Iniciar el servidor de desarrollo

```bash
npx expo start
```

Esto iniciará Metro Bundler y mostrará un código QR.

### Opciones de ejecución

#### En dispositivo físico (recomendado para testing):
1. Instala Expo Go en tu dispositivo
2. Escanea el código QR con:
   - iOS: App de Cámara
   - Android: App Expo Go
3. La app se cargará automáticamente

#### En emulador/simulador:
```bash
# iOS (solo macOS)
npx expo start --ios

# Android
npx expo start --android

# Web (para pruebas rápidas, funcionalidad limitada)
npx expo start --web
```

## ⚙️ Configuración

### Backend URL

Por defecto, la app se conecta a:
- **Desarrollo**: `http://127.0.0.1:8788`
- **Producción**: `https://chatti-workers.wz0un.workers.dev`

Para cambiar la URL del backend, edita `src/screens/ChatScreen.js`:

```javascript
const WORKER_URL = 'tu-url-aqui';
```

### Notificaciones

Las notificaciones están habilitadas por defecto. La app solicitará permisos al conectarse al chat.

## 📱 Uso

1. **Iniciar la app** en tu dispositivo o emulador
2. **Ingresar nombre de usuario** y sala de chat
3. **Comenzar a chatear** en tiempo real
4. **Recibir notificaciones** cuando la app está en segundo plano

## 🏗️ Estructura del Proyecto

```
chatti-mobile/
├── App.js                          # Punto de entrada principal
├── app.json                        # Configuración de Expo
├── src/
│   ├── components/                 # Componentes reutilizables
│   │   ├── ChatMessage.js         # Componente de mensaje
│   │   ├── ChatInput.js           # Input de mensaje
│   │   └── TypingIndicator.js     # Indicador de escritura
│   ├── screens/                    # Pantallas de la app
│   │   ├── LoginScreen.js         # Pantalla de login
│   │   └── ChatScreen.js          # Pantalla de chat
│   ├── services/                   # Lógica de negocio
│   │   ├── ChatService.js         # Servicio de WebSocket
│   │   └── NotificationService.js # Servicio de notificaciones
│   ├── navigation/                 # Configuración de navegación
│   │   └── AppNavigator.js        # Stack Navigator
│   └── theme/                      # Estilos y tema
│       └── colors.js              # Paleta de colores
```

## 🔧 Dependencias Principales

- **expo** - Plataforma de desarrollo
- **react-native** - Framework móvil
- **@react-navigation/native** - Navegación
- **expo-notifications** - Notificaciones push
- **@react-native-async-storage/async-storage** - Almacenamiento local

## 🐛 Troubleshooting

### La app no se conecta al backend

1. Verifica que el backend esté corriendo: `http://127.0.0.1:8788`
2. Si usas dispositivo físico, asegúrate de estar en la misma red WiFi
3. Actualiza la URL en `ChatScreen.js` con la IP de tu computadora:
   ```javascript
   const WORKER_URL = 'http://TU_IP:8788';
   ```

### Notificaciones no funcionan

1. Verifica que hayas dado permisos de notificación
2. Las notificaciones solo se muestran cuando la app está en segundo plano
3. En iOS, las notificaciones locales pueden no funcionar en simulador

### Error al escanear QR

1. Asegúrate de tener la última versión de Expo Go
2. Intenta con `npx expo start --tunnel` para usar un túnel
3. Verifica que tu dispositivo y computadora estén en la misma red

## 📦 Build para Producción

### Android (APK/AAB)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login en Expo
eas login

# Configurar build
eas build:configure

# Build para Android
eas build --platform android
```

### iOS (IPA)

```bash
# Build para iOS (requiere cuenta de Apple Developer)
eas build --platform ios
```

## 🤝 Integración con Backend

La app se conecta al mismo backend de Cloudflare Workers que la versión web:

- **WebSocket URL**: `/api/room/{roomId}`
- **Protocolo**: WebSocket estándar
- **Eventos soportados**:
  - `join` - Unirse a sala
  - `message` - Enviar/recibir mensajes
  - `typing` - Indicador de escritura
  - `history` - Historial de mensajes
  - `user_joined` / `user_left` - Eventos de usuarios

## 📄 Licencia

Este proyecto se distribuye bajo la [Licencia MIT](LICENSE).

## 🆘 Soporte

Para problemas o preguntas, revisa:
1. Logs de Metro Bundler
2. Console logs en la app (agita el dispositivo → Debug)
3. Backend logs en Wrangler

---

**Desarrollado con ❤️ usando Expo y React Native**
