# PRD: İş Başvurusu Takip Uygulaması (Job Tracker App)

## 1. Projenin Amacı ve Özeti
Bu uygulamanın amacı, iş arayan kişilerin başvurdukları pozisyonları, mülakat süreçlerini ve şirket bilgilerini tek bir merkezi panoda (dashboard) düzenli bir şekilde takip etmelerini sağlamaktır. Ayrıca kullanıcının kariyer hedefi ile başvurduğu işlerin ne kadar örtüştüğünü göstererek daha bilinçli bir iş arama süreci sunar.

## 2. Kullanıcı Tipleri
* **İş Arayan (Aday):** Sisteme girip kendi kariyer hedefini belirleyen ve başvurularını kaydedip yöneten temel kullanıcı.

## 3. Temel Özellikler (MVP - Minimum Çalışan Ürün)
Uygulamanın ilk versiyonunda (canlıya alınacak ilk sürümde) olması gereken zorunlu özellikler:

### 3.1. Kullanıcı Profili ve "Ana Hedef" Alanı
* Kullanıcı, "Benim asıl aradığım pozisyon ve yeteneklerim şunlar" diyebileceği bir metin alanı (Kariyer Hedefi) doldurabilmelidir. (Örn: "Hedefim React ve Node.js kullanan bir şirkette Mid-Level Fullstack Developer olmak.")

### 3.2. Başvuru Kartı Oluşturma (Veri Girişi)
Kullanıcı "Yeni Başvuru Ekle" butonuna bastığında aşağıdaki bilgileri girebileceği bir form açılmalıdır:
* **Şirket Adı:** (Zorunlu)
* **Şirket Amblemi:** (İsteğe bağlı - URL veya dosya yükleme)
* **Pozisyon Adı:** (Zorunlu)
* **Konum:** (Örn: İstanbul, Remote, Hibrit)
* **Başvuru Tarihi:** (Takvim seçici ile)
* **İş Tanımı (Job Description):** İlanın kopyalanıp yapıştırılabileceği geniş, gömülü bir metin alanı.
* **İletişim / İK Bilgisi:** (İsim, e-posta, LinkedIn profili vb.)

### 3.3. Süreç Takibi (Durum Yönetimi)
Her başvurunun bir durumu (Status) olmalıdır. Kullanıcı bu durumları güncelleyebilmelidir:
* Beklemede (Applied)
* Mülakat Aşamasında (Interviewing)
* Reddedildi (Rejected)
* Kabul Edildi (Offer Received)

### 3.4. "Hedefe Uygunluk" Göstergesi (Proximity Indicator)
* **Nedir:** Başvurulan işin, kullanıcının 3.1'de belirlediği ana hedefe ne kadar uygun olduğunu gösteren bir sistem.
* **Nasıl Çalışır (Basit Versiyon):** Kullanıcı başvuruyu eklerken kendi hissiyatına göre 1'den 5'e kadar puan verir veya "Çok Yakın / Orta / Uzak" şeklinde etiketler.
* *(Gelecek vizyonu: İleride buraya yapay zeka entegre edilip, iş tanımı ile kullanıcının hedefini metin olarak karşılaştırıp otomatik puan verdirebiliriz!)*

## 4. Kullanıcı Akışı (User Flow)
1. **Giriş:** Kullanıcı web sitesine girer, basit bir kayıt ekranıyla hesap oluşturur.
2. **Kurulum:** Karşısına "Ana Hedefini Belirle" ekranı çıkar ve kariyer hedefini yazar.
3. **Kullanım:** Boş bir pano (Kanban board veya Liste görünümü) görür. "Yeni Ekle" diyerek ilk iş başvurusunu girer.
4. **Güncelleme:** Birkaç gün sonra İK'dan mail geldiğinde, sisteme girip başvurunun durumunu "Mülakat Aşamasında" olarak değiştirir ve "İK Bilgisi" alanına görüştüğü kişinin adını not alır.

## 5. Basit Veritabanı Mimarisi (Database Yapısı)
İki temel tablomuz (koleksiyonumuz) olacak:

### Users (Kullanıcılar) Tablosu
* `id`: Kullanıcının benzersiz numarası
* `name`: Adı
* `email`: E-postası
* `career_goal`: Hedeflediği pozisyon/açıklama metni

### Applications (Başvurular) Tablosu
* `id`: Başvurunun benzersiz numarası
* `user_id`: Hangi kullanıcıya ait olduğu (Users tablosuna referans)
* `company_name`: Şirket adı
* `company_logo`: Logo görsel linki
* `job_title`: Pozisyon
* `location`: Çalışma şekli/yeri
* `application_date`: Tarih
* `job_description`: İlan detayları
* `hr_contact`: İK notları
* `status`: Başvuru durumu (Beklemede, Red, vb.)
* `match_score`: Hedefe uygunluk derecesi (1-5)

## 6. Önerilen Teknoloji Yığını (Tech Stack)
* **Frontend:** React.js veya Next.js
* **Stil / Tasarım:** Tailwind CSS
* **Backend & Veritabanı:** Supabase veya Firebase (Hızlı geliştirme ve hazır yetkilendirme için)