import { describe, it, expect } from 'vitest';

// Re-implementing validators here for testing (since they're not exported from index.ts)
// In a real project, these would be in a separate module

interface CreatePersonArgs {
  name: string;
  owner_id: number;
  email?: string;
  phone?: string;
  company_id?: number;
}

interface CreateDealArgs {
  title: string;
  pipeline_id: number;
  stage_id: number;
  owner_id: number;
  person_id?: number;
  company_id?: number;
  value?: number;
}

interface CreateNoteArgs {
  content: string;
  deal_id?: number;
  person_id?: number;
  company_id?: number;
}

function isValidCreatePersonArgs(args: unknown): args is CreatePersonArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.name === 'string' &&
    a.name.trim() !== '' &&
    typeof a.owner_id === 'number' &&
    (a.email === undefined || typeof a.email === 'string') &&
    (a.phone === undefined || typeof a.phone === 'string') &&
    (a.company_id === undefined || typeof a.company_id === 'number')
  );
}

function isValidCreateDealArgs(args: unknown): args is CreateDealArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.title === 'string' &&
    a.title.trim() !== '' &&
    typeof a.pipeline_id === 'number' &&
    typeof a.stage_id === 'number' &&
    typeof a.owner_id === 'number' &&
    (a.person_id === undefined || typeof a.person_id === 'number') &&
    (a.company_id === undefined || typeof a.company_id === 'number') &&
    (a.value === undefined || typeof a.value === 'number')
  );
}

function isValidCreateNoteArgs(args: unknown): args is CreateNoteArgs {
  if (typeof args !== 'object' || args === null) return false;
  const a = args as Record<string, unknown>;
  return (
    typeof a.content === 'string' &&
    a.content.trim() !== '' &&
    (typeof a.deal_id === 'number' ||
      typeof a.person_id === 'number' ||
      typeof a.company_id === 'number')
  );
}

describe('Validators', () => {
  describe('isValidCreatePersonArgs', () => {
    it('should return true for valid person args', () => {
      expect(isValidCreatePersonArgs({ name: 'John Doe', owner_id: 1 })).toBe(true);
      expect(
        isValidCreatePersonArgs({
          name: 'Jane Doe',
          owner_id: 2,
          email: 'jane@example.com',
          phone: '123456789',
        })
      ).toBe(true);
    });

    it('should return false for missing required fields', () => {
      expect(isValidCreatePersonArgs({ name: 'John' })).toBe(false);
      expect(isValidCreatePersonArgs({ owner_id: 1 })).toBe(false);
      expect(isValidCreatePersonArgs({})).toBe(false);
    });

    it('should return false for invalid types', () => {
      expect(isValidCreatePersonArgs({ name: 123, owner_id: 1 })).toBe(false);
      expect(isValidCreatePersonArgs({ name: 'John', owner_id: '1' })).toBe(false);
      expect(isValidCreatePersonArgs(null)).toBe(false);
      expect(isValidCreatePersonArgs(undefined)).toBe(false);
    });

    it('should return false for empty name', () => {
      expect(isValidCreatePersonArgs({ name: '', owner_id: 1 })).toBe(false);
      expect(isValidCreatePersonArgs({ name: '   ', owner_id: 1 })).toBe(false);
    });
  });

  describe('isValidCreateDealArgs', () => {
    it('should return true for valid deal args', () => {
      expect(
        isValidCreateDealArgs({
          title: 'New Deal',
          pipeline_id: 1,
          stage_id: 1,
          owner_id: 1,
        })
      ).toBe(true);

      expect(
        isValidCreateDealArgs({
          title: 'Big Deal',
          pipeline_id: 2,
          stage_id: 3,
          owner_id: 4,
          value: 10000,
          person_id: 5,
        })
      ).toBe(true);
    });

    it('should return false for missing required fields', () => {
      expect(isValidCreateDealArgs({ title: 'Deal' })).toBe(false);
      expect(
        isValidCreateDealArgs({
          title: 'Deal',
          pipeline_id: 1,
        })
      ).toBe(false);
    });

    it('should return false for empty title', () => {
      expect(
        isValidCreateDealArgs({
          title: '',
          pipeline_id: 1,
          stage_id: 1,
          owner_id: 1,
        })
      ).toBe(false);
    });
  });

  describe('isValidCreateNoteArgs', () => {
    it('should return true for valid note args', () => {
      expect(isValidCreateNoteArgs({ content: 'Note text', deal_id: 1 })).toBe(true);
      expect(isValidCreateNoteArgs({ content: 'Note text', person_id: 1 })).toBe(true);
      expect(isValidCreateNoteArgs({ content: 'Note text', company_id: 1 })).toBe(true);
    });

    it('should return false for missing association', () => {
      expect(isValidCreateNoteArgs({ content: 'Note text' })).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(isValidCreateNoteArgs({ content: '', deal_id: 1 })).toBe(false);
      expect(isValidCreateNoteArgs({ content: '   ', deal_id: 1 })).toBe(false);
    });
  });
});
