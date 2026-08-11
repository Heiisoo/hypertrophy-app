import { readFile } from 'node:fs/promises';

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const catalog = JSON.parse(await readFile('public/data/exercises.json', 'utf8'));
const ids = new Set();
const names = new Set();
const errors = [];

for (const [index, exercise] of catalog.entries()) {
  if (!exercise.id || !exercise.name || !exercise.category) {
    errors.push(`Entry ${index} is missing an id, name or category.`);
  }
  if (ids.has(exercise.id)) errors.push(`Duplicate id: ${exercise.id}`);
  ids.add(exercise.id);

  const normalizedName = normalize(exercise.name);
  if (names.has(normalizedName)) errors.push(`Duplicate name: ${exercise.name}`);
  names.add(normalizedName);

  for (const field of ['imageUrl', 'secondaryImageUrl', 'videoUrl', 'sourceUrl']) {
    if (exercise[field] && !/^https:\/\//.test(exercise[field])) {
      errors.push(`${exercise.id} has an invalid ${field}.`);
    }
  }
}

const videoCount = catalog.filter((exercise) => exercise.videoUrl).length;
const imageCount = catalog.filter((exercise) => exercise.imageUrl).length;
if (catalog.length < 1000) errors.push(`Catalog is too small: ${catalog.length}.`);
if (imageCount < 700) errors.push(`Not enough illustrated exercises: ${imageCount}.`);
if (videoCount < 50) errors.push(`Not enough video exercises: ${videoCount}.`);

if (errors.length > 0) {
  throw new Error(`Exercise catalog validation failed:\n${errors.slice(0, 30).join('\n')}`);
}

console.log(
  `Catalog valid: ${catalog.length} unique exercises, ${imageCount} illustrated, ${videoCount} videos.`,
);
