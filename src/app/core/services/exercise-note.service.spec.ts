import { describe, expect, it } from 'vitest';
import { exerciseNoteKey } from './exercise-note.service';

describe('exerciseNoteKey', () => {
  it('shares a note across accents and casing', () => {
    expect(exerciseNoteKey('Développé incliné')).toBe('developpe-incline');
    expect(exerciseNoteKey('DÉVELOPPÉ INCLINÉ')).toBe('developpe-incline');
  });

  it('keeps distinct exercise variants separate', () => {
    expect(exerciseNoteKey('Curl incliné')).not.toBe(exerciseNoteKey('Curl marteau'));
  });
});
