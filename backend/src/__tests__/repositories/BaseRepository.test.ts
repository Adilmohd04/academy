/**
 * BaseRepository Unit Tests
 *
 * Tests the repository abstraction using a mocked Supabase client.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// ----- Mock Supabase -----
type MockResponse = { data: unknown; error: unknown; count?: number | null };

const chainable = () => {
  const obj: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'or', 'in', 'range', 'order', 'limit', 'upsert'];
  methods.forEach(m => {
    obj[m] = jest.fn().mockReturnValue(obj);
  });
  obj.single = jest.fn<() => Promise<MockResponse>>();
  obj.maybeSingle = jest.fn<() => Promise<MockResponse>>();
  // Default: resolve as data query
  obj.then = undefined; // Don't make it thenable by default
  return obj;
};

let mockQuery: ReturnType<typeof chainable>;

jest.mock('../../config/database', () => {
  mockQuery = chainable();
  return {
    supabase: {
      from: jest.fn(() => mockQuery),
    },
  };
});

// Import after mocking
import { BaseRepository } from '../../repositories/BaseRepository';

describe('BaseRepository', () => {
  let repo: BaseRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = chainable();
    const { supabase } = require('../../config/database');
    supabase.from.mockReturnValue(mockQuery);
    repo = new BaseRepository('test_table');
  });

  describe('findById', () => {
    it('should return entity when found', async () => {
      const entity = { id: '1', name: 'Test' };
      mockQuery.maybeSingle.mockResolvedValueOnce({ data: entity, error: null });

      const result = await repo.findById('1');

      expect(result).toEqual(entity);
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });

    it('should return null when not found', async () => {
      mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should throw DatabaseError on failure', async () => {
      mockQuery.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'DB error' },
      });

      await expect(repo.findById('1')).rejects.toThrow('Failed to find test_table by id');
    });
  });

  describe('create', () => {
    it('should create and return entity', async () => {
      const newEntity = { id: '2', name: 'New' };
      mockQuery.single.mockResolvedValueOnce({ data: newEntity, error: null });

      const result = await repo.create({ name: 'New' } as any);

      expect(result).toEqual(newEntity);
      expect(mockQuery.insert).toHaveBeenCalled();
    });

    it('should throw DatabaseError on creation failure', async () => {
      mockQuery.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unique violation' },
      });

      await expect(repo.create({ name: 'Dup' } as any)).rejects.toThrow(
        'Failed to create test_table',
      );
    });
  });

  describe('update', () => {
    it('should update and return entity', async () => {
      const updated = { id: '1', name: 'Updated' };
      mockQuery.single.mockResolvedValueOnce({ data: updated, error: null });

      const result = await repo.update('1', { name: 'Updated' } as any);

      expect(result).toEqual(updated);
      expect(mockQuery.update).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', '1');
    });
  });

  describe('deleteById', () => {
    it('should delete without error', async () => {
      // For delete, the chain ends without single() — mock the last chained call
      // We need to make eq return a resolved promise-like
      const deleteChain = chainable();
      deleteChain.eq = jest.fn<any>().mockResolvedValueOnce({ error: null });
      const { supabase } = require('../../config/database');
      supabase.from.mockReturnValueOnce(deleteChain);

      const freshRepo = new BaseRepository('test_table');
      await expect(freshRepo.deleteById('1')).resolves.toBeUndefined();
    });
  });

  describe('exists', () => {
    it('should return true when entity exists', async () => {
      // Mock the head query chain
      const existsChain = chainable();
      existsChain.eq = jest.fn<any>().mockResolvedValueOnce({ count: 1, error: null });
      const { supabase } = require('../../config/database');
      supabase.from.mockReturnValueOnce(existsChain);

      const freshRepo = new BaseRepository('test_table');
      const result = await freshRepo.exists({ name: 'Test' });

      expect(result).toBe(true);
    });
  });
});
