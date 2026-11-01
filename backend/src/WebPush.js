/**
 * Web Push — protocol de envío para Task 22.
 *
 * Implementación cero-dependencias sobre WebCrypto para Cloudflare Workers:
 *   - VAPID (RFC 8292): JWT ES256 con clave ECDSA P-256 + cabecera
 *     `Authorization: vapid t=..., k=...` (draft-02, aceptada por FCM).
 *   - Cifrado aes128gcm (RFC 8188 + RFC 8291): ECDH P-256 efímero + HKDF-SHA-256
 *     + AES-128-GCM, fijado byte-a-byte contra el vector del RFC 8291 §5/§A.
 *
 * Contrato del payload: `shared/notifications/webPush.ts` y `docs/WEB-PUSH.md`.
 */

const SALT_LENGTH = 16;
const RECORD_SIZE_LENGTH = 4;
const ID_LENGTH_LENGTH = 1;
const KEY_ID_LENGTH = 65;
const GCM_TAG_LENGTH = 16;
const PADDING_DELIMITER = 0x02;
const UNCOMPRESSED_POINT_TAG = 0x04;
const RECORD_SIZE = 4096;
const HEADER_LENGTH = SALT_LENGTH + RECORD_SIZE_LENGTH + ID_LENGTH_LENGTH + KEY_ID_LENGTH;
const MAX_PAYLOAD_BYTES = RECORD_SIZE - HEADER_LENGTH - 1 - GCM_TAG_LENGTH;
const VAPID_MAX_EXPIRATION = 24 * 60 * 60;

const encoder = new TextEncoder();

/* ------------------------------------------------------------------ */
/* base64url                                                           */
/* ------------------------------------------------------------------ */

export const urlBase64ToUint8Array = (base64String) => {
    if (!base64String) {
        return new Uint8Array(0);
    }

    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
};

export const uint8ArrayToUrlBase64 = (array) => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < array.length; i += chunkSize) {
        binary += String.fromCharCode(...array.subarray(i, i + chunkSize));
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/* ------------------------------------------------------------------ */
/* VAPID (RFC 8292)                                                    */
/* ------------------------------------------------------------------ */

/**
 * Generar un keypair VAPID (ECDSA P-256). Devuelve claves en base64url:
 * públicas sin comprimir (65 bytes) y privada como escalar de 32 bytes.
 */
export const generateVapidKeys = async () => {
    const keyPair = await crypto.subtle.generateKey(
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign', 'verify']
    );

    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    return {
        publicKey: uint8ArrayToUrlBase64(new Uint8Array(publicKeyRaw)),
        privateKey: uint8ArrayToUrlBase64(urlBase64ToUint8Array(privateKeyJwk.d)),
    };
};

const encodeJwtSegment = (segment) =>
    uint8ArrayToUrlBase64(encoder.encode(JSON.stringify(segment)));

const importVapidSigningKey = (publicKey, privateKey) => {
    const publicKeyArray = urlBase64ToUint8Array(publicKey);
    const privateKeyArray = urlBase64ToUint8Array(privateKey);

    if (publicKeyArray.length !== 65 || publicKeyArray[0] !== UNCOMPRESSED_POINT_TAG) {
        throw new Error('VAPID public key debe ser un punto P-256 sin comprimir de 65 bytes');
    }
    if (privateKeyArray.length !== 32) {
        throw new Error('VAPID private key debe ser un escalar P-256 de 32 bytes');
    }

    const jwk = {
        kty: 'EC',
        crv: 'P-256',
        x: uint8ArrayToUrlBase64(publicKeyArray.slice(1, 33)),
        y: uint8ArrayToUrlBase64(publicKeyArray.slice(33)),
        d: uint8ArrayToUrlBase64(privateKeyArray),
    };

    return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, [
        'sign',
    ]);
};

/**
 * Crear el token VAPID (JWT ES256) firmado con el keypair de la aplicación.
 * `audience` es el origen del endpoint del push service.
 */
export const createVapidJwt = async ({
    audience,
    subject,
    publicKey,
    privateKey,
    expiration = 12 * 60 * 60,
}) => {
    if (expiration <= 0 || expiration > VAPID_MAX_EXPIRATION) {
        throw new Error('La expiración VAPID debe estar entre 1 y 86400 segundos');
    }
    if (!/^(mailto:|https:\/\/)/.test(subject)) {
        throw new Error('El subject VAPID debe ser una URI mailto: o https://');
    }

    const now = Math.floor(Date.now() / 1000);
    const unsignedToken = [
        { typ: 'JWT', alg: 'ES256' },
        { aud: audience, exp: now + expiration, sub: subject },
    ]
        .map(encodeJwtSegment)
        .join('.');

    const signingKey = await importVapidSigningKey(publicKey, privateKey);
    const signature = await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        signingKey,
        encoder.encode(unsignedToken)
    );

    return `${unsignedToken}.${uint8ArrayToUrlBase64(new Uint8Array(signature))}`;
};

/**
 * Construir la cabecera de autorización VAPID draft-02:
 * `vapid t=<token>, k=<clave pública>`.
 */
export const buildVapidAuthorization = async ({
    endpoint,
    subject,
    publicKey,
    privateKey,
    expiration,
}) => {
    const audience = new URL(endpoint).origin;
    const token = await createVapidJwt({ audience, subject, publicKey, privateKey, expiration });
    return {
        audience,
        authorization: `vapid t=${token}, k=${publicKey}`,
    };
};

/* ------------------------------------------------------------------ */
/* Cifrado aes128gcm (RFC 8188 + RFC 8291)                             */
/* ------------------------------------------------------------------ */

const concat = (...parts) => {
    const out = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
};

const hkdfInfo = (label, ...context) =>
    concat(encoder.encode(label), new Uint8Array([0x00]), ...context);

const importHkdfKey = (bytes) =>
    crypto.subtle.importKey('raw', bytes, 'HKDF', false, ['deriveBits', 'deriveKey']);

const validatePushInputs = (payload, p256dhKey, authSecret) => {
    if (payload.length > MAX_PAYLOAD_BYTES) {
        throw new Error(
            `Payload demasiado grande: ${payload.length} bytes exceden el límite de ${MAX_PAYLOAD_BYTES} bytes`
        );
    }

    const clientPublicKeyBytes = urlBase64ToUint8Array(p256dhKey);
    if (
        clientPublicKeyBytes.length !== KEY_ID_LENGTH ||
        clientPublicKeyBytes[0] !== UNCOMPRESSED_POINT_TAG
    ) {
        throw new Error(
            'Clave p256dh inválida: se espera una clave pública P-256 sin comprimir de 65 bytes'
        );
    }

    const authSecretBytes = urlBase64ToUint8Array(authSecret);
    if (authSecretBytes.length < 16) {
        throw new Error('auth secret inválido: se esperan al menos 16 bytes');
    }

    return { clientPublicKeyBytes, authSecretBytes };
};

const deriveInputKeyingMaterial = async (sharedSecret, authSecret, clientPublicKey, serverPublicKey) =>
    new Uint8Array(
        await crypto.subtle.deriveBits(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: authSecret,
                info: hkdfInfo('WebPush: info', clientPublicKey, serverPublicKey),
            },
            await importHkdfKey(sharedSecret),
            256
        )
    );

const deriveContentEncryptionKey = (ikmKey, salt) =>
    crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt,
            info: hkdfInfo('Content-Encoding: aes128gcm'),
        },
        ikmKey,
        { name: 'AES-GCM', length: 128 },
        false,
        ['encrypt']
    );

const deriveNonce = async (ikmKey, salt) =>
    new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt, info: hkdfInfo('Content-Encoding: nonce') },
            ikmKey,
            96
        )
    );

const padPayload = (payload) => concat(payload, new Uint8Array([PADDING_DELIMITER]));

const contentCodingHeader = (salt, keyId) => {
    const header = new Uint8Array(HEADER_LENGTH);
    header.set(salt, 0);
    new DataView(header.buffer).setUint32(SALT_LENGTH, RECORD_SIZE, false);
    header[SALT_LENGTH + RECORD_SIZE_LENGTH] = KEY_ID_LENGTH;
    header.set(keyId, SALT_LENGTH + RECORD_SIZE_LENGTH + ID_LENGTH_LENGTH);
    return header;
};

/**
 * Núcleo determinista del cifrado (exportado para el test known-answer del
 * RFC 8291). En producción usar `encryptPayload`, que genera clave efímera y
 * salt aleatorios por mensaje.
 */
export const encryptRecord = async (payload, p256dhKey, authSecret, serverKeyPair, salt) => {
    const { clientPublicKeyBytes, authSecretBytes } = validatePushInputs(
        payload,
        p256dhKey,
        authSecret
    );

    const clientPublicKey = await crypto.subtle.importKey(
        'raw',
        clientPublicKeyBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );

    const sharedSecret = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'ECDH', public: clientPublicKey },
            serverKeyPair.privateKey,
            256
        )
    );
    const serverPublicKey = new Uint8Array(
        await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
    );

    const ikm = await deriveInputKeyingMaterial(
        sharedSecret,
        authSecretBytes,
        clientPublicKeyBytes,
        serverPublicKey
    );
    const ikmKey = await importHkdfKey(ikm);
    const contentEncryptionKey = await deriveContentEncryptionKey(ikmKey, salt);
    const nonce = await deriveNonce(ikmKey, salt);

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        contentEncryptionKey,
        padPayload(payload)
    );

    return concat(contentCodingHeader(salt, serverPublicKey), new Uint8Array(ciphertext));
};

/**
 * Cifrar un payload como un único registro aes128gcm con clave efímera y salt
 * aleatorios (un par por mensaje).
 */
export const encryptPayload = async (payload, p256dhKey, authSecret) => {
    const serverKeyPair = await crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    return encryptRecord(payload, p256dhKey, authSecret, serverKeyPair, salt);
};

/* ------------------------------------------------------------------ */
/* Envío (RFC 8030)                                                    */
/* ------------------------------------------------------------------ */

/** Construir el fetch request para un envío web push (sin realizarlo). */
export const buildPushRequest = async ({ subscription, payload, vapid, ttl = 60 }) => {
    if (!subscription || !subscription.endpoint) {
        throw new Error('Suscripción web push inválida: falta endpoint');
    }
    if (!subscription.keys || !subscription.keys.p256dh || !subscription.keys.auth) {
        throw new Error('Suscripción web push inválida: faltan claves p256dh/auth');
    }
    if (!vapid || !vapid.publicKey || !vapid.privateKey || !vapid.subject) {
        throw new Error('VAPID no configurado');
    }

    const { authorization, audience } = await buildVapidAuthorization({
        endpoint: subscription.endpoint,
        subject: vapid.subject,
        publicKey: vapid.publicKey,
        privateKey: vapid.privateKey,
    });

    const body = await encryptPayload(
        encoder.encode(payload),
        subscription.keys.p256dh,
        subscription.keys.auth
    );

    return {
        endpoint: subscription.endpoint,
        audience,
        request: new Request(subscription.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Encoding': 'aes128gcm',
                TTL: String(ttl),
                Authorization: authorization,
            },
            body,
        }),
    };
};

/**
 * Enviar una notificación web push a una suscripción. Devuelve el resultado
 * de forma descriptiva para que el llamante pueda purgar suscripciones
 * muertas (410 Gone).
 */
export const sendWebPush = async ({ subscription, payload, vapid, ttl = 60 }) => {
    const { request } = await buildPushRequest({ subscription, payload, vapid, ttl });
    const res = await fetch(request);

    // 201 = entregado; 404/410 = suscripción muerta (el llamante debe purgar).
    return { ok: res.status === 201 || res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
};

/**
 * Leer la configuración VAPID del entorno del worker. Devuelve null si no está
 * completa (degradación controlada: el FE muestra "not configured").
 */
export const vapidConfigFromEnv = (env) => {
    const subject = env.VAPID_SUBJECT || env.VAPID_MAILTO;
    const publicKey = env.VAPID_PUBLIC_KEY;
    const privateKey = env.VAPID_PRIVATE_KEY;

    if (!subject || !publicKey || !privateKey) {
        return null;
    }
    return { subject, publicKey, privateKey };
};

// ---------------------------------------------------------------------
// Acceso a suscripciones en KV
// ---------------------------------------------------------------------

/** Prefijo KV donde se indexan las suscripciones web push de un usuario. */
export const webPushKey = (userId, deviceId) => `user:${userId}:webpush:${deviceId}`;

/**
 * Listar todas las claves KV que matchean un prefijo, paginando con `cursor`
 * en paquetes de `limit` (hasta 1000). Sin paginación, `KV.list()` solo
 * devuelve la primera página y el resto se pierde en silencio.
 */
export const listKeysPaginated = async (env, prefix, limit = 1000) => {
    const keys = [];
    let cursor;
    do {
        const page = await env.ROOMS_KV.list({ prefix, limit, cursor });
        keys.push(...page.keys);
        cursor = page.list_complete ? null : page.cursor;
    } while (cursor);
    return keys;
};

/** Listar todas las suscripciones web push registradas para un usuario. */
export const listWebPushSubscriptions = async (env, userId) => {
    const list = await listKeysPaginated(env, `user:${userId}:webpush:`, 100);
    const subs = [];
    for (const key of list) {
        const data = await env.ROOMS_KV.get(key.name);
        if (!data) continue;
        try {
            subs.push({ deviceId: key.name.split(':').pop(), subscription: JSON.parse(data) });
        } catch (error) {
            console.error(`Error parsing web push subscription ${key.name}:`, error);
        }
    }
    return subs;
};

/** Eliminar todas las suscripciones web push de un usuario (baja de cuenta). */
export const deleteWebPushSubscriptions = async (env, userId) => {
    const list = await listKeysPaginated(env, `user:${userId}:webpush:`, 100);
    await Promise.all(list.map((key) => env.ROOMS_KV.delete(key.name)));
};