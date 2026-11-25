// shared/udf-converter/utils/domUtils.ts
import { HTMLElement, NodeType } from 'node-html-parser';

/**
 * HTML'de blok seviyesinde elementlerin listesi.
 */
const BLOCK_TAGS = new Set([
  'p',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
  'header',
  'footer',
  'section',
  'article',
  'main',
  'aside',
  'nav',
  'address',
  'blockquote',
  'pre',
  'figure',
  'figcaption',
  'hr',
  'fieldset',
  'form',
  'img',
]);

/**
 * Bir elementin blok seviyesinde olup olmadığını kontrol eder.
 */
export function isBlockElement(el: HTMLElement): boolean {
  const tag = el.tagName?.toLowerCase();
  return tag ? BLOCK_TAGS.has(tag) : false;
}

/**
 * Bir elementin inline olup olmadığını kontrol eder (basitçe blok değilse inline).
 */
export function isInlineElement(el: HTMLElement): boolean {
  return !isBlockElement(el);
}

/**
 * Bir elementin metin içeriğini alır (tüm alt text node'ları birleştirir).
 */
export function getElementText(el: HTMLElement): string {
  let text = '';
  for (const node of el.childNodes) {
    if (node.nodeType === NodeType.TEXT_NODE) {
      // text node
      text += node.textContent || '';
    } else if (node.nodeType === NodeType.ELEMENT_NODE) {
      // element node
      text += getElementText(node as HTMLElement);
    }
  }
  return text;
}
