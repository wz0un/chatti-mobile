/**
 * Tests unidad de WebPush.js (Task 22).
 *
 * - Known-answer vector del RFC 8291 §5/§A (cifrado byte-byte).
 * - Round-trip sender/recipient (decrypción de prueba, no va a producción).
 * - VAPID: generación de claves, JWT ES256 y cabecera draft-02.
 */
import { describe, expect, it } from 'vitest';
import {
    encryptRecord,
    createVapidJwt,
    buildVapidAuthorization,
    generateVapidKeys,
    urlBase64ToUint8Array,
    uint8ArrayToUrlBase64,
    listKeysPaginated,
} from './WebPush.js';

/* ------------------------------------------------------------------ */
/* RFC 8291 Appendix A known-answer                                    */
/* ------------------------------------------------------------------ */

const PLAINTEXT = 'When I grow up, I want to be a watermelon';

const UA_PUBLIC =
    'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4';
const AUTH_SECRET = 'BTBZMqHH6r4Tts7J_aSIgg';

const AS_PRIVATE = 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw';
const AS_PUBLIC =
    'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8';
const SALT = 'DGv6ra1nlYgDCS1FRnbzlw';

const EXPECTED_BODY =
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml' +
    'mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT' +
    'pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN';

const importAsKeyPair = async () => {
    const publicBytes = urlBase64ToUint8Array(AS_PUBLIC);
    const publicKey = await crypto.subtle.importKey(
        'raw',
        publicBytes,
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        []
    );
    const privateKey = await crypto.subtle.importKey(
        'jwk',
        {
            kty: 'EC',
            crv: 'P-256',
            x: uint8ArrayToUrlBase64(publicBytes.slice(1, 33)),
            y: uint8ArrayToUrlBase64(publicBytes.slice(33, 65)),
            d: AS_PRIVATE,
        },
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveBits']
    );
    return { publicKey, privateKey };
};

describe('RFC 8291 Appendix A vector', () => {
    it('produce el ciphertext del RFC byte a byte', async () => {
        const keyPair = await importAsKeyPair();
        const salt = urlBase64ToUint8Array(SALT);
        const payload = new TextEncoder().encode(PLAINTEXT);

        const body = await encryptRecord(payload, UA_PUBLIC, AUTH_SECRET, keyPair, salt);

        expect(uint8ArrayToUrlBase64(body)).toBe(EXPECTED_BODY);
    });
});

/* ------------------------------------------------------------------ */
/* Round-trip sender/recipient                                         */
/* ------------------------------------------------------------------ */

const concatBytes = (...parts) => {
    const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
    let offset = 0;
    for (const part of parts) {
        out.set(part, offset);
        offset += part.length;
    }
    return out;
};

/**
 * Decrypción de prueba (solo tests): invierte las derivaciones RFC 8188/8291
 * desde la clave privada del receptor. No se usa en producción.
 */
const decryptRecord = async (record, receiverPrivateJwk, p256dhRaw, authSecretRaw) => {
    const salt = record.subarray(0, 16);
    const idLen = record[20];
    const keyId = record.subarray(21, 21 + idLen);
    const ciphertext = record.subarray(21 + idLen);

    const serverPublicKey = await crypto.subtle.importKey(
        'raw',
        keyId,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
    );
    const receiverPrivateKey = await crypto.subtle.importKey(
        'jwk',
        receiverPrivateJwk,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        ['deriveBits']
    );
    const sharedSecret = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'ECDH', public: serverPublicKey },
            receiverPrivateKey,
            256
        )
    );

    const info = concatBytes(
        new TextEncoder().encode('WebPush: info'),
        new Uint8Array([0x00]),
        p256dhRaw,
        keyId
    );
    const ikm = new Uint8Array(
        await crypto.subtle.deriveBits(
            { name: 'HKDF', hash: 'SHA-256', salt: authSecretRaw, info },
            await crypto.subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits']),
            256
        )
    );
    const ikmKey = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits', 'deriveKey']);
    const cek = await crypto.subtle.deriveKey(
        {
            name: 'HKDF',
            hash: 'SHA-256',
            salt,
            info: new TextEncoder().encode('Content-Encoding: aes128gcm\x00'),
        },
        ikmKey,
        { name: 'AES-GCM', length: 128 },
        false,
        ['decrypt']
    );
    const nonce = new Uint8Array(
        await crypto.subtle.deriveBits(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt,
                info: new TextEncoder().encode('Content-Encoding: nonce\x00'),
            },
            ikmKey,
            96
        )
    );

    const padded = new Uint8Array(
        await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, cek, ciphertext)
    );
    let end = padded.length - 1;
    while (end >= 0 && padded[end] === 0x00) end--;
    return new TextDecoder().decode(padded.subarray(0, end));
};

describe('round-trip sender/recipient', () => {
    it('cifra y descifra un payload arbitrario', async () => {
        const receiver = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveBits']
        );
        const p256dh = new Uint8Array(await crypto.subtle.exportKey('raw', receiver.publicKey));
        const authSecret = crypto.getRandomValues(new Uint8Array(16));
        const sender = await crypto.subtle.generateKey(
            { name: 'ECDH', namedCurve: 'P-256' },
            true,
            ['deriveBits']
        );
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const payload = new TextEncoder().encode(
            JSON.stringify({ title: '💬 alice#1234', body: 'hola', data: { kind: 'room' } })
        );

        const record = await encryptRecord(payload, uint8ArrayToUrlBase64(p256dh), uint8ArrayToUrlBase64(authSecret), sender, salt);

        const receiverJwk = await crypto.subtle.exportKey('jwk', receiver.privateKey);
        const plaintext = await decryptRecord(record, receiverJwk, p256dh, authSecret);

        const parsed = JSON.parse(plaintext);
        expect(parsed.title).toBe('💬 alice#1234');
        expect(parsed.data.kind).toBe('room');
    });
});

/* ------------------------------------------------------------------ */
/* VAPID                                                               */
/* ------------------------------------------------------------------ */

describe('VAPID', () => {
    it('genera un keypair P-256 en base64url con el tamaño esperado', async () => {
        const keys = await generateVapidKeys();
        expect(urlBase64ToUint8Array(keys.publicKey).length).toBe(65);
        expect(urlBase64ToUint8Array(keys.publicKey)[0]).toBe(0x04);
        expect(urlBase64ToUint8Array(keys.privateKey).length).toBe(32);
    });

    it('firma un JWT ES256 con las tres partes y el payload correcto', async () => {
        const { publicKey, privateKey } = await generateVapidKeys();
        const token = await createVapidJwt({
            audience: 'https://fcm.googleapis.com',
            subject: 'mailto:admin@example.com',
            publicKey,
            privateKey,
            expiration: 3600,
        });

        const [header, payload] = token.split('.').slice(0, 2);
        expect(JSON.parse(atob(header.replace(/-/g, '+').replace(/_/g, '/')))).toEqual({
            typ: 'JWT',
            alg: 'ES256',
        });
        const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
        expect(claims.aud).toBe('https://fcm.googleapis.com');
        expect(claims.sub).toBe('mailto:admin@example.com');
        const ttl = claims.exp - Math.floor(Date.now() / 1000);
        expect(ttl).toBeGreaterThan(3540);
        expect(ttl).toBeLessThanOrEqual(3600);
        expect(token.split('.')).toHaveLength(3);
    });

    it('genera la cabecera de autorización draft-02 con el público en k=', async () => {
        const { publicKey, privateKey } = await generateVapidKeys();
        const { authorization, audience } = await buildVapidAuthorization({
            endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/some_id',
            subject: 'mailto:admin@example.com',
            publicKey,
            privateKey,
        });

        expect(audience).toBe('https://updates.push.services.mozilla.com');
        expect(authorization.startsWith(`vapid t=`)).toBe(true);
        expect(authorization.endsWith(`, k=${publicKey}`)).toBe(true);
    });

    it('rechaza un subject sin mailto:/https://', async () => {
        const { publicKey, privateKey } = await generateVapidKeys();
        await expect(
            createVapidJwt({
                audience: 'https://fcm.googleapis.com',
                subject: 'admin@example.com',
                publicKey,
                privateKey,
            })
        ).rejects.toThrow('mailto');
    });
});

/* ------------------------------------------------------------------ */
/* listKeysPaginated — paginación del KV (P1 QA 2026-09-21)            */
/* ------------------------------------------------------------------ */

describe('listKeysPaginated', () => {
    it('recorre todas las páginas hasta que list_complete es true', async () => {
        const page1Keys = [
            { name: 'user:a:webpush:1' },
            { name: 'user:a:webpush:2' },
            { name: 'user:b:webpush:3' },
        ];
        const page2Keys = [
            { name: 'user:c:webpush:4' },
            { name: 'user:d:webpush:5' },
        ];
        const calls = [];
        const kv = {
            list: async ({ cursor, prefix, limit }) => {
                calls.push({ cursor, prefix, limit });
                if (cursor === 'cursor-2') {
                    return { keys: [], list_complete: true, cursor: undefined };
                }
                if (cursor === 'cursor-1') {
                    return { keys: page2Keys, list_complete: false, cursor: 'cursor-2' };
                }
                return { keys: page1Keys, list_complete: false, cursor: 'cursor-1' };
            },
        };

        const keys = await listKeysPaginated({ ROOMS_KV: kv }, 'user:');

        expect(keys).toEqual([...page1Keys, ...page2Keys]);
        expect(calls).toHaveLength(3);
        expect(calls[0]).toEqual({ cursor: undefined, prefix: 'user:', limit: 1000 });
        expect(calls[1]).toEqual({ cursor: 'cursor-1', prefix: 'user:', limit: 1000 });
        expect(calls[2]).toEqual({ cursor: 'cursor-2', prefix: 'user:', limit: 1000 });
    });

    it('devuelve lista vacía cuando el KV ya está completo en la primera página', async () => {
        const kv = {
            list: async () => ({ keys: [], list_complete: true, cursor: undefined }),
        };

        const keys = await listKeysPaginated({ ROOMS_KV: kv }, 'user:');

        expect(keys).toEqual([]);
    });
});