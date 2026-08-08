import { mkdir, writeFile } from 'node:fs/promises';

const SOURCE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_ROOT = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const muscleNames = {
  abdominals: 'Abdominaux',
  abductors: 'Abducteurs',
  adductors: 'Adducteurs',
  biceps: 'Biceps',
  calves: 'Mollets',
  chest: 'Pectoraux',
  forearms: 'Avant-bras',
  glutes: 'Fessiers',
  hamstrings: 'Ischios',
  lats: 'Dos',
  'lower back': 'Lombaires',
  'middle back': 'Dos',
  neck: 'Cou',
  quadriceps: 'Quadriceps',
  shoulders: 'Épaules',
  traps: 'Trapèzes',
  triceps: 'Triceps',
};

const equipmentNames = {
  bands: 'Élastiques',
  barbell: 'Barre',
  body_only: 'Poids du corps',
  cable: 'Poulie',
  dumbbell: 'Haltères',
  'e-z curl bar': 'Barre EZ',
  exercise_ball: 'Swiss ball',
  foam_roll: 'Rouleau de massage',
  kettlebells: 'Kettlebells',
  machine: 'Machine',
  medicine_ball: 'Médecine-ball',
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

const normalizedId = (id) => id.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');

const response = await fetch(SOURCE_URL);
if (!response.ok) throw new Error(`Exercise catalog download failed (${response.status})`);
const sourceExercises = await response.json();

const catalog = sourceExercises
  .filter((exercise) => exercise.category === 'strength')
  .map((exercise) => {
    const translatedMuscles = exercise.primaryMuscles.map(
      (muscle) => muscleNames[muscle] ?? muscle,
    );
    const translatedName = frenchNames[normalizedId(exercise.id)] ?? exercise.name;
    const imageUrls = exercise.images.map((path) => `${IMAGE_ROOT}${path}`);
    return {
      id: `free:${exercise.id}`,
      name: translatedName,
      category: translatedMuscles[0] ?? 'À classer',
      equipment: equipmentNames[exercise.equipment] ?? exercise.equipment ?? undefined,
      primaryMuscles: translatedMuscles,
      aliases: translatedName === exercise.name ? [] : [exercise.name],
      imageUrl: imageUrls[0],
      secondaryImageUrl: imageUrls[1],
      sourceUrl: `https://github.com/yuhonas/free-exercise-db/tree/main/exercises/${exercise.id}`,
      license: 'Unlicense / domaine public',
    };
  })
  .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

await mkdir('public/data', { recursive: true });
await writeFile('public/data/exercises.json', `${JSON.stringify(catalog)}\n`, 'utf8');
await writeFile(
  'public/data/exercises-license.txt',
  [
    'Free Exercise DB',
    'Source: https://github.com/yuhonas/free-exercise-db',
    'Licence: Unlicense / domaine public',
    'https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md',
    '',
  ].join('\n'),
  'utf8',
);

console.log(`Generated ${catalog.length} strength exercises.`);
