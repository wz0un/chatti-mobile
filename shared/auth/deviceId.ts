/**
 * Web deviceId generation — mirrors the mobile format
 * `device_${ts}_${hash}_${rand}` (src/services/AuthService.js) using
 * `navigator.userAgent` for the hash component.
 * Spec: docs/WEB-ARCHITECTURE.md §5.2.
 */

const charCodeHash = (input: string): number =>
  Array.from(input).reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

export const generateDeviceId = (userAgent?: string): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  const agent =
    userAgent ??
    (typeof navigator !== 'undefined' ? navigator.userAgent : 'chatti-web');
  const deviceHash = Math.abs(charCodeHash(agent));
  return `device_${timestamp}_${deviceHash}_${random}`;
};
