import { HTMLElement } from 'node-html-parser';
import { isBlockElement } from '../utils/domUtils';

export interface TextPiece {
  text: string;
  startOffset: number;
  length: number;
  element: HTMLElement;
  ownerElement: HTMLElement;
  blockElement: HTMLElement;
  styleName: string;
}

export interface ContentBuildResult {
  fullText: string;
  blockElements: HTMLElement[];
  blockTextPieces: Map<HTMLElement, TextPiece[]>;
  imageOffsets: Map<HTMLElement, number>;
}

export class ContentBuilder {
  build(
    root: HTMLElement,
    computedStyles: Map<HTMLElement, Record<string, string>>,
  ): ContentBuildResult {
    const fullText: string[] = [];
    const blockElements: HTMLElement[] = [];
    const blockTextPieces = new Map<HTMLElement, TextPiece[]>();
    const imageOffsets = new Map<HTMLElement, number>();

    let currentOffset = 0;

    const traverseChildren = (el: HTMLElement, currentBlock: HTMLElement | null) => {
      for (const node of el.childNodes) {
        if (node.nodeType === 1) {
          const element = node as HTMLElement;
          const tag = element.tagName?.toLowerCase();

          if (tag === 'style' || tag === 'script' || tag === 'head') {
            continue;
          }

          if (tag === 'img') {
            const PLACEHOLDER = '\uFFFC';
            fullText.push(PLACEHOLDER);
            imageOffsets.set(element, currentOffset);
            currentOffset += 1;
          }

          if (isBlockElement(element)) {
            const styles = computedStyles.get(element) || {};
            const isPageBreak = styles['page-break-before'] === 'always';
            // Boş `page-break` div'leri metin içermez ama yine de eleman
            // sırasına girmeli (SPEC: page-break-before desteği).
            if (isPageBreak || this.hasVisibleContent(element)) {
              blockElements.push(element);
              blockTextPieces.set(element, []);
              currentBlock = element;
            }
          }

          traverseChildren(element, currentBlock);
        } else if (node.nodeType === 3) {
          const text = node.textContent || '';
          if (text.trim().length > 0) {
            if (!currentBlock) {
              currentBlock = node.parentNode;
              if (!blockTextPieces.has(currentBlock)) {
                blockElements.push(currentBlock);
                blockTextPieces.set(currentBlock, []);
              }
            }

            const textPiece: TextPiece = {
              text,
              startOffset: currentOffset,
              length: text.length,
              element: node.parentNode,
              ownerElement: node.parentNode,
              blockElement: currentBlock,
              styleName: this.getStyleName(node.parentNode, computedStyles),
            };

            blockTextPieces.get(currentBlock)!.push(textPiece);
            fullText.push(text);
            currentOffset += text.length;
          }
        }
      }
    };

    const body = root.querySelector('body');
    const traversalRoot = body || root;

    traverseChildren(traversalRoot, null);

    return {
      fullText: fullText.join(''),
      blockElements,
      blockTextPieces,
      imageOffsets,
    };
  }

  private isInBody(el: HTMLElement): boolean {
    let current: HTMLElement | null = el;
    while (current) {
      const tag = current.tagName?.toLowerCase();
      if (tag === 'body') return true;
      if (tag === 'head' || tag === 'style' || tag === 'script') return false;
      current = current.parentNode;
    }
    return false;
  }

  private getStyleName(
    el: HTMLElement,
    computedStyles: Map<HTMLElement, Record<string, string>>,
  ): string {
    const styles = computedStyles.get(el);
    if (!styles) return 'default';
    return 'default';
  }

  findNearestBlock(el: HTMLElement, root: HTMLElement): HTMLElement {
    let current: HTMLElement | null = el;
    while (current && !isBlockElement(current) && current !== root) {
      current = current.parentNode;
    }
    return current || root;
  }

  public hasVisibleContent(el: HTMLElement): boolean {
    const tag = el.tagName?.toLowerCase();

    if (tag === 'style' || tag === 'script' || tag === 'head') {
      return false;
    }
    if (tag === 'img') {
      return true;
    }
    if (tag === 'ul' || tag === 'ol' || tag === 'div' || tag === 'span') {
      for (const node of el.childNodes) {
        if (node.nodeType === 1) {
          if (this.hasVisibleContent(node as HTMLElement)) return true;
        }
      }
      return false;
    }

    for (const node of el.childNodes) {
      if (node.nodeType === 3) {
        const text = node.textContent || '';
        if (text.trim().length > 0) return true;
      }
      if (node.nodeType === 1) {
        if (this.hasVisibleContent(node as HTMLElement)) return true;
      }
    }
    return false;
  }
}
