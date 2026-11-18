import { HTMLElement, parse } from 'node-html-parser';

export interface ParsedHTML {
  root: HTMLElement;
  styles: Map<string, Record<string, string>>; // selector -> style rules
  computedStyles: Map<HTMLElement, Record<string, string>>; // element -> final styles
}

export class HTMLParser {
  parse(htmlString: string): ParsedHTML {
    const root = parse(htmlString);
    const styleElements = root.querySelectorAll('style');
    const cssRules = this.extractCSSRules(styleElements);
    const computedStyles = this.computeStyles(root, cssRules);

    return {
      root,
      styles: cssRules,
      computedStyles,
    };
  }

  private extractCSSRules(styleElements: HTMLElement[]): Map<string, Record<string, string>> {
    const rulesMap = new Map<string, Record<string, string>>();

    for (const styleEl of styleElements) {
      // CSS yorumları seçicilere yapışıp kuralları öldürüyordu (`/* Header */ .header`);
      // önce temizle, sonra @media sarmalını içeriğiyle değiştir.
      const cssText = this.unwrapAtMedia(
        (styleEl.textContent || '').replace(/\/\*[\s\S]*?\*\//g, ' '),
      );
      const ruleRegex = /([^{]+)\{([^}]+)\}/g;
      let match: RegExpExecArray | null;
      while ((match = ruleRegex.exec(cssText)) !== null) {
        const selectors = match[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const declarations = this.parseDeclarations(match[2]);
        for (const selector of selectors) {
          const existing = rulesMap.get(selector) || {};
          rulesMap.set(selector, { ...existing, ...declarations });
        }
      }
    }
    return rulesMap;
  }

  /** `@media print { ... }` sarmalını açar; iç kurallar normal kural gibi okunur. */
  private unwrapAtMedia(cssText: string): string {
    let result = cssText;
    let previous = '';
    while (result !== previous) {
      previous = result;
      result = result.replace(
        /@media[^{]*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g,
        '$1',
      );
    }
    return result;
  }

  /**
   * Deklarasyonları okur; `margin`/`padding` shorthand'lerini
   * (1–4 değer) uzun formlara açar (SPEC §mediaSizeName sonrası CSS desteği).
   */
  private parseDeclarations(block: string): Record<string, string> {
    const decls: Record<string, string> = {};
    const declRegex = /([a-zA-Z-]+)\s*:\s*([^;]+)/g;
    let match: RegExpExecArray | null;
    while ((match = declRegex.exec(block)) !== null) {
      const property = match[1].trim();
      const value = match[2].trim();
      if (property === 'margin' || property === 'padding') {
        const [top, right, bottom, left] = this.expandBoxShorthand(value);
        decls[`${property}-top`] = top;
        decls[`${property}-right`] = right;
        decls[`${property}-bottom`] = bottom;
        decls[`${property}-left`] = left;
      } else {
        decls[property] = value;
      }
    }
    return decls;
  }

  private expandBoxShorthand(
    value: string,
  ): [string, string, string, string] {
    const parts = value.split(/\s+/).filter(Boolean);
    const top = parts[0] ?? '0';
    const right = parts[1] ?? top;
    const bottom = parts[2] ?? top;
    const left = parts[3] ?? right;
    return [top, right, bottom, left];
  }

  private computeStyles(
    root: HTMLElement,
    cssRules: Map<string, Record<string, string>>,
  ): Map<HTMLElement, Record<string, string>> {
    const computed = new Map<HTMLElement, Record<string, string>>();

    const traverse = (el: HTMLElement, inheritedStyles: Record<string, string>) => {
      const ownStyles: Record<string, string> = { ...inheritedStyles };

      // ⭐ ÇÖZÜM: class attribute'u elle parse et
      let classList: string[] = [];
      const classAttr = el.getAttribute('class');
      if (classAttr && typeof classAttr === 'string') {
        classList = classAttr
          .split(' ')
          .map((c) => c.trim())
          .filter((c) => c.length > 0);
      }

      const classes = classList.length > 0 ? '.' + classList.join('.') : '';
      const id = el.id ? '#' + el.id.trim() : '';
      const tag = el.tagName?.toLowerCase() || '';

      // Kök elementi atla (tag'i olmayan)
      if (!tag && !id && classList.length === 0) {
        computed.set(el, {});
        for (const child of el.childNodes as HTMLElement[]) {
          if (child.nodeType === 1) {
            traverse(child, inheritedStyles);
          }
        }
        return;
      }

      // Seçicileri oluştur — CSS özgüllük sırasıyla: tag < class < tag.class < id.
      const selectors: string[] = [];
      if (tag) selectors.push(tag);
      if (classes) selectors.push(classes);
      if (tag && classes) selectors.push(`${tag}${classes}`);
      if (id) selectors.push(id);

      // Stilleri uygula
      for (const sel of selectors) {
        const rules = cssRules.get(sel);
        if (rules) {
          Object.assign(ownStyles, rules);
          if (sel === id) break; // ID en yüksek öncelik
        }
      }

      // Basit torun seçicileri (`.header h1`, `body p`) — sınıf/tag seçicilerden
      // sonra uygulanır ki CSS'teki beklenen özgüllük korunsun.
      for (const [selector, rules] of cssRules) {
        if (!selector.includes(' ') || selector.startsWith('@')) continue;
        if (this.matchesSelector(el, selector)) {
          Object.assign(ownStyles, rules);
        }
      }

      // Inline `style="..."` en yüksek öncelik (README'deki page-break dahil).
      const inlineStyle = el.getAttribute('style');
      if (inlineStyle) {
        Object.assign(ownStyles, this.parseDeclarations(inlineStyle));
      }

      computed.set(el, ownStyles);

      // Miras alınan özellikler
      const inherited = { ...ownStyles };
      const inheritProps = [
        'color',
        'font-family',
        'font-size',
        'font-weight',
        'font-style',
        'text-align',
        'line-height',
        'tab-stops',
      ];
      for (const prop of inheritProps) {
        if (ownStyles[prop] !== undefined) {
          inherited[prop] = ownStyles[prop];
        }
      }

      for (const child of el.childNodes as HTMLElement[]) {
        if (child.nodeType === 1) {
          traverse(child, inherited);
        }
      }
    };

    traverse(root, {});
    return computed;
  }

  /** Basit seçici: tag, .class, tag.class, #id, .a.b ve `*`. */
  private matchesSimple(element: HTMLElement, selector: string): boolean {
    if (selector === '*') return true;

    const idMatch = selector.match(/#([A-Za-z0-9_-]+)/);
    if (idMatch && element.id !== idMatch[1]) return false;

    const classMatches = [...selector.matchAll(/\.([A-Za-z0-9_-]+)/g)].map(
      (match) => match[1],
    );
    if (classMatches.length > 0) {
      const elementClasses = (element.getAttribute('class') || '')
        .split(/\s+/)
        .filter(Boolean);
      if (!classMatches.every((name) => elementClasses.includes(name))) {
        return false;
      }
    }

    const tagMatch = selector.match(/^[a-zA-Z][a-zA-Z0-9-]*/);
    if (tagMatch && element.tagName?.toLowerCase() !== tagMatch[0].toLowerCase()) {
      return false;
    }

    return true;
  }

  /** `A B` / `A B C` biçimindeki basit torun seçicilerini eşler. */
  private matchesSelector(element: HTMLElement, selector: string): boolean {
    const parts = selector.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return false;
    if (!this.matchesSimple(element, parts[parts.length - 1])) return false;

    let ancestor = element.parentNode as HTMLElement | null;
    for (let index = parts.length - 2; index >= 0; index -= 1) {
      let found = false;
      while (ancestor) {
        if (this.matchesSimple(ancestor, parts[index])) {
          found = true;
          ancestor = ancestor.parentNode as HTMLElement | null;
          break;
        }
        ancestor = ancestor.parentNode as HTMLElement | null;
      }
      if (!found) return false;
    }
    return true;
  }
}
