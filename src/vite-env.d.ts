/// <reference types="vite/client" />

declare module 'jscanify' {
  export default class jscanify {
    constructor();
    highlightPaper(canvas: HTMLCanvasElement, options?: any): HTMLCanvasElement;
    extractPaper(canvas: HTMLCanvasElement, width: number, height: number, options?: any): HTMLCanvasElement;
  }
}

declare module 'jscanify/src/jscanify' {
  export default class jscanify {
    constructor();
    highlightPaper(canvas: HTMLCanvasElement, options?: any): HTMLCanvasElement;
    extractPaper(canvas: HTMLCanvasElement, width: number, height: number, options?: any): HTMLCanvasElement;
  }
}
