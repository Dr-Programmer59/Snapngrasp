/**
 * Safe map helper that throws a descriptive error when the array is undefined or null.
 * Use this around suspicious .map() calls to see the exact variable name in the error.
 *
 * Example:
 *   {debugMap(products, 'HomeScreen products', (item) => (
 *     <ProductCard key={item.id} item={item} />
 *   ))}
 *
 * If products is undefined, you'll see:
 *   [MAP DEBUG] HomeScreen products expected an array but got undefined
 */
export function debugMap<T, R>(
  value: T[] | null | undefined,
  label: string,
  mapper: (item: T, index: number) => R
): R[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `[MAP DEBUG] ${label} expected an array but got ${
        value === null ? 'null' : typeof value
      }`
    );
  }

  return value.map(mapper);
}
