/**
 * Simple i18n layer with 3 languages and AsyncStorage persistence.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'chatti_language';

const translations = {
  en: {
    common: {
      appName: 'Chat-Ti',
      ok: 'OK',
      cancel: 'Cancel',
      error: 'Error',
      back: 'Back',
      delete: 'Delete',
      loading: 'Loading...',
      system: 'System',
      user: 'User',
      copy: 'Copy ID',
      connectingEncrypted: 'Connecting to encrypted chat...',
      encrypted: '🔒 Encrypted',
      notEncrypted: '⚠️ Not encrypted',
      messagePlaceholder: 'Type a message...',
    },
    time: {
      minutesAgo: '{{value}}m ago',
      hoursAgo: '{{value}}h ago',
      daysAgo: '{{value}}d ago',
    },
    tabs: {
      chats: 'Chats',
      contacts: 'Contacts',
      rooms: 'Rooms',
      profile: 'Profile',
    },
    login: {
      title: 'Chat-Ti',
      subtitle: 'Welcome to the chat',
      usernameLabel: 'Username',
      usernamePlaceholder: 'Your name',
      join: 'Continue',
      footer: 'By joining, you accept the chat rules',
      errors: {
        empty: 'Please enter your username',
        noUser: 'No user information received',
        server: 'Could not connect to the server. Check your connection.',
      },
    },
    navigator: {
      roomsBack: 'Rooms',
      addContact: 'Add Contact',
      back: 'Back',
      contactRequests: 'Contact Requests',
    },
    chat: {
      userCountOne: '{{count}} user',
      userCountOther: '{{count}} users',
      joined: '{{username}} joined the chat',
      left: '{{username}} left the chat',
    },
    chatInput: {
      placeholder: 'Type a message...',
    },
    typing: {
      singular: '{{users}} is typing...',
      plural: '{{users}} are typing...',
    },
    conversations: {
      headerTitle: 'Chat-Ti',
      emptyTitle: 'You have no active conversations',
      emptySubtitle: 'Go to "Contacts" to start a chat',
      errorLoad: 'Could not load conversations',
      deleteTitle: 'Delete chat',
      deleteMessage: 'Are you sure you want to delete this chat?',
      deleteConfirm: 'Delete',
      deleteCancel: 'Cancel',
      deleteError: 'Could not delete the chat',
      previewEncrypted: 'Encrypted message',
      previewStart: 'Tap to open encrypted chat',
    },
    contacts: {
      title: 'Contacts',
      emptyTitle: 'You have no contacts yet',
      emptySubtitle: 'Add contacts to start encrypted chats',
      addContact: 'Add Contact',
      requests: 'Requests',
      errorLoad: 'Could not load contacts',
      errorCurrent: 'Could not get your current user',
      errorStart: 'Could not start the conversation',
    },
    addContact: {
      title: 'Add Contact',
      description: 'To add a contact, you need their unique device ID',
      step1Title: '📋 Step 1: Get the ID',
      step1Text: 'The other person must go to their Profile (👤) and copy their Device ID',
      step2Title: '✏️ Step 2: Paste the ID here',
      placeholder: 'Example: device_1234567890_abc123...',
      send: '✉️ Send Request',
      infoTitle: '💡 How does it work?',
      infoText: '• Your contact will receive a request\n• They must accept it in "📬 Requests"\n• Once accepted, you can chat encrypted 🔒\n• Only accepted contacts can chat',
      errors: {
        empty: 'Please enter a valid Device ID',
        notFound: 'User not found with that Device ID',
        self: 'You cannot add yourself as a contact',
        send: 'Could not send the request',
      },
      successTitle: 'Request sent',
      successMessage: 'A contact request has been sent to {{username}}',
    },
    contactRequests: {
      title: 'Contact Requests',
      emptyTitle: 'You have no pending requests',
      emptySubtitle: 'Requests sent by other users will appear here',
      errorLoad: 'Could not load requests',
      acceptTitle: 'Request accepted',
      acceptMessage: '{{username}} has been added to your contacts. You can now chat encrypted!',
      rejectTitle: 'Reject request',
      rejectMessage: 'Are you sure you want to reject the request from {{username}}?',
      rejectConfirm: 'Reject',
      rejectError: 'Could not reject the request',
    },
    contactRequestItem: {
      minutes: '{{value}}m ago',
      hours: '{{value}}h ago',
      days: '{{value}}d ago',
    },
    directMessage: {
      fallbackTitle: 'Chat with {{id}}...',
      connectionError: 'Connection error',
    },
    conversationsItem: {
      timeToday: 'en-US',
      timeWeek: 'en-US',
      timeOther: 'en-US',
    },
    profile: {
      title: 'My Profile',
      user: 'User',
      deviceIdTitle: 'Unique Device ID',
      deviceIdDescription: 'Share this ID so others can add you as a contact',
      deviceIdPlaceholder: 'Loading...',
      copy: '📋 Copy ID',
      info: 'Info',
      loading: 'Loading profile...',
      sessionMissingTitle: 'Session not found',
      sessionMissingMessage: 'You need to log in first',
      deleteTitle: 'Delete account',
      deleteMessage: 'Are you sure you want to delete your account?\n\nThis action:\n• Deletes your private chats\n• Deletes your user\n• Is irreversible',
      deleteConfirm: 'Delete account',
      deleteCancel: 'Cancel',
      deleteError: 'Could not delete the account. Try again.',
      notificationTestSend: 'Send notification',
      notificationTestError: 'Could not send the notification',
      notificationTestSuccess: 'Notification sent',
      logout: 'Delete Account',
    },
    rooms: {
      headerTitle: 'Chat Rooms',
      headerSubtitle: 'Hi, {{username}}',
      loading: 'Loading rooms...',
      emptyTitle: 'No rooms available',
      emptySubtitle: 'Create the first room!',
      createButton: '+ Create Room',
      modalTitle: 'Create New Room',
      inputPlaceholder: 'Room name',
      cancel: 'Cancel',
      create: 'Create',
      createdBy: 'Created by: {{owner}}',
      private: '🔒 Private',
      dateLocale: 'en-US',
      errors: {
        load: 'Could not load rooms',
        create: 'Could not create the room',
        nameRequired: 'Please enter a room name',
      },
    },
    usersList: {
      errorLoad: 'Could not load users',
      errorCurrent: 'Could not get your current user',
      errorPublicKey: 'Could not retrieve the public key for this user. Cannot start encrypted chat.',
      placeholder: 'Search users (username#1234)...',
      emptySearch: 'No users found',
      emptyAll: 'No registered users yet',
    },
    notifications: {
      joinTitle: '👋 {{username}} joined',
      joinBody: '{{username}} joined the chat',
      leftTitle: '👋 {{username}} left',
      leftBody: '{{username}} has left the chat',
    },
  },
  es: {
    common: {
      appName: 'Chat-Ti',
      ok: 'OK',
      cancel: 'Cancelar',
      error: 'Error',
      back: 'Atrás',
      delete: 'Eliminar',
      loading: 'Cargando...',
      system: 'Sistema',
      user: 'Usuario',
      copy: 'Copiar ID',
      connectingEncrypted: 'Conectando al chat cifrado...',
      encrypted: '🔒 Cifrado',
      notEncrypted: '⚠️ No cifrado',
      messagePlaceholder: 'Escribe un mensaje...',
    },
    time: {
      minutesAgo: 'Hace {{value}}m',
      hoursAgo: 'Hace {{value}}h',
      daysAgo: 'Hace {{value}}d',
    },
    tabs: {
      chats: 'Chats',
      contacts: 'Contactos',
      rooms: 'Salas',
      profile: 'Perfil',
    },
    login: {
      title: 'Chat-Ti',
      subtitle: 'Bienvenido al chat',
      usernameLabel: 'Nombre de usuario',
      usernamePlaceholder: 'Tu nombre',
      join: 'Continuar',
      footer: 'Al unirte, aceptas las reglas del chat',
      errors: {
        empty: 'Por favor ingresa tu nombre de usuario',
        noUser: 'No se recibió información del usuario',
        server: 'No se pudo conectar con el servidor. Verifica tu conexión.',
      },
    },
    navigator: {
      roomsBack: 'Salas',
      addContact: 'Agregar Contacto',
      back: 'Atrás',
      contactRequests: 'Solicitudes de Contacto',
    },
    chat: {
      userCountOne: '{{count}} usuario',
      userCountOther: '{{count}} usuarios',
      joined: '{{username}} se unió al chat',
      left: '{{username}} salió del chat',
    },
    chatInput: {
      placeholder: 'Escribe un mensaje...',
    },
    typing: {
      singular: '{{users}} está escribiendo...',
      plural: '{{users}} están escribiendo...',
    },
    conversations: {
      headerTitle: 'Chat-Ti',
      emptyTitle: 'No tienes conversaciones activas',
      emptySubtitle: 'Ve a "Contactos" para iniciar un chat',
      errorLoad: 'No se pudieron cargar las conversaciones',
      deleteTitle: 'Eliminar chat',
      deleteMessage: '¿Estás seguro de que quieres eliminar este chat?',
      deleteConfirm: 'Eliminar',
      deleteCancel: 'Cancelar',
      deleteError: 'No se pudo eliminar el chat',
      previewEncrypted: 'Mensaje cifrado',
      previewStart: 'Toca para abrir chat cifrado',
    },
    contacts: {
      title: 'Contactos',
      emptyTitle: 'No tienes contactos aún',
      emptySubtitle: 'Agrega contactos para comenzar a  chatear de forma cifrada',
      addContact: 'Agregar Contacto',
      requests: 'Solicitudes',
      errorLoad: 'No se pudieron cargar los contactos',
      errorCurrent: 'No se pudo obtener tu usuario actual',
      errorStart: 'No se pudo iniciar la conversación',
    },
    addContact: {
      title: 'Agregar Contacto',
      description: 'Para agregar un contacto, necesitas su ID único de dispositivo',
      step1Title: '📋 Paso 1: Obtén el ID',
      step1Text: 'La otra persona debe ir a su Perfil (👤) y copiar su Device ID',
      step2Title: '✏️ Paso 2: Pega el ID aquí',
      placeholder: 'Ejemplo: device_1234567890_abc123...',
      send: '✉️ Enviar Solicitud',
      infoTitle: '💡 ¿Cómo funciona?',
      infoText: '• Tu contacto recibirá una solicitud\n• Debe aceptarla en "📬 Solicitudes"\n• Una vez aceptada, podrán chatear cifrado 🔒\n• Solo los contactos aceptados pueden chatear',
      errors: {
        empty: 'Por favor ingresa un Device ID válido',
        notFound: 'Usuario no encontrado con ese Device ID',
        self: 'No puedes agregarte a ti mismo como contacto',
        send: 'No se pudo enviar la solicitud',
      },
      successTitle: 'Solicitud enviada',
      successMessage: 'Se ha enviado una solicitud de contacto a {{username}}',
    },
    contactRequests: {
      title: 'Solicitudes de Contacto',
      emptyTitle: 'No tienes solicitudes pendientes',
      emptySubtitle: 'Las solicitudes enviadas por otros usuarios aparecerán aquí',
      errorLoad: 'No se pudieron cargar las solicitudes',
      acceptTitle: 'Solicitud aceptada',
      acceptMessage: '{{username}} ha sido agregado a tus contactos. ¡Ahora pueden chatear de forma cifrada!',
      rejectTitle: 'Rechazar solicitud',
      rejectMessage: '¿Estás seguro que deseas rechazar la solicitud de {{username}}?',
      rejectConfirm: 'Rechazar',
      rejectError: 'No se pudo rechazar la solicitud',
    },
    contactRequestItem: {
      minutes: 'Hace {{value}}m',
      hours: 'Hace {{value}}h',
      days: 'Hace {{value}}d',
    },
    directMessage: {
      fallbackTitle: 'Chat con {{id}}...',
      connectionError: 'Error de conexión',
    },
    profile: {
      title: 'Mi Perfil',
      user: 'Usuario',
      deviceIdTitle: 'ID Único de Dispositivo',
      deviceIdDescription: 'Comparte este ID con otros usuarios para que puedan agregarte como contacto',
      deviceIdPlaceholder: 'Cargando...',
      copy: '📋 Copiar ID',
      info: 'Información',
      loading: 'Cargando perfil...',
      sessionMissingTitle: 'Sesión no encontrada',
      sessionMissingMessage: 'Necesitas iniciar sesión primero',
      deleteTitle: 'Eliminar cuenta',
      deleteMessage: '¿Estás seguro de que quieres eliminar tu cuenta?\n\nEsta acción:\n• Eliminará todos tus chats privados\n• Eliminará tu usuario\n• Es irreversible',
      deleteConfirm: 'Eliminar cuenta',
      deleteCancel: 'Cancelar',
      deleteError: 'No se pudo eliminar la cuenta. Inténtalo de nuevo.',
      notificationTestSend: '🔔 Probar Notificaciones',
      notificationTestError: 'No se pudo enviar la notificación',
      notificationTestSuccess: 'Notificación enviada',
      logout: 'Eliminar Cuenta',
    },
    rooms: {
      headerTitle: 'Salas de Chat',
      headerSubtitle: 'Hola, {{username}}',
      loading: 'Cargando salas...',
      emptyTitle: 'No hay salas disponibles',
      emptySubtitle: '¡Crea la primera sala!',
      createButton: '+ Crear Sala',
      modalTitle: 'Crear Nueva Sala',
      inputPlaceholder: 'Nombre de la sala',
      cancel: 'Cancelar',
      create: 'Crear',
      createdBy: 'Creada por: {{owner}}',
      private: '🔒 Privada',
      dateLocale: 'es-ES',
      errors: {
        load: 'No se pudieron cargar las salas',
        create: 'No se pudo crear la sala',
        nameRequired: 'Por favor ingresa un nombre para la sala',
      },
    },
    usersList: {
      errorLoad: 'No se pudieron cargar los usuarios',
      errorCurrent: 'No se pudo obtener tu usuario actual',
      errorPublicKey: 'No se pudo obtener la clave pública de este usuario. No se puede iniciar el chat cifrado.',
      placeholder: 'Buscar usuarios (username#1234)...',
      emptySearch: 'No se encontraron usuarios',
      emptyAll: 'No hay usuarios registrados',
    },
    notifications: {
      joinTitle: '👋 {{username}} se unió',
      joinBody: '{{username}} se ha unido al chat',
      leftTitle: '👋 {{username}} salió',
      leftBody: '{{username}} salió del chat',
    },
  },
  ar: {
    common: {
      appName: 'شاتي',
      ok: 'حسناً',
      cancel: 'إلغاء',
      error: 'خطأ',
      back: 'رجوع',
      delete: 'حذف',
      loading: 'جار التحميل...',
      system: 'النظام',
      user: 'المستخدم',
      copy: 'نسخ المعرّف',
      connectingEncrypted: 'جار الاتصال بالدردشة المشفّرة...',
      encrypted: '🔒 مشفّر',
      notEncrypted: '⚠️ غير مشفّر',
      messagePlaceholder: 'اكتب رسالة...',
    },
    time: {
      minutesAgo: 'قبل {{value}} دقيقة',
      hoursAgo: 'قبل {{value}} ساعة',
      daysAgo: 'قبل {{value}} يوم',
    },
    tabs: {
      chats: 'المحادثات',
      contacts: 'جهات الاتصال',
      rooms: 'الغرف',
      profile: 'الملف الشخصي',
    },
    login: {
      title: 'شاتي',
      subtitle: 'مرحباً في الدردشة',
      usernameLabel: 'اسم المستخدم',
      usernamePlaceholder: 'اسمك',
      join: 'متابعة',
      footer: 'بانضمامك، فأنت تقبل قواعد الدردشة',
      errors: {
        empty: 'يرجى إدخال اسم المستخدم',
        noUser: 'لم يتم استلام معلومات المستخدم',
        server: 'تعذر الاتصال بالخادم. تحقق من الاتصال.',
      },
    },
    navigator: {
      roomsBack: 'الغرف',
      addContact: 'إضافة جهة اتصال',
      back: 'رجوع',
      contactRequests: 'طلبات الاتصال',
    },
    chat: {
      userCountOne: '{{count}} مستخدم',
      userCountOther: '{{count}} مستخدمين',
      joined: '{{username}} انضم إلى الدردشة',
      left: '{{username}} غادر الدردشة',
    },
    chatInput: {
      placeholder: 'اكتب رسالة...',
    },
    typing: {
      singular: '{{users}} يكتب...',
      plural: '{{users}} يكتبون...',
    },
    conversations: {
      headerTitle: 'شاتي',
      emptyTitle: 'لا توجد محادثات نشطة',
      emptySubtitle: 'اذهب إلى "جهات الاتصال" لبدء محادثة',
      errorLoad: 'تعذر تحميل المحادثات',
      deleteTitle: 'حذف المحادثة',
      deleteMessage: 'هل أنت متأكد أنك تريد حذف هذه المحادثة؟',
      deleteConfirm: 'حذف',
      deleteCancel: 'إلغاء',
      deleteError: 'تعذر حذف المحادثة',
      previewEncrypted: 'رسالة مشفّرة',
      previewStart: 'اضغط لفتح دردشة مشفّرة',
    },
    contacts: {
      title: 'جهات الاتصال',
      emptyTitle: 'لا توجد جهات اتصال بعد',
      emptySubtitle: 'أضف جهات اتصال لبدء دردشات مشفّرة',
      addContact: 'إضافة جهة اتصال',
      requests: 'الطلبات',
      errorLoad: 'تعذر تحميل جهات الاتصال',
      errorCurrent: 'تعذر الحصول على المستخدم الحالي',
      errorStart: 'تعذر بدء المحادثة',
    },
    addContact: {
      title: 'إضافة جهة اتصال',
      description: 'لإضافة جهة اتصال تحتاج إلى معرف الجهاز الفريد الخاص به',
      step1Title: '📋 الخطوة 1: احصل على المعرّف',
      step1Text: 'يجب أن يذهب الطرف الآخر إلى ملفه الشخصي (👤) وينسخ معرف جهازه',
      step2Title: '✏️ الخطوة 2: الصق المعرّف هنا',
      placeholder: 'مثال: device_1234567890_abc123...',
      send: '✉️ إرسال الطلب',
      infoTitle: '💡 كيف يعمل؟',
      infoText: '• سيستلم طرفك طلباً\n• يجب أن يقبله في "📬 الطلبات"\n• بعد القبول يمكنكم الدردشة بشكل مشفّر 🔒\n• فقط الجهات المقبولة يمكنها الدردشة',
      errors: {
        empty: 'يرجى إدخال معرف جهاز صالح',
        notFound: 'لم يتم العثور على مستخدم بهذا المعرف',
        self: 'لا يمكنك إضافة نفسك كجهة اتصال',
        send: 'تعذر إرسال الطلب',
      },
      successTitle: 'تم إرسال الطلب',
      successMessage: 'تم إرسال طلب اتصال إلى {{username}}',
    },
    contactRequests: {
      title: 'طلبات الاتصال',
      emptyTitle: 'لا توجد طلبات معلّقة',
      emptySubtitle: 'الطلبات المرسلة من المستخدمين ستظهر هنا',
      errorLoad: 'تعذر تحميل الطلبات',
      acceptTitle: 'تم قبول الطلب',
      acceptMessage: '{{username}} تمت إضافته إلى جهات الاتصال. يمكنكم الدردشة الآن مشفّراً!',
      rejectTitle: 'رفض الطلب',
      rejectMessage: 'هل أنت متأكد أنك تريد رفض طلب {{username}}؟',
      rejectConfirm: 'رفض',
      rejectError: 'تعذر رفض الطلب',
    },
    contactRequestItem: {
      minutes: 'قبل {{value}} دقيقة',
      hours: 'قبل {{value}} ساعة',
      days: 'قبل {{value}} يوم',
    },
    directMessage: {
      fallbackTitle: 'دردشة مع {{id}}...',
      connectionError: 'خطأ في الاتصال',
    },
    profile: {
      title: 'ملفي الشخصي',
      user: 'المستخدم',
      deviceIdTitle: 'معرّف الجهاز الفريد',
      deviceIdDescription: 'شارك هذا المعرّف ليتمكن الآخرون من إضافتك كجهة اتصال',
      deviceIdPlaceholder: 'جار التحميل...',
      copy: '📋 نسخ المعرّف',
      info: 'معلومات',
      loading: 'جار تحميل الملف...',
      sessionMissingTitle: 'لم يتم العثور على جلسة',
      sessionMissingMessage: 'تحتاج إلى تسجيل الدخول أولاً',
      deleteTitle: 'حذف الحساب',
      deleteMessage: 'هل أنت متأكد أنك تريد حذف حسابك؟\n\nسيؤدي هذا إلى:\n• حذف كل محادثاتك الخاصة\n• حذف حسابك\n• لا يمكن التراجع عنه',
      deleteConfirm: 'حذف الحساب',
      deleteCancel: 'إلغاء',
      deleteError: 'تعذر حذف الحساب. حاول مرة أخرى.',
      notificationTestSend: '🔔 اختبار الإشعارات',
      notificationTestError: 'تعذر إرسال الإشعار',
      notificationTestSuccess: 'تم إرسال الإشعار',
      logout: 'حذف الحساب',
    },
    rooms: {
      headerTitle: 'غرف الدردشة',
      headerSubtitle: 'مرحباً، {{username}}',
      loading: 'جار تحميل الغرف...',
      emptyTitle: 'لا توجد غرف متاحة',
      emptySubtitle: 'أنشئ أول غرفة!',
      createButton: '+ إنشاء غرفة',
      modalTitle: 'إنشاء غرفة جديدة',
      inputPlaceholder: 'اسم الغرفة',
      cancel: 'إلغاء',
      create: 'إنشاء',
      createdBy: 'أنشأها: {{owner}}',
      private: '🔒 خاصة',
      dateLocale: 'ar',
      errors: {
        load: 'تعذر تحميل الغرف',
        create: 'تعذر إنشاء الغرفة',
        nameRequired: 'يرجى إدخال اسم للغرفة',
      },
    },
    usersList: {
      errorLoad: 'تعذر تحميل المستخدمين',
      errorCurrent: 'تعذر الحصول على المستخدم الحالي',
      errorPublicKey: 'تعذر الحصول على المفتاح العام لهذا المستخدم. لا يمكن بدء دردشة مشفّرة.',
      placeholder: 'ابحث عن المستخدمين (username#1234)...',
      emptySearch: 'لا يوجد مستخدمون',
      emptyAll: 'لا يوجد مستخدمون مسجّلون بعد',
    },
    notifications: {
      joinTitle: '👋 {{username}} انضم',
      joinBody: '{{username}} انضم إلى الدردشة',
      leftTitle: '👋 {{username}} غادر',
      leftBody: '{{username}} غادر الدردشة',
    },
  },
};

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, params) => key,
  locale: 'en-US',
});

const getNested = (obj, path) => path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);

const interpolate = (text, params) => {
  if (!params) return text;
  return Object.keys(params).reduce((acc, key) => acc.replaceAll(`{{${key}}}`, String(params[key])), text);
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguageState] = useState('en');
  const locale = language === 'es' ? 'es-ES' : language === 'ar' ? 'ar' : 'en-US';

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value && translations[value]) {
        setLanguageState(value);
      }
    });
  }, []);

  const setLanguage = async (lang) => {
    setLanguageState(lang);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, lang);
    } catch (err) {
      console.warn('Could not persist language', err);
    }
  };

  const t = (key, params) => {
    const value =
      getNested(translations[language], key) ??
      getNested(translations.en, key) ??
      key;
    if (typeof value !== 'string') return key;
    return interpolate(value, params);
  };

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      locale,
    }),
    [language, locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = () => useContext(LanguageContext);

export const getTranslator = async () => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    const lang = stored && translations[stored] ? stored : 'en';
    return (key, params) => {
      const value =
        getNested(translations[lang], key) ??
        getNested(translations.en, key) ??
        key;
      if (typeof value !== 'string') return key;
      return interpolate(value, params);
    };
  } catch (error) {
    console.warn('getTranslator fallback to EN', error);
    return (key, params) => {
      const value = getNested(translations.en, key) ?? key;
      if (typeof value !== 'string') return key;
      return interpolate(value, params);
    };
  }
};

export const LANGUAGE_STORAGE_KEY = STORAGE_KEY;


