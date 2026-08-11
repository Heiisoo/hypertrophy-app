import { mkdir, writeFile } from 'node:fs/promises';

const FREE_EXERCISE_DB_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const FREE_EXERCISE_IMAGE_ROOT =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const WGER_EXERCISE_URL = 'https://wger.de/api/v2/exerciseinfo/?limit=1000';

const muscleNames = {
  abdominals: 'Abdominaux',
  abs: 'Abdominaux',
  abductors: 'Abducteurs',
  adductors: 'Adducteurs',
  biceps: 'Biceps',
  brachialis: 'Biceps',
  calves: 'Mollets',
  chest: 'Pectoraux',
  forearms: 'Avant-bras',
  glutes: 'Fessiers',
  hamstrings: 'Ischios',
  lats: 'Dos',
  'lower back': 'Lombaires',
  'middle back': 'Dos',
  neck: 'Cou',
  obliques: 'Abdominaux',
  quadriceps: 'Quadriceps',
  quads: 'Quadriceps',
  shoulders: 'Épaules',
  traps: 'Trapèzes',
  triceps: 'Triceps',
};

const categoryNames = {
  abs: 'Abdominaux',
  arms: 'Bras',
  back: 'Dos',
  calves: 'Mollets',
  cardio: 'Cardio',
  chest: 'Pectoraux',
  legs: 'Jambes',
  shoulders: 'Épaules',
};

const equipmentNames = {
  bands: 'Élastiques',
  barbell: 'Barre',
  'body only': 'Poids du corps',
  body_only: 'Poids du corps',
  cable: 'Poulie',
  dumbbell: 'Haltères',
  'e-z curl bar': 'Barre EZ',
  'exercise ball': 'Swiss ball',
  exercise_ball: 'Swiss ball',
  'foam roll': 'Rouleau de massage',
  foam_roll: 'Rouleau de massage',
  kettlebells: 'Kettlebells',
  machine: 'Machine',
  'medicine ball': 'Médecine-ball',
  medicine_ball: 'Médecine-ball',
  'none (bodyweight exercise)': 'Poids du corps',
  other: 'Autre',
};

const frenchNames = {
  Adductor: 'Adducteurs machine',
  Barbell_Hip_Thrust: 'Hip Thrust barre',
  Cable_Rope_Overhead_Triceps_Extension: 'Extension triceps overhead corde',
  Cable_Seated_Lateral_Raise: 'Élévations latérales poulie',
  Close_Grip_Front_Lat_Pulldown: 'Tirage vertical prise neutre',
  Dumbbell_Incline_Row: 'Rowing poitrine appuyée',
  EZ_Bar_Skullcrusher: 'Extension triceps barre EZ',
  Good_Morning: 'Good Morning',
  Hack_Squat: 'Hack Squat',
  Hyperextensions_Back_Extensions: 'Back Extension',
  Incline_Cable_Flye: 'Écartés poulie basse vers haute',
  Incline_Dumbbell_Press: 'Développé incliné haltères',
  JM_Press: 'JM Press',
  Landmine_Linear_Jammer: 'Landmine Press unilatéral',
  Leg_Extensions: 'Leg Extension',
  Leverage_Incline_Chest_Press: 'Chest Press convergente inclinée',
  Lying_T_Bar_Row: 'T-Bar Row poitrine appuyée',
  Narrow_Stance_Leg_Press: 'Leg Press pieds bas',
  Reverse_Machine_Flyes: 'Reverse Pec Deck',
  Romanian_Deadlift: 'Romanian Deadlift',
  Rope_Straight_Arm_Pulldown: 'Pullover poulie corde',
  Seated_Calf_Raise: 'Mollets assis',
  Seated_Leg_Curl: 'Leg Curl assis',
  Seated_One_arm_Cable_Pulley_Rows: 'Low Row unilatéral',
  Side_Lateral_Raise: 'Élévations latérales haltères',
  Smith_Machine_Bench_Press: 'Développé couché Smith',
  Split_Squat_with_Dumbbells: 'Fentes bulgares haltères',
  Standing_Calf_Raises: 'Mollets debout',
  Standing_Military_Press: 'Développé militaire',
  Straight_Arm_Pulldown: 'Pullover poulie',
  Thigh_Adductor: 'Adducteurs machine',
  Triceps_Pushdown_Rope_Attachment: 'Pushdown corde',
  Alternate_Hammer_Curl: 'Curl marteau alterné',
  Alternate_Incline_Dumbbell_Curl: 'Curl incliné alterné',
  Barbell_Curl: 'Curl barre droite',
  Barbell_Curls_Lying_Against_An_Incline: 'Curl barre allongé sur banc incliné',
  Brachialis_SMR: 'Auto-massage du brachial',
  Cable_Hammer_Curls_Rope_Attachment: 'Curl marteau corde à la poulie',
  Cable_Preacher_Curl: 'Curl pupitre à la poulie',
  Close_Grip_EZ_Bar_Curl_with_Band: 'Curl EZ prise serrée avec élastique',
  Close_Grip_EZ_Bar_Curl: 'Curl EZ prise serrée',
  Close_Grip_Standing_Barbell_Curl: 'Curl barre debout prise serrée',
  Concentration_Curls: 'Curl concentration',
  Cross_Body_Hammer_Curl: 'Curl marteau croisé',
  Drag_Curl: 'Drag Curl',
  Dumbbell_Alternate_Bicep_Curl: 'Curl biceps alterné haltères',
  Dumbbell_Bicep_Curl: 'Curl biceps haltères',
  Dumbbell_Prone_Incline_Curl: 'Spider Curl haltères',
  EZ_Bar_Curl: 'Curl barre EZ',
  Flexor_Incline_Dumbbell_Curls: 'Curl incliné supination accentuée',
  Hammer_Curls: 'Curl marteau',
  High_Cable_Curls: 'Curl double biceps poulie haute',
  Incline_Dumbbell_Curl: 'Curl incliné',
  Incline_Hammer_Curls: 'Curl marteau incliné',
  Incline_Inner_Biceps_Curl: 'Curl incliné biceps interne',
  Lying_Cable_Curl: 'Curl poulie allongé',
  Lying_Close_Grip_Bar_Curl_On_High_Pulley: 'Curl barre allongé à la poulie haute',
  Lying_High_Bench_Barbell_Curl: 'Curl barre sur banc haut',
  Lying_Supine_Dumbbell_Curl: 'Curl haltères allongé',
  Machine_Bicep_Curl: 'Curl biceps machine',
  Machine_Preacher_Curls: 'Curl pupitre machine',
  One_Arm_Dumbbell_Preacher_Curl: 'Curl pupitre unilatéral haltère',
  Overhead_Cable_Curl: 'Curl overhead à la poulie',
  Preacher_Curl: 'Curl pupitre',
  Preacher_Hammer_Dumbbell_Curl: 'Curl marteau au pupitre',
  Reverse_Barbell_Curl: 'Curl inversé barre',
  Reverse_Barbell_Preacher_Curls: 'Curl inversé au pupitre',
  Reverse_Cable_Curl: 'Curl inversé à la poulie',
  Reverse_Plate_Curls: 'Curl inversé au disque',
  Seated_Biceps: 'Étirement biceps assis',
  Seated_Close_Grip_Concentration_Barbell_Curl: 'Curl concentration barre prise serrée',
  Seated_Dumbbell_Curl: 'Curl haltères assis',
  Seated_Dumbbell_Inner_Biceps_Curl: 'Curl biceps interne assis',
  Spider_Curl: 'Spider Curl',
  Standing_Biceps_Cable_Curl: 'Curl biceps debout à la poulie',
  Standing_Biceps_Stretch: 'Étirement biceps debout',
  Standing_Concentration_Curl: 'Curl concentration debout',
  Standing_Dumbbell_Reverse_Curl: 'Curl inversé haltères debout',
  Standing_Inner_Biceps_Curl: 'Curl biceps interne debout',
  Standing_One_Arm_Cable_Curl: 'Curl unilatéral à la poulie',
  Standing_One_Arm_Dumbbell_Curl_Over_Incline_Bench: 'Curl unilatéral sur banc incliné',
  Two_Arm_Dumbbell_Preacher_Curl: 'Curl pupitre deux haltères',
  Wide_Grip_Standing_Barbell_Curl: 'Curl barre prise large',
  Zottman_Curl: 'Curl Zottman',
  Zottman_Preacher_Curl: 'Curl Zottman au pupitre',
};

const normalize = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(the|a|an|with|using)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(
      /\b(squats|curls|extensions|raises|presses|flyes|flies|rows|lunges|crunches|pullups|pushups)\b/g,
      (word) =>
        ({
          squats: 'squat',
          curls: 'curl',
          extensions: 'extension',
          raises: 'raise',
          presses: 'press',
          flyes: 'fly',
          flies: 'fly',
          rows: 'row',
          lunges: 'lunge',
          crunches: 'crunch',
          pullups: 'pullup',
          pushups: 'pushup',
        })[word],
    )
    .trim();

const normalizedId = (id) => id.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
const distinct = (values) => [...new Set(values.filter(Boolean))];
const translateEquipment = (value) => equipmentNames[value?.toLowerCase()] ?? value ?? undefined;
const translateMuscle = (value) => {
  const normalized = value?.toLowerCase();
  return muscleNames[normalized] ?? value ?? undefined;
};

const catalog = new Map();
const aliasIndex = new Map();

function indexExercise(exercise) {
  for (const value of [exercise.name, ...exercise.aliases]) {
    const normalized = normalize(value);
    if (normalized) aliasIndex.set(normalized, exercise.id);
  }
}

function mergeExercise(current, incoming) {
  const preferIncomingName = incoming.hasFrenchName && !current.hasFrenchName;
  const name = preferIncomingName ? incoming.name : current.name;
  const aliases = distinct([
    ...current.aliases,
    ...incoming.aliases,
    current.name !== name ? current.name : undefined,
    incoming.name !== name ? incoming.name : undefined,
  ]).filter((alias) => normalize(alias) !== normalize(name));
  return {
    ...current,
    name,
    category:
      current.category === 'À classer' && incoming.category !== 'À classer'
        ? incoming.category
        : current.category,
    equipment: current.equipment ?? incoming.equipment,
    primaryMuscles: distinct([...current.primaryMuscles, ...incoming.primaryMuscles]),
    aliases,
    instructions: incoming.instructions ?? current.instructions,
    imageUrl: current.imageUrl ?? incoming.imageUrl,
    secondaryImageUrl: current.secondaryImageUrl ?? incoming.secondaryImageUrl,
    videoUrl: current.videoUrl ?? incoming.videoUrl,
    sourceUrl: current.sourceUrl ?? incoming.sourceUrl,
    license: distinct([current.license, incoming.license]).join(' · '),
    hasFrenchName: current.hasFrenchName || incoming.hasFrenchName,
  };
}

function addExercise(exercise) {
  const matchingId = [exercise.name, ...exercise.aliases]
    .map((value) => aliasIndex.get(normalize(value)))
    .find(Boolean);
  if (!matchingId) {
    catalog.set(exercise.id, exercise);
    indexExercise(exercise);
    return;
  }

  const merged = mergeExercise(catalog.get(matchingId), exercise);
  catalog.set(matchingId, merged);
  indexExercise(merged);
}

async function fetchJson(url, label) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`${label} download failed (${response.status})`);
  return response.json();
}

const [freeExercises, wgerResponse] = await Promise.all([
  fetchJson(FREE_EXERCISE_DB_URL, 'Free Exercise DB'),
  fetchJson(WGER_EXERCISE_URL, 'wger exercise catalog'),
]);

for (const exercise of freeExercises) {
  const sourceId = normalizedId(exercise.id);
  const translatedMuscles = distinct(exercise.primaryMuscles.map(translateMuscle));
  const translatedName = frenchNames[sourceId] ?? exercise.name;
  const imageUrls = exercise.images.map((path) => `${FREE_EXERCISE_IMAGE_ROOT}${path}`);
  addExercise({
    id: `free:${exercise.id}`,
    name: translatedName,
    category:
      translatedMuscles[0] ?? categoryNames[exercise.category?.toLowerCase()] ?? 'À classer',
    equipment: translateEquipment(exercise.equipment),
    primaryMuscles: translatedMuscles,
    aliases: translatedName === exercise.name ? [] : [exercise.name],
    instructions: exercise.instructions?.join(' '),
    imageUrl: imageUrls[0],
    secondaryImageUrl: imageUrls[1],
    sourceUrl: `https://github.com/yuhonas/free-exercise-db/tree/main/exercises/${exercise.id}`,
    license: 'Free Exercise DB · domaine public',
    hasFrenchName: translatedName !== exercise.name,
  });
}

for (const exercise of wgerResponse.results) {
  const french = exercise.translations.find((translation) => translation.language === 12);
  const english = exercise.translations.find((translation) => translation.language === 2);
  const preferred = french ?? english ?? exercise.translations[0];
  if (!preferred?.name) continue;

  const translationNames = exercise.translations
    .filter((translation) => translation.language === 12 || translation.language === 2)
    .flatMap((translation) => [
      translation.name,
      ...translation.aliases.map((alias) => alias.alias),
    ]);
  const muscles = distinct(exercise.muscles.map((muscle) => translateMuscle(muscle.name_en)));
  const mainImage = exercise.images.find((image) => image.is_main) ?? exercise.images[0];
  const secondaryImage = exercise.images.find((image) => image.id !== mainImage?.id);
  const mainVideo =
    exercise.videos.find((video) => video.is_main) ??
    exercise.videos.find((video) => /\.(mp4|webm)(?:$|\?)/i.test(video.video)) ??
    exercise.videos[0];
  const license = exercise.license?.short_name ?? 'Licence indiquée par wger';
  const author = exercise.license_author ? ` · ${exercise.license_author}` : '';

  addExercise({
    id: `wger:${exercise.uuid}`,
    name: preferred.name.trim(),
    category: muscles[0] ?? categoryNames[exercise.category?.name?.toLowerCase()] ?? 'À classer',
    equipment:
      exercise.equipment.map((item) => translateEquipment(item.name)).join(', ') || undefined,
    primaryMuscles: muscles,
    aliases: distinct(translationNames).filter(
      (alias) => normalize(alias) !== normalize(preferred.name),
    ),
    instructions: (french?.description_source ?? english?.description_source)?.trim() || undefined,
    imageUrl: mainImage?.thumbnails?.medium ?? mainImage?.image,
    secondaryImageUrl: secondaryImage?.thumbnails?.medium ?? secondaryImage?.image,
    videoUrl: mainVideo?.video,
    sourceUrl: `https://wger.de/api/v2/exerciseinfo/${exercise.id}/`,
    license: `wger · ${license}${author}`,
    hasFrenchName: Boolean(french),
  });
}

const youtubeVideoOverrides = [
  ['Hack Squat', 'https://www.youtube.com/watch?v=bhfyY8F8F24'],
  ['Leg Extension', 'https://www.youtube.com/watch?v=mVnpm3eJmKw'],
  ['Romanian Deadlift', 'https://www.youtube.com/watch?v=CQp5I9KgdXI'],
  ['Squats bulgares haltères', 'https://www.youtube.com/watch?v=tcEAeBjSkHI'],
  ['Curl incliné', 'https://www.youtube.com/watch?v=b4jOP-spQW8'],
];

for (const [exerciseName, videoUrl] of youtubeVideoOverrides) {
  const exerciseId = aliasIndex.get(normalize(exerciseName));
  const exercise = exerciseId ? catalog.get(exerciseId) : undefined;
  if (!exercise || exercise.videoUrl) continue;
  catalog.set(exercise.id, {
    ...exercise,
    videoUrl,
    license: `${exercise.license} · Vidéo YouTube intégrée depuis la chaîne source`,
  });
}

const output = [...catalog.values()]
  .map(({ hasFrenchName: _hasFrenchName, ...exercise }) => exercise)
  .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

await mkdir('public/data', { recursive: true });
await writeFile('public/data/exercises.json', `${JSON.stringify(output)}\n`, 'utf8');
await writeFile(
  'public/data/exercises-license.txt',
  [
    'Catalogue d’exercices Hypertrophy',
    '',
    'Free Exercise DB',
    'Source: https://github.com/yuhonas/free-exercise-db',
    'Licence: Unlicense / domaine public',
    'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md',
    '',
    'wger Exercise Data',
    'Source: https://wger.de/',
    'Les exercices et médias conservent la licence et l’auteur indiqués par chaque entrée.',
    'Licence principale des données: CC-BY-SA 4.0',
    'https://wger.readthedocs.io/en/latest/',
    '',
    'YouTube',
    'Certaines démonstrations sont intégrées avec le lecteur YouTube en mode confidentialité avancée.',
    'Les vidéos restent hébergées par leurs chaînes respectives et ne sont pas redistribuées par l’application.',
    '',
  ].join('\n'),
  'utf8',
);

const videoCount = output.filter((exercise) => exercise.videoUrl).length;
console.log(`Generated ${output.length} unique exercises (${videoCount} with licensed videos).`);
