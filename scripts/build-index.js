#!/usr/bin/env node
/**
 * build-index.js — Generate index/master-index.json dari semua entry di categories/.
 *
 * master-index.json berisi versi ringkas tiap entry (id, judul, ringkasan, tags,
 * kategori, subkategori, periode.label) — dipakai untuk pencarian cepat tanpa
 * perlu memuat seluruh file konten penuh. Cocok dipakai MEA Study/Siesta sebagai
 * lapisan pertama sebelum ambil "konten" lengkap dari file aslinya.
 *
 * Rekomendasi: jalankan validate.js dulu sebelum build-index.js, supaya index
 * tidak dibangun dari data yang cacat.
 *
 * Cara pakai:
 *   node scripts/build-index.js
 *
 * Exit code 0 kalau sukses, 1 kalau ada file yang gagal dibaca/diparse.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CATEGORIES_DIR = path.join(ROOT, 'categories');
const INDEX_DIR = path.join(ROOT, 'index');
const INDEX_PATH = path.join(INDEX_DIR, 'master-index.json');

function findJsonFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(findJsonFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
}

function toIndexEntry(entry, sourceFile) {
  return {
    id: entry.id,
    judul: entry.judul,
    kategori: entry.kategori,
    subkategori: entry.subkategori,
    periode_label: entry.periode && entry.periode.label ? entry.periode.label : null,
    ringkasan: entry.ringkasan,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    tingkat_pembaca: entry.tingkat_pembaca,
    file: sourceFile,
  };
}

function main() {
  const files = findJsonFiles(CATEGORIES_DIR);

  if (files.length === 0) {
    console.log(`Tidak ada file JSON ditemukan di ${CATEGORIES_DIR}. Index tidak dibuat.`);
    process.exit(0);
  }

  let hasError = false;
  const indexEntries = [];

  console.log(`Membaca ${files.length} file untuk membangun index...\n`);

  for (const file of files) {
    const relPath = path.relative(ROOT, file).split(path.sep).join('/'); // normalisasi separator untuk cross-platform
    let parsed;

    try {
      const raw = fs.readFileSync(file, 'utf-8');
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`✗ ${relPath}\n  Gagal membaca/parse: ${err.message}\n`);
      hasError = true;
      continue;
    }

    if (!Array.isArray(parsed)) {
      console.error(`✗ ${relPath}\n  File harus berisi array of entry, dilewati.\n`);
      hasError = true;
      continue;
    }

    let countFromFile = 0;
    for (const entry of parsed) {
      if (!entry || typeof entry.id !== 'string') {
        console.warn(`⚠ ${relPath}\n  Ada entry tanpa id yang valid, dilewati dari index.\n`);
        continue;
      }
      indexEntries.push(toIndexEntry(entry, relPath));
      countFromFile++;
    }

    console.log(`✓ ${relPath} (${countFromFile} entry ditambahkan ke index)`);
  }

  // Urutkan berdasarkan id supaya output stabil & mudah di-diff di git
  indexEntries.sort((a, b) => a.id.localeCompare(b.id));

  const output = {
    generated_at: new Date().toISOString(),
    total_entries: indexEntries.length,
    entries: indexEntries,
  };

  if (!fs.existsSync(INDEX_DIR)) {
    fs.mkdirSync(INDEX_DIR, { recursive: true });
  }
  fs.writeFileSync(INDEX_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  console.log('\n' + '-'.repeat(50));
  console.log(`Index berhasil ditulis: ${path.relative(ROOT, INDEX_PATH)}`);
  console.log(`Total entry ter-index: ${indexEntries.length}`);

  if (hasError) {
    console.error('\nSelesai DENGAN error pada beberapa file (lihat di atas) — index tetap dibuat dari file yang valid.');
    process.exit(1);
  }
  process.exit(0);
}

main();
