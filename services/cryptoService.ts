export class CryptoService {
  async generateKeyPair(): Promise<CryptoKeyPair> {
    return await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }

  async exportKey(key: CryptoKey): Promise<JsonWebKey> {
    return await window.crypto.subtle.exportKey("jwk", key);
  }

  async importKey(jwk: JsonWebKey, type: 'public' | 'private'): Promise<CryptoKey> {
    return await window.crypto.subtle.importKey(
      "jwk",
      jwk,
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      [type === 'public' ? "encrypt" : "decrypt"]
    );
  }

  async encrypt(data: string, publicKey: CryptoKey): Promise<string> {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);
    
    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      encodedData
    );

    return this.arrayBufferToBase64(encryptedBuffer);
  }

  async decrypt(encryptedBase64: string, privateKey: CryptoKey): Promise<string> {
    const encryptedData = this.base64ToArrayBuffer(encryptedBase64);
    
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedData
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }

  async hash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

export const cryptoService = new CryptoService();