import { supabase } from '../config/database';
import { DatabaseError } from '../lib/errors';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending?: boolean };
}

export class BaseRepository<T = any> {
  protected client = supabase;
  protected table: string;

  constructor(tableName: string) {
    this.table = tableName;
  }

  /**
   * Supabase reports failures as a plain object, so `throw error` threw
   * something that is not an Error at all: no stack, and `instanceof Error`
   * false, which defeats every downstream error handler. Wrap it in the
   * project's DatabaseError and say which table and operation failed.
   */
  private fail(action: string, error: { message?: string } | null): never {
    const detail = error?.message ? `: ${error.message}` : '';
    throw new DatabaseError(`Failed to ${action}${detail}`);
  }

  async findById(id: string): Promise<T | null> {
    const { data, error } = await this.client.from(this.table).select('*').eq('id', id).maybeSingle();
    if (error) this.fail(`find ${this.table} by id`, error);
    return data as T | null;
  }

  async findAll(options: QueryOptions = {}): Promise<T[]> {
    let q = this.client.from(this.table).select('*');
    if (options.orderBy) q = q.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? false });
    if (options.limit) q = q.limit(options.limit);
    if (options.offset) q = q.range(options.offset, options.offset + (options.limit || 50) - 1);
    const { data, error } = await q;
    if (error) this.fail(`list ${this.table}`, error);
    return (data || []) as T[];
  }

  async create(record: Partial<T>): Promise<T> {
    const { data, error } = await this.client.from(this.table).insert(record as any).select('*').single();
    if (error) this.fail(`create ${this.table}`, error);
    return data as T;
  }

  async update(id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.client.from(this.table).update(updates as any).eq('id', id).select('*').single();
    if (error) this.fail(`update ${this.table}`, error);
    return data as T;
  }

  async deleteById(id: string): Promise<void> {
    const { error } = await this.client.from(this.table).delete().eq('id', id);
    if (error) this.fail(`delete ${this.table}`, error);
  }

  async exists(filters: Record<string, any>): Promise<boolean> {
    let q = this.client.from(this.table).select('id', { count: 'exact', head: true });
    for (const [key, value] of Object.entries(filters)) {
      q = q.eq(key, value);
    }
    const { count, error } = await q;
    if (error) this.fail(`check ${this.table} existence`, error);
    return (count ?? 0) > 0;
  }
}
