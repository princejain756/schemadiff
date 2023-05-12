/**
 * JSON pointer helpers (RFC 6901), using the `#` root fragment form that JSON
 * Schema itself uses for `$ref` targets.
 */

export function escapeToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1');
}

export function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~');
}

/** Join pointer tokens onto a base pointer: `joinPointer('#', 'properties', 'a/b')`. */
export function joinPointer(base: string, ...tokens: string[]): string {
  const root = base === '' ? '#' : base;
  return tokens.reduce((pointer, token) => `${pointer}/${escapeToken(token)}`, root);
}

/** `#/properties/id/type` becomes `properties.id.type`; the root becomes `(root)`. */
export function describePointer(pointer: string): string {
  const trimmed = pointer.replace(/^#/, '').replace(/^\//, '');
  if (trimmed === '') return '(root)';
  return trimmed
    .split('/')
    .map((token) => unescapeToken(token))
    .join('.');
}
