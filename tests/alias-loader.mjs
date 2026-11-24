const srcRoot = new URL("../src/", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = new URL(`${specifier.slice(2)}.ts`, srcRoot);
    return nextResolve(target.href, context);
  }
  return nextResolve(specifier, context);
}
