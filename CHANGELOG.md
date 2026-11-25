# Değişiklik Kaydı

## [0.1.0] — İlk Sürüm

### Eklenenler
- HTML'den UYAP UDF formatına dönüşüm desteği
- `<p>`, `<h1>`–`<h6>`, `<div>`, `<section>` → `<paragraph>` dönüşümü
- `<strong>/<b>`, `<em>/<i>`, `<u>` inline stil desteği
- `<ul>/<li>`, `<ol>/<li>` → maddeli/numaralı liste desteği
- `<table>`, `<tr>`, `<td>`, `<th>` → tablo desteği (colspan/rowspan)
- `<img>` → base64 gömülü resim desteği
- `<header>`, `<footer>` → üstbilgi/altbilgi desteği
- `<div style="page-break-before:always">` → sayfa sonu desteği
- CSS seçici ve miras hesaplama (tag, class, id, inline stiller)
- `resourceDir` seçeneği ile dosya yolundan resim yükleme
- Sayfa boyutu (`A4` / `LETTER`) ve kenar boşluğu yapılandırması
- Platformdan bağımsız `IFileSystem` arayüzü
- Yerleşik Node.js dosya sistemi adaptörü (`NodeFileSystem`)
- React Native / Expo dosya sistemi adaptörü (`RNFileSystem`, `/rn` alt yolunda)
- Dual CJS/ESM çıktı desteği
- TypeScript tip tanımları (.d.ts)

### Eksik Özellikler
- `<tab>`, `<space>`, `<field>` elementleri
- Arka plan resimleri (`<bgImage>`)
- Sayfa kenarlıkları ve sütunları
- Altbilgide sayfa numarası
- Şablon `<data>` bölümü ve alan değer çözümlemesi

[0.1.0]: https://github.com/saruapp/js-udf-tools/releases/tag/v0.1.0
