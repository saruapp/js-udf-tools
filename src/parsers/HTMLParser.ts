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
      const cssText = styleEl.textContent || '';
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

  private parseDeclarations(block: string): Record<string, string> {
    const decls: Record<string, string> = {};
    const declRegex = /([a-zA-Z-]+)\s*:\s*([^;]+)/g;
    let match: RegExpExecArray | null;
    while ((match = declRegex.exec(block)) !== null) {
      decls[match[1].trim()] = match[2].trim();
    }
    return decls;
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

      // Seçicileri oluştur
      const selectors: string[] = [];
      if (id) selectors.push(id);
      if (tag && classes) selectors.push(`${tag}${classes}`);
      if (classes) selectors.push(classes);
      if (tag) selectors.push(tag);

      // Stilleri uygula
      for (const sel of selectors) {
        const rules = cssRules.get(sel);
        if (rules) {
          Object.assign(ownStyles, rules);
          if (sel === id) break; // ID en yüksek öncelik
        }
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
}
