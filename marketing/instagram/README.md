# Mindora Instagram içerik üretimi

Hedef: @mindora.live hesabının görünürlüğünü ve takipçi sayısını artırmak.
Her hafta bir paket hazırlanır, Aybars onaylar, Meta Business Suite'te tarihlerine planlanır.

## Haftalık paket (sabit kalıp)

| Gün | Biçim | Amaç |
|---|---|---|
| Salı 20:00 | Reels (12–15 sn, yazı animasyonu) | Erişim: keşfete düşmek, paylaşılmak |
| Çarşamba 20:00 | Kaydırmalı (6–8 sayfa) | Kaydedilmek: bilgilendirici, “sonra bakarım” içerik |
| Perşembe 13:00 | Tekli gönderi (mit/gerçek ya da alıntı) | Hikâyede paylaşılmak |
| Cuma 20:00 | Reels | Erişim; merak uyandıran bir bilgi |
| Pazar 11:00 | Kaydırmalı | Kaydedilmek + Mindora'nın farkını göstermek |
| Pzt–Cuma | Hikâye (her gün 1) | Etkileşim: anket, soru kutusu, test, bağlantı |

## Üç alan, eşit dağılım

Mindora artık üç hizmet sunuyor: **psikolog**, **diyetisyen** ve **kişisel antrenör**.
Her hafta üç alanın her birinden en az bir gönderi olur; haftalar arasında dengeyi koru
(bir hafta psikoloji ağırlıklıysa sonraki hafta beslenme ya da hareket öne çıksın).
Mindora tanıtımı üç hizmeti birlikte anlatır ya da sırayla birini öne çıkarır.
Psikoloji, beslenme ve hareketi birleştiren bütüncül konular (stres, uyku, enerji) iyi köprülerdir.

## İçerik sütunları (her hafta en az üçü)

1. **İlk adımı normalleştirme**: “Yeterince kötü olmana gerek yok”, “Spora başlamak için forma girmen gerekmiyor”.
2. **Bilgilendirme**: İlk seans / ilk diyetisyen görüşmesi / ilk antrenman, uzman seçimi, online görüşme.
3. **Mit / gerçek**: Terapi, beslenme ve egzersizle ilgili yaygın yanlış inanışlar.
4. **İlişkilendirilebilir anlar**: “Gece 3'te aklına gelen o konuşma”, “Pazartesi başlarım” gibi tanıdık durumlar.
5. **Kalite ve güven**: Belge kontrolü, şeffaf ücret, kayıt yok; psikologlar için süpervizyon.
6. **Uzmanlara yönelik**: Psikolog, diyetisyen ve antrenörler için Mindora'da uzman olmak (uzman başvurusu çeker); süpervizyon yalnızca psikologlar için.
7. **Mindora'yı tanıtma**: Nasıl çalışır, ücretsiz ön eşleşme, üç hizmet. Haftada en fazla bir gönderi.

## Kurallar

- Ton: sıcak, sade, “sen” dili. Tıbbi iddia yok, “tedavi eder / iyileştirir / garanti” yok.
- Tanı koyar gibi konuşma yok (“Bunlar varsa depresyondasın” gibi listeler yapılmaz).
- İntihar, kendine zarar verme, yeme bozuklukları gibi konular ayrıntılı işlenmez. Ele alınacaksa yalnızca yardım almaya yönlendirici, ayrıntısız ve 112 bilgisiyle.
- Klinik bilgiler ve istatistikler genel ve doğrulanabilir olmalı; rakam verilecekse kaynak açıklamada yazılır.
- Beslenme: kilo vaadi, “X günde Y kilo”, öncesi/sonrası görseli, kalori sayısı ya da hazır diyet listesi yok. Besinleri “zararlı / yasak” diye etiketleme. Yeme bozukluklarına dokunan konular işlenmez; yemekle ilişkisi zorlayıcı olan biri için yönlendirme psikoloğa ve gerektiğinde 112'ye.
- Hareket: beden utandırma, “yağ yakma garantisi” ya da zorlayıcı “acı yoksa kazanç yok” dili yok. Egzersiz içeriklerinin açıklamasında: “Bir sağlık durumun varsa ya da uzun süredir hareketsizsen başlamadan önce doktoruna danış.”
- Sahte danışan yorumu ya da uydurma hikâye yok. Rakip platform adı anılmaz (“çoğu platformda” denir).
- Bilgilendirici gönderilerin açıklamasında: “Bu içerik bilgilendirme amaçlıdır; tanı ve tedavinin yerine geçmez.” Gerektiğinde: “Acil bir durumda 112'yi ara.”
- Her açıklama: güçlü ilk cümle (kanca) → kısa değer → tek bir çağrı (kaydet / gönder / yorum yaz / bağlantı profilde).
- 5–8 etiket: alanın genel etiketleri (psikoloji: #terapi #psikolog #ruhsağlığı · beslenme: #beslenme #diyetisyen #sağlıklıbeslenme · hareket: #spor #kişiselantrenör #evdeantrenman) + konu etiketi + #mindora.
- Açıklamaya aranabilir anahtar kelimeler doğal biçimde yazılır (online terapi, psikolog, kaygı, online diyetisyen, evde antrenman…).

## Üretim

```
node marketing/instagram/render.mjs marketing/instagram/weeks/<hafta>.json
```

- Hafta dosyası biçimi için `weeks/2026-W44.json` örneğine bak.
- Slayt türleri: `cover`, `point`, `mythfact`, `quote`, `lines`, `poll`, `cta`.
- Temalar: `pine`, `lilac`, `cream`, `mint`.
- Biçimler: `feed` (1080×1350), `story` (1080×1920), `reel` (1080×1920 mp4, `lines` slaytı animasyonla).
- Çıktılar `weeks/<hafta>/` klasörüne yazılır; açıklama metinleri `*-metin.txt` dosyalarında.
- Playwright ve ffmpeg gerekir (bulut ortamında yüklü).

## Konu havuzu

Kullanılan konular `konular.md` dosyasında işaretlenir; aynı konu 8 hafta içinde tekrar edilmez.
