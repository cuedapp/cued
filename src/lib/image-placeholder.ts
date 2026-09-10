// A tiny neutral placeholder used while remote or API-backed artwork is decoded.
// Keeping this shared avoids each image component inventing a different loading color.
export const imageBlurDataUrl =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='15' viewBox='0 0 10 15'%3E%3Crect width='10' height='15' fill='%23241b17'/%3E%3C/svg%3E";
