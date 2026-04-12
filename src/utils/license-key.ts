import crypto from "crypto";

export function generateLicenseKey() {
  const segments = Array.from({ length: 4 }, () =>
    crypto.randomBytes(3).toString("hex").toUpperCase(),
  );
  return segments.join("-");
}

