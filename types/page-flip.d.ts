declare module 'page-flip' {
  type FlipCorner = 'top' | 'bottom';

  interface PageFlipSettings {
    width: number;
    height: number;
    size?: 'fixed' | 'stretch';
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    showPageCorners?: boolean;
    useMouseEvents?: boolean;
    clickEventForward?: boolean;
    disableFlipByClick?: boolean;
  }

  interface PageFlipEvent<T = unknown> {
    data: T;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    loadFromHTML(items: NodeListOf<Element> | Element[]): void;
    on<T = unknown>(eventName: string, callback: (event: PageFlipEvent<T>) => void): void;
    destroy(): void;
    flip(pageIndex: number, corner?: FlipCorner): void;
    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    turnToPage(pageIndex: number): void;
  }
}
