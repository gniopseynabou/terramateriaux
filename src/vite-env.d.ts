/// <reference types="vite/client" />
/// <reference types="vite-imagetools/client" />

declare module "*&format=webp" {
  const src: string;
  export default src;
}
declare module "*&format=webp&as=srcset" {
  const srcset: string;
  export default srcset;
}
