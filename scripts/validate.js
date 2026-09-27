#!/usr/bin/env node
/**
 * validate.js — Validasi semua file JSON di categories/ terhadap aturan skema MEA Library.
 *
 * Tidak pakai dependency eksternal (vanilla Node.js saja) — konsisten dengan
 * arsitektur MEA Ecosystem yang vanilla-first. Aturan validasi ditulis manual
 * mengikuti definisi di schema/entry.schema.json (dibaca sebagai referensi,
 * bukan dieksekusi via library JSON Schema).
 *
 * Cara pakai:
 *   node scripts/validate.js
 *
 * Exit code 0 kalau semua valid (warning tetap exit 0), 1 kalau ada error
 * (cocok buat CI/pre-commit hook).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CATEGORIES_DIR = path.join(ROOT, 'categories');

const MAX_FILE_SIZE_WARN = 30 * 1024; // 30 KB — sesuai aturan ukuran file di README
const MAX_ENTRIES_WARN = 10;

const VALID_KATEGORI = ['sejarah-dunia', 'sejarah-indonesia', 'budaya', 'mitologi', 'teknologi', 'agama', 'sains'];
const VALID_TINGKAT_PEMBACA = ['umum', 'anak', 'lanjutan'];
const REQUIRED_FIELDS = [
  'id', 'judul', 'kategori', 'subkategori', 'periode',
  'ringkasan', 'konten', 'tags', 'tingkat_pembaca', 'terakhir_diupdate',
];
const ALLOWED_FIELDS = new Set([...REQUIRED_FIELDS, 'sumber']);

const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*\.[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function validateEntry(entry, index) {
  const errors = [];
  const prefix = `entry[${index}]`;

  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return [`${prefix} harus berupa object`];
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in entry)) {
      errors.push(`${prefix} kehilangan field wajib "${field}"`);
    }
  }

  for (const key of Object.keys(entry)) {
    if (!ALLOWED_FIELDS.has(key)) {
      errors.push(`${prefix} punya field tak dikenal "${key}"`);
    }
  }

  if (typeof entry.id === 'string') {
    if (!ID_PATTERN.test(entry.id)) {
      errors.push(`${prefix}.id "${entry.id}" tidak sesuai format "kategori.subkategori.slug" (huruf kecil, pemisah strip)`);
    }
  } else if ('id' in entry) {
    errors.push(`${prefix}.id harus string`);
  }

  if ('judul' in entry && (typeof entry.judul !== 'string' || entry.judul.length < 1)) {
    errors.push(`${prefix}.judul harus string tidak kosong`);
  }

  if ('kategori' in entry && !VALID_KATEGORI.includes(entry.kategori)) {
    errors.push(`${prefix}.kategori "${entry.kategori}" tidak valid, harus salah satu dari: ${VALID_KATEGORI.join(', ')}`);
  }

  if ('subkategori' in entry && (typeof entry.subkategori !== 'string' || entry.subkategori.length < 1)) {
    errors.push(`${prefix}.subkategori harus string tidak kosong`);
  }

  if ('periode' in entry) {
    if (typeof entry.periode !== 'object' || entry.periode === null || Array.isArray(entry.periode)) {
      errors.push(`${prefix}.periode harus object`);
    } else {
      if (typeof entry.periode.label !== 'string' || entry.periode.label.length < 1) {
        errors.push(`${prefix}.periode.label wajib diisi (boleh deskriptif kalau tahun tidak presisi)`);
      }
      const allowedPeriodeKeys = new Set(['mulai', 'selesai', 'label']);
      for (const key of Object.keys(entry.periode)) {
        if (!allowedPeriodeKeys.has(key)) {
          errors.push(`${prefix}.periode punya field tak dikenal "${key}"`);
        }
      }
      if ('mulai' in entry.periode && typeof entry.periode.mulai !== 'string') {
        errors.push(`${prefix}.periode.mulai harus string`);
      }
      if ('selesai' in entry.periode && typeof entry.periode.selesai !== 'string') {
        errors.push(`${prefix}.periode.selesai harus string`);
      }
    }
  }

  if ('ringkasan' in entry) {
    if (typeof entry.ringkasan !== 'string' || entry.ringkasan.length < 1) {
      errors.push(`${prefix}.ringkasan harus string tidak kosong`);
    } else if (entry.ringkasan.length > 500) {
      errors.push(`${prefix}.ringkasan terlalu panjang (${entry.ringkasan.length} karakter, maks 500) — ingat ini dipakai Siesta untuk respons cepat`);
    }
  }

  if ('konten' in entry && (typeof entry.konten !== 'string' || entry.konten.length < 1)) {
    errors.push(`${prefix}.konten harus string tidak kosong`);
  }

  if ('tags' in entry) {
    if (!Array.isArray(entry.tags) || entry.tags.length < 1) {
      errors.push(`${prefix}.tags harus array dengan minimal 1 item`);
    } else if (!entry.tags.every((t) => typeof t === 'string')) {
      errors.push(`${prefix}.tags semua item harus string`);
    }
  }

  if ('sumber' in entry) {
    if (!Array.isArray(entry.sumber)) {
      errors.push(`${prefix}.sumber harus array`);
    } else if (!entry.sumber.every((s) => typeof s === 'string')) {
      errors.push(`${prefix}.sumber semua item harus string`);
    }
  }

  if ('tingkat_pembaca' in entry && !VALID_TINGKAT_PEMBACA.includes(entry.tingkat_pembaca)) {
    errors.push(`${prefix}.tingkat_pembaca "${entry.tingkat_pembaca}" tidak valid, harus salah satu dari: ${VALID_TINGKAT_PEMBACA.join(', ')}`);
  }

  if ('terakhir_diupdate' in entry) {
    if (typeof entry.terakhir_diupdate !== 'string' || !DATE_PATTERN.test(entry.terakhir_diupdate)) {
      errors.push(`${prefix}.terakhir_diupdate harus format YYYY-MM-DD`);
    }
  }

  return errors;
}

function checkDuplicateIds(allEntries) {
  const seen = new Map();
  const duplicates = [];
  for (const { file, entries } of allEntries) {
    for (const entry of entries) {
      if (!entry || typeof entry.id !== 'string') continue;
      if (seen.has(entry.id)) {
        duplicates.push({ id: entry.id, files: [seen.get(entry.id), file] });
      } else {
        seen.set(entry.id, file);
      }
    }
  }
  return duplicates;
}

function main() {
  const files = findJsonFiles(CATEGORIES_DIR);

  if (files.length === 0) {
    console.log(`Tidak ada file JSON ditemukan di ${CATEGORIES_DIR}. Belum ada konten untuk divalidasi.`);
    process.exit(0);
  }

  let hasError = false;
  let hasWarning = false;
  const allEntries = [];

  console.log(`Memvalidasi ${files.length} file...\n`);

  for (const file of files) {
    const relPath = path.relative(ROOT, file);
    const stat = fs.statSync(file);
    let parsed;

    try {
      const raw = fs.readFileSync(file, 'utf-8');
      parsed = JSON.parse(raw);
    } catch (err) {
      console.error(`✗ ${relPath}\n  JSON tidak valid: ${err.message}\n`);
      hasError = true;
      continue;
    }

    if (!Array.isArray(parsed)) {
      console.error(`✗ ${relPath}\n  File harus berisi array of entry, bukan ${typeof parsed}\n`);
      hasError = true;
      continue;
    }

    let fileErrors = [];
    parsed.forEach((entry, i) => {
      fileErrors = fileErrors.concat(validateEntry(entry, i));
    });

    if (fileErrors.length > 0) {
      console.error(`✗ ${relPath}`);
      for (const err of fileErrors) console.error(`  ${err}`);
      console.error('');
      hasError = true;
      continue;
    }

    const entryCount = parsed.length;
    const warnings = [];
    if (stat.size > MAX_FILE_SIZE_WARN) {
      warnings.push(`ukuran ${(stat.size / 1024).toFixed(1)} KB (batas rekomendasi ${MAX_FILE_SIZE_WARN / 1024} KB) — pertimbangkan dipecah`);
    }
    if (entryCount > MAX_ENTRIES_WARN) {
      warnings.push(`berisi ${entryCount} entry (batas rekomendasi ${MAX_ENTRIES_WARN}) — pertimbangkan dipecah`);
    }
    if (warnings.length > 0) {
      console.warn(`⚠ ${relPath}`);
      for (const w of warnings) console.warn(`  ${w}`);
      console.warn('');
      hasWarning = true;
    } else {
      console.log(`✓ ${relPath} (${entryCount} entry)`);
    }

    allEntries.push({ file: relPath, entries: parsed });
  }

  const duplicates = checkDuplicateIds(allEntries);
  if (duplicates.length > 0) {
    console.error('\n✗ Ditemukan id duplikat:');
    for (const dup of duplicates) {
      console.error(`  "${dup.id}" muncul di: ${dup.files.join(', ')}`);
    }
    hasError = true;
  }

  console.log('\n' + '-'.repeat(50));
  if (hasError) {
    console.error('Validasi GAGAL — ada error yang harus diperbaiki.');
    process.exit(1);
  } else if (hasWarning) {
    console.warn('Validasi LOLOS dengan warning — cek ukuran file di atas.');
    process.exit(0);
  } else {
    console.log('Validasi LOLOS — semua file sesuai schema.');
    process.exit(0);
  }
}

main();
