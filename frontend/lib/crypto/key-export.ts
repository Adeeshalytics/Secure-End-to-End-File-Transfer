function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return window.btoa(binary);
}

function formatPem(base64Body: string): string {
  const lines = base64Body.match(/.{1,64}/g) ?? [];
  return `-----BEGIN PUBLIC KEY-----\n${lines.join("\n")}\n-----END PUBLIC KEY-----`;
}

export async function exportPublicKeySpki(publicKey: CryptoKey): Promise<ArrayBuffer> {
  return window.crypto.subtle.exportKey("spki", publicKey);
}

export async function exportPublicKeyPem(publicKey: CryptoKey): Promise<string> {
  const spki = await exportPublicKeySpki(publicKey);
  return formatPem(arrayBufferToBase64(spki));
}
