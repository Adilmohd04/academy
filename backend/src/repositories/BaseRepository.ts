/**
 * Base Repository Pattern
 * 
 * Provides a database-agnostic abstraction layer over Supabase.
 * All database access flows through repositories, making it easy to:
 * - Swap the underlying DB provider (Supabase → Prisma, Drizzle, etc.)
 * - Mock data access in tests without touching the real database
 * - Centralise query logging, caching, and error translation
 */

import { supabase } from '../config/database';
import { DatabaseError } from '../lib/errors';

export interface QueryOptions {
  select?: string;
  orderBy?: { column: string; ascending?: boolean };
  limit?: number;
  offset?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Generic base repository that wraps Supabase operations.
 * Extend per entity for custom queries.
 *
 * @example
 *   class CourseRepository extends BaseRepository<Course> {
 *     constructor() { super('courses'); }
 *   }
 */
export class BaseRepository<T extends Record<string, unknown> = Record<string, unknown>> {
  protected readonly table: string;

  constructor(table: string) {
    this.table = table;
  }

  /* ------------------------------------------------------------------ */
  /*  Protected helper – gives subclasses direct access to the client    */
  /* ------------------------------------------------------------------ */
  protected get client() {
    return supabase;
  }

  protected query() {
    return supabase.from(this.table);
  }

  /* ------------------------------------------------------------------ */
  /*  CRUD primitives                                                    */
  /* ------------------------------------------------------------------ */

  async findById(id: string, select = '*'): Promise<T | null> {
    const { data, error } = await this.query()
      .select(select)
      .eq('id', id)
      .maybeSingle();

    if (error) throw new DatabaseError(`Failed to find ${this.table} by id`, error);
    return data as T | null;
  }

  async findOne(
    filters: Partial<Record<string, unknown>>,
    select = '*',
  ): Promise<T | null> {
    let q = this.query().select(select);
    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }
    const { data, error } = await q.maybeSingle();
    if (error) throw new DatabaseError(`Failed to findOne in ${this.table}`, error);
    return data as T | null;
  }

  async findMany(
    filters: Partial<Record<string, unknown>> = {},
    options: QueryOptions = {},
  ): Promise<T[]> {
    let q = this.query().select(options.select || '*');

    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) q = q.eq(key, value);
    }

    if (options.orderBy) {
      q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    if (options.limit) q = q.limit(options.limit);
    if (options.offset) q = q.range(options.offset, options.offset + (options.limit || 20) - 1);

    const { data, error } = await q;
    if (error) throw new DatabaseError(`Failed to findMany in ${this.table}`, error);
    return (data || []) as unknown as T[];
  }

  async findPaginated(
    filters: Partial<Record<string, unknown>> = {},
    page = 1,
    pageSize = 20,
    options: Omit<QueryOptions, 'limit' | 'offset'> = {},
  ): Promise<PaginatedResult<T>> {
    const offset = (page - 1) * pageSize;

    // Count query
    let countQ = this.query().select('*', { count: 'exact', head: true });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) countQ = countQ.eq(key, value);
    }
    const { count, error: countErr } = await countQ;
    if (countErr) throw new DatabaseError(`Failed to count ${this.table}`, countErr);

    // Data query
    const data = await this.findMany(filters, { ...options, limit: pageSize, offset });

    const total = count ?? 0;
    return {
      data,
      total,
      page,
      pageSize,
      hasMore: offset + pageSize < total,
    };
  }

  async create(payload: Partial<T>): Promise<T> {
    const { data, error } = await this.query()
      .insert([payload as any])
      .select()
      .single();

    if (error) throw new DatabaseError(`Failed to create ${this.table}`, error);
    return data as T;
  }

  async createMany(payloads: Partial<T>[]): Promise<T[]> {
    const { data, error } = await this.query()
      .insert(payloads as any[])
      .select();

    if (error) throw new DatabaseError(`Failed to bulk create ${this.table}`, error);
    return (data || []) as T[];
  }

  async update(id: string, payload: Partial<T>): Promise<T> {
    const { data, error } = await this.query()
      .update(payload as any)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new DatabaseError(`Failed to update ${this.table}`, error);
    return data as T;
  }

  async updateWhere(
    filters: Partial<Record<string, unknown>>,
    payload: Partial<T>,
  ): Promise<T[]> {
    let q = this.query().update(payload as any);
    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }
    const { data, error } = await q.select();
    if (error) throw new DatabaseError(`Failed to updateWhere in ${this.table}`, error);
    return (data || []) as T[];
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.query().delete().eq('id', id);
    if (error) throw new DatabaseError(`Failed to delete ${this.table}`, error);
  }

  async deleteWhere(filters: Partial<Record<string, unknown>>): Promise<void> {
    let q = this.query().delete();
    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }
    const { error } = await q;
    if (error) throw new DatabaseError(`Failed to deleteWhere in ${this.table}`, error);
  }

  async exists(filters: Partial<Record<string, unknown>>): Promise<boolean> {
    let q = this.query().select('id', { count: 'exact', head: true });
    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }
    const { count, error } = await q;
    if (error) throw new DatabaseError(`Failed to check existence in ${this.table}`, error);
    return (count ?? 0) > 0;
  }

  async count(filters: Partial<Record<string, unknown>> = {}): Promise<number> {
    let q = this.query().select('*', { count: 'exact', head: true });
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined) q = q.eq(key, value);
    }
    const { count, error } = await q;
    if (error) throw new DatabaseError(`Failed to count ${this.table}`, error);
    return count ?? 0;
  }
}

export default BaseRepository;
