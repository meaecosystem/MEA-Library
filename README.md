# MEA Library

Koleksi pengetahuan "non-rumus" (sejarah, budaya, dan sejenisnya) yang disusun **manual** — bukan hasil crawl otomatis (beda dengan Hany / MEA Library 0.1). Cakupan: dari ditemukannya dunia sampai sekarang, dan bisa terus ditambah untuk masa depan.

## Tujuan Pemakaian

1. **Aplikasi** — konten bisa ditampilkan langsung di produk MEA Ecosystem
2. **MEA Study** — jadi salah satu source module (seperti pola `hany.js`, `wikipedia.js`, dst)
3. **Siesta (lewat Sora)** — Siesta tidak menghafal isi ini; cukup minta bantuan ke backend/router (`<butuh_bantuan>`), yang menyiapkan potongan relevan dari sini

## Struktur Repo

```
mea-library-core/
  categories/
    sejarah-dunia/
      00-prasejarah/
      01-peradaban-kuno/
      02-abad-pertengahan/
      03-zaman-modern-awal/
      04-abad-20/
      05-kontemporer/
    sejarah-indonesia/
      00-prasejarah/
      01-kerajaan/
      02-kolonial/
      03-kemerdekaan/
      04-orde-baru/
      05-reformasi/
      06-kontemporer/
    budaya/
      nusantara/
        jawa/
        sumatra/
        kalimantan/
        sulawesi/
        papua/
        bali-nusatenggara/
      dunia/
        asia-timur/
        asia-selatan/
        timur-tengah/
        eropa/
        afrika/
        amerika/
        oseania/
    mitologi/
      nusantara/
      yunani-romawi/
      norse/
      mesir/
      asia-timur/
    index/
      master-index.json
  schema/
    entry.schema.json
  scripts/
    validate.js
    build-index.js
```

Folder `00-...`, `01-...` dst berfungsi sebagai urutan periode waktu — memudahkan navigasi kronologis, bukan aturan kaku (kategori baru boleh ditambah kalau perlu).

## Aturan Ukuran File (biar tetap ramping)

- **Satu file JSON = beberapa entry yang sangat berkaitan erat** (bukan 1 entry per file, bukan juga semua topik besar dalam 1 file)
- Target ukuran per file: **5–15 KB**
- Kalau 1 file mulai membengkak (>20–30 KB, atau >8–10 entry), itu sinyal untuk dipecah jadi sub-topik yang lebih spesifik
- Nama file deskriptif per sub-topik, contoh: `mesir-kuno.json`, `wali-songo.json`, `revolusi-industri.json`

## Skema Entry

Setiap entry di dalam file JSON (file = array dari entry-entry ini):

```json
{
  "id": "sejarah-dunia.peradaban-kuno.mesir-kuno",
  "judul": "Peradaban Mesir Kuno",
  "kategori": "sejarah-dunia",
  "subkategori": "peradaban-kuno",
  "periode": {
    "mulai": "-3100",
    "selesai": "-30",
    "label": "3100 SM – 30 SM"
  },
  "ringkasan": "2-3 kalimat, dipakai Siesta/router untuk respons cepat tanpa load konten penuh",
  "konten": "Isi lengkap, bisa multi-paragraf",
  "tags": ["mesir", "piramida", "firaun", "sungai-nil"],
  "sumber": [],
  "tingkat_pembaca": "umum",
  "terakhir_diupdate": "2026-07-22"
}
```

Catatan field:
- `id`: unik, format `kategori.subkategori.slug`
- `ringkasan`: **wajib singkat** — ini yang dikirim duluan ke Siesta biar hemat context, `konten` penuh baru diambil kalau perlu
- `tingkat_pembaca`: `umum` | `anak` | `lanjutan`
- `sumber`: opsional, isi kalau merujuk sumber spesifik

## Pipeline

1. Entry ditulis manual (dibantu Claude) ke file JSON sesuai kategori/periode
2. `scripts/validate.js` — validasi semua file sesuai `entry.schema.json` (cek field wajib, format id, dll)
3. `scripts/build-index.js` — generate `index/master-index.json` otomatis: kumpulan ringkas `{id, judul, ringkasan, tags, kategori}` dari seluruh entry — dipakai untuk pencarian cepat tanpa perlu load semua file penuh
4. Repo di-host terpisah di GitHub: **MEA Library** (beda dari repo Hany/MEA Library 0.1)
5. MEA Study menambahkan source module baru (pola sama seperti `hany.js`) yang fetch dari repo ini (via GitHub raw, atau disinkron ke Supabase/R2 — belum diputuskan)
6. Siesta akses via Sora, sama seperti akses Hany — bedanya ini koleksi kurasi manual, Hany hasil crawl

## Keputusan

- **`budaya/` dan `mitologi/` dipecah per wilayah/tradisi** (lihat struktur di atas) — supaya file tetap ramping sesuai aturan ukuran (budaya per daerah bisa padat kalau digabung flat)
- **Butuh semantic search** (embedding) untuk pencarian, bukan cuma keyword — sama seperti pola Hany
- Cara MEA Study fetch data dari repo ini (GitHub raw langsung vs sync ke storage lain) **bukan keputusan MEA Library** — itu tanggung jawab arsitektur MEA Study sendiri. Repo ini cuma perlu dibuat fleksibel/mudah dipindah formatnya, tidak terikat satu cara akses

## Belum Diputuskan

- Mekanisme konkret sinkronisasi/fetch dari sisi MEA Study (dibahas terpisah di scope MEA Study, bukan di sini)
- Detail pipeline generate embedding untuk semantic search MEA Library (siapa yang generate, disimpan di mana — kemungkinan pola mirip `hany-study-search` tapi perlu dirancang ulang karena ini repo terpisah, bukan Supabase Hany)
