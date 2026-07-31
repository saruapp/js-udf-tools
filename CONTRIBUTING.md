# Katkıda Bulunma Rehberi

Bu projeye katkıda bulunmak istediğiniz için teşekkür ederiz!

## Geliştirme Ortamı

### Gereksinimler

- **Node.js** >= 18
- **pnpm** >= 9

### Kurulum

```bash
git clone https://github.com/softkoop/js-udf-tools.git
cd js-udf-tools
pnpm install
```

### Monorepo Yapısı

Bu proje pnpm workspace ve Nx ile yönetilen bir monorepodur.

```
packages/js-udf-tools/   # js-udf-tools npm paketi
├── src/
│   ├── adapters/node/   # Node.js dosya sistemi adaptörü
│   └── adapters/rn/     # React Native / Expo adaptörü
├── test/
└── dist/
```

### Komutlar

```bash
# Derle
pnpm build

# Testleri çalıştır
pnpm test

# Lint
pnpm lint

# El ile dönüşüm testi
npx tsx test/run.ts
```

## Kodlama Kuralları

### Mimari Prensipler

Bu proje **Elegant Object (EO)** prensiplerini takip eder:

- `null` kullanılmaz — boş nesne veya exception fırlatılır
- `static` metod kullanılmaz
- Değişebilir (mutable) nesne kullanılmaz — sınıflar gerçekten değişmez (immutable) olmalıdır
- Getter/setter kullanılmaz — nesneler veri değil davranış sunar
- ORM kullanılmaz — düz nesneler ve açık kalıcılık (persistence) kullanılır
- Constructor'lar kod içermez — sadece atama yapılır
- Her sınıf için bir ana constructor; ikincil constructor'lar kolaylık içindir
- Kalıtım yerine kompozisyon ve dekoratör tercih edilir
- Sınıflar küçük ve `final` tutulur
- `new` yalnızca ikincil constructor ve fabrikalarda kullanılır
- Arayüz sözleşmesi olmadan public metod yazılmaz
- Fiil-isimli metodlar `void` döner, isim-isimli metodlar değer döner

### Kod Stili

- **Prettier**: tek tırnak, trailing comma, printWidth 100, noktalı virgül
- **TypeScript**: ES2020 hedefi, strict mod

## Pull Request Süreci

1. Konuyla ilgili bir issue açın
2. `develop` dalından yeni bir dal oluşturun
3. Değişikliklerinizi yapın ve testleri çalıştırın
4. PR'ınızı `develop` dalına gönderin
5. PR açıklamasında değişikliklerinizi ve ilgili issue'yu belirtin

## Hata Bildirimi

Hata bildirimleri için GitHub Issues sayfasını kullanın. Lütfen aşağıdaki bilgileri ekleyin:

- Kullanılan paket ve versiyonu
- Node.js versiyonu
- Hatayı yeniden oluşturmak için adımlar
- Beklenen ve gerçekleşen davranış
- Varsa örnek HTML veya kod parçası

## Lisans

Bu projeye katkıda bulunarak katkılarınızın MIT lisansı altında lisanslanacağını kabul etmiş olursunuz.
