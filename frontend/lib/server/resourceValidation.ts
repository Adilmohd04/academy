import 'server-only';

const RESOURCE_TYPES = new Set([
  'pdf',
  'document',
  'image',
  'video',
  'audio',
  'link',
  'other',
  // These two values are used by the existing resource UIs on installs whose
  // resources type constraint has already been extended.
  'folder',
  'book',
]);

const MAX_TITLE_LENGTH = 255;
const MAX_DESCRIPTION_LENGTH = 10_000;
const MAX_CATEGORY_LENGTH = 100;

export type ResourceInput = {
  title: string;
  description: string;
  type: string;
  url: string;
  category: string;
};

export type ResourceInputResult =
  | { value: ResourceInput }
  | { error: string };

const asTrimmedString = (value: unknown) =>
  typeof value === 'string' ? value.trim() : '';

const validHttpUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
};

/**
 * Accept only the mutable fields that a resource editor is allowed to set.
 * In particular, status and created_by are deliberately never read from the
 * request body.
 */
export function parseResourceInput(body: unknown): ResourceInputResult {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A resource payload is required' };
  }

  const input = body as Record<string, unknown>;
  const title = asTrimmedString(input.title);
  const description = asTrimmedString(input.description);
  const type = asTrimmedString(input.type).toLowerCase();
  const url = asTrimmedString(input.url);
  const category = asTrimmedString(input.category) || 'General';

  if (!title || title.length > MAX_TITLE_LENGTH) {
    return { error: `Title must be between 1 and ${MAX_TITLE_LENGTH} characters` };
  }

  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return { error: `Description must be at most ${MAX_DESCRIPTION_LENGTH} characters` };
  }

  if (!RESOURCE_TYPES.has(type)) {
    return { error: 'Invalid resource type' };
  }

  if (category.length > MAX_CATEGORY_LENGTH) {
    return { error: `Category must be at most ${MAX_CATEGORY_LENGTH} characters` };
  }

  if (type === 'folder') {
    if (url !== '#folder') {
      return { error: 'Folders must use the folder placeholder URL' };
    }
  } else if (!validHttpUrl(url)) {
    return { error: 'Resource URL must be an http or https URL' };
  }

  return {
    value: {
      title,
      description,
      type,
      url,
      category,
    },
  };
}

export const hasResourceInputError = (
  result: ResourceInputResult,
): result is { error: string } => 'error' in result;

export const parseOptionalParentId = (body: unknown): string | null | undefined => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return undefined;
  }

  const parentId = (body as Record<string, unknown>).parent_id;
  if (parentId === null || parentId === undefined || parentId === '') {
    return null;
  }

  return typeof parentId === 'string' && parentId.trim()
    ? parentId.trim()
    : undefined;
};
