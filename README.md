# js-udf-tools

HTML dokümanlarını **UYAP UDF** (Ulusal Yargı Ağı Projesi Doküman Formatı) formatına dönüştüren TypeScript kütüphanesi.

Avukatlar, arabulucular ve hukuk yazılımı geliştiricileri için.

---

## UDF Nedir?

UDF, Türkiye'deki mahkeme ve arabuluculuk sistemlerinin (UYAP) kabul ettiği resmi doküman formatıdır. Teknik olarak içinde `content.xml` barındıran bir **ZIP arşividir**. XML içinde metinler, stiller, tablolar ve resimler özel bir şema ile tanımlanır.

UDF'i elle yazmak neredeyse imkansızdır — metinler tek bir CDATA bloğunda tutulur, her paragraf ve satır içi stil `startOffset` / `length` ile bu bloğa referans verir. Bu kütüphane, HTML'den otomatik UDF üreterek bu karmaşıklığı ortadan kaldırır.

## Kurulum

```bash
npm install js-udf-tools
```

Node.js ve React Native dosya sistemi adaptörleri **pakete dahildir** — ayrıca kurulum gerekmez.

> React Native kullanıyorsanız `expo-file-system` opsiyonel peer dependency'dir. Sadece `/rn` import'unu kullanıyorsanız kurmanız gerekir.

---

## Kullanım

### Basit Paragraf

```typescript
import { UDFConverter, NodeFileSystem } from 'js-udf-tools';

const converter = new UDFConverter(new NodeFileSystem());

const html = '<p>Merhaba Dünya</p>';
const file = await converter.convert(html, 'cikti.udf');

console.log(`UDF oluşturuldu: ${file.size} byte`);
```

### Stil Bloklu Doküman

```typescript
const html = `
<style>
  .baslik { text-align: center; font-size: 16pt; font-weight: bold; }
  .madde  { margin-left: 36pt; text-indent: -36pt; font-size: 12pt; }
</style>

<p class="baslik">ARABULUCULUK SON TUTANAĞI</p>
<p class="madde">1. Arabuluculuk süreci, tarafların başvurusu üzerine başlatılmıştır.</p>
<p class="madde">2. Taraflar 12.06.2025 tarihinde bir araya gelmiştir.</p>
<p class="madde">3. Toplantı sonucunda taraflar anlaşmaya varmıştır.</p>
`;

const file = await converter.convert(html, 'tutanak.udf');
```

### Liste

```typescript
// Maddeli liste
const htmlBulleted = `
<ul>
  <li>Kimlik fotokopisi</li>
  <li>Vekaletname aslı</li>
  <li>Dava dilekçesi</li>
</ul>
`;

// Numaralı liste
const htmlNumbered = `
<ol>
  <li>Arabuluculuk başvurusu yapılır.</li>
  <li>Taraflara davetiye gönderilir.</li>
  <li>İlk toplantı gerçekleştirilir.</li>
</ol>
`;
```

### Tablo

```typescript
const html = `
<table>
  <tr>
    <th style="background-color:#ccc">Ad Soyad</th>
    <th style="background-color:#ccc">TC Kimlik No</th>
    <th style="background-color:#ccc">Rol</th>
  </tr>
  <tr>
    <td>Ali Veli</td>
    <td>12345678901</td>
    <td>Başvuran</td>
  </tr>
  <tr>
    <td>Ayşe Fatma</td>
    <td>10987654321</td>
    <td>Karşı Taraf</td>
  </tr>
</table>
`;
```

### Resim (Base64)

```html
<p>
  <img
    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
    width="150"
    height="80"
    alt="Logo"
  />
</p>
```

### Resim (Dosya Yolu)

```typescript
const html = '<p><img src="logo.png" width="150" height="80" alt="Logo" /></p>';

const file = await converter.convert(html, 'cikti.udf', {
  resourceDir: './assets', // <img> dosyalarının bulunduğu dizin
});
```

`resourceDir` verildiğinde, göreli dosya yolları otomatik olarak base64 data URI'ye çevrilir.

> Resimler UDF içinde `<paragraph>` ile sarılmalıdır. Kütüphane `<img>` etiketini otomatik olarak `<paragraph><image>...</image></paragraph>` yapısına dönüştürür.

### Başlık ve Altlık

```typescript
const html = `
<header>
  <p style="text-align:center; font-size:10pt; color:#555">
    T.C. İstanbul Arabuluculuk Bürosu — Gizli Belge
  </p>
</header>

<p>Ana içerik metni burada yer alır...</p>

<footer>
  <p style="text-align:right; font-size:9pt; color:#888">Sayfa 1</p>
</footer>
`;
```

Üstbilgi (`<header>`) her sayfanın başında, altbilgi (`<footer>`) her sayfanın sonunda tekrarlanır.

### Sayfa Sonu

```html
<p>Birinci sayfanın son paragrafı.</p>

<div style="page-break-before:always"></div>

<p>İkinci sayfanın ilk paragrafı.</p>
```

### Sayfa Ayarları

```typescript
const file = await converter.convert(html, 'cikti.udf', {
  pageSize: 'A4',       // 'A4' | 'LETTER' (varsayılan: A4)
  margins: {
    top: 56.69,          // punto cinsinden
    bottom: 56.69,
    left: 70.86,
    right: 70.86,
  },
});
```

### React Native / Expo

```bash
npm install expo-file-system
```

```typescript
import { UDFConverter } from 'js-udf-tools';
import { RNFileSystem } from 'js-udf-tools/rn';

const converter = new UDFConverter(new RNFileSystem());
const file = await converter.convert(html, 'cikti.udf');
```

### Kendi Adaptörünüzü Yazma

```typescript
import { UDFConverter, IFileSystem, IFile } from 'js-udf-tools';

class MyMemoryFS implements IFileSystem {
  getFile(path: string): IFile { /* ... */ }
  getDocumentDirectory(): string { return '/docs'; }
  getCacheDirectory(): string { return '/cache'; }
  join(...paths: string[]): string { return paths.join('/'); }
}

const converter = new UDFConverter(new MyMemoryFS());
```

---

## Desteklenen HTML → UDF Eşleşmeleri

| HTML | UDF Çıktısı |
|------|-------------|
| `<p>`, `<div>`, `<section>` | `<paragraph>` |
| `<h1>` – `<h6>` | `<paragraph>` (bold, 24/20/16/14/12/10pt) |
| `<strong>`, `<b>` | Kalın metin |
| `<em>`, `<i>` | İtalik metin |
| `<u>` | Altı çizili metin |
| `<ul>` / `<li>` | `<paragraph Bulleted="true">` |
| `<ol>` / `<li>` | `<paragraph Numbered="true">` |
| `<table>`, `<tr>`, `<td>`, `<th>` | `<table>`, `<row>`, `<cell>` |
| `<img src="data:image/...;base64,...">` | `<image>` (`<paragraph>` içinde) |
| `<img src="dizin/dosya.png">` | `resourceDir` ile otomatik base64'e çevrilir |
| `<header>` | `<header>` |
| `<footer>` | `<footer>` |
| `page-break-before: always` (class/inline) | `<page-break>` |

### Desteklenen CSS Özellikleri

`text-align` · `margin-left` · `margin-right` · `margin-top` · `margin-bottom` · `text-indent` · `line-height` · `font-family` · `font-size` · `font-weight` · `font-style` · `text-decoration` · `color` · `background-color` · `vertical-align` (tablo hücreleri)

En tutarlı sonuçlar için `pt` birimini kullanın.

---

## Desteklenen Resim Formatları

PNG, JPEG, GIF, BMP, WebP.

---

## Nasıl Çalışır?

Dönüşüm 6 adımlı bir işlem hattından geçer:

1. **Resim çözümleme** — dosya yolları → base64 data URI (`resourceDir` ile)
2. **HTMLParser** — HTML + `<style>` bloklarını ayrıştırır, CSS seçicileri ve miras alınan stilleri hesaplar
3. **StylesBuilder** — hesaplanan stilleri tekilleştirir, parent zinciri ile isimlendirir
4. **ContentBuilder** — DOM'u gezer, tüm görünür metni tek bir CDATA dizisinde toplar, `startOffset` / `length` değerlerini takip eder
5. **ElementsBuilder** — HTML blok elementlerini offset referanslarıyla UDF elementlerine eşler
6. **XMLBuilder + ZIPBuilder** — `content.xml`'i oluşturur ve `.udf` ZIP arşivi olarak paketler

---

## Sınırlamalar

Henüz desteklenmeyen UDF özellikleri:

- `<tab>`, `<space>`, `<field>` elementleri
- Sayfa numarası (`pageNumber-spec`)
- Sayfa kenarlıkları, sayfa sütunları
- Arka plan resimleri (`<bgImage>`)
- Şablon `<data>` bölümü
- CSS: `text-transform`, `border*`, `display:flex`, `page-break-inside`
  (görsel detay; sayfalama `page-break-before` ile yapılır)

Katkılarınızı bekleriz — [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## API

### `new UDFConverter(fs: IFileSystem)`

Dönüştürücüyü bir dosya sistemi adaptörü ile başlatır. Hazır adaptörler:
- `NodeFileSystem` — Node.js için (ana export'a dahil)
- `RNFileSystem` — React Native / Expo için (`/rn` alt yolunda)

### `converter.convert(html, outputPath, options?)`

| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|-----------|----------|
| `html` | `string` | — | Dönüştürülecek HTML |
| `outputPath` | `string` | — | Çıktı `.udf` dosyasının yolu |
| `options.pageSize` | `'A4' \| 'LETTER'` | `'A4'` | Sayfa boyutu |
| `options.margins` | `{ top, bottom, left, right }` | `42.525pt` | Kenar boşlukları (punto) |
| `options.resourceDir` | `string` | — | `<img>` dosya yolları için baz dizin |

**Dönüş:** `Promise<IFile>` — oluşturulan UDF dosyası

---

## Lisans

MIT
