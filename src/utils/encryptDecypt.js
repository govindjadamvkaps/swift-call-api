import crypto from "crypto";

const algorithm = "aes-256-cbc";
const secretKey = Buffer.from(
  "j3Nk1FyS1owP5rTO+5fFpbcVmY7E2RvEOi+OBofL/+Q=/*",
  "base64"
);
const iv = Buffer.from("qOcZ1Hjcl6Udc+HXvUAXRQ==++", "base64");

// Encrypt Function
export function encrypt(data) {
  try {
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");
    return encrypted;
  } catch (err) {
    console.error("Encryption failed:", err.message);
    throw err;
  }
}

// Decrypt Function
export function decrypt(encryptedData) {
  try {
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption failed:", err.message);
    throw err;
  }
}
