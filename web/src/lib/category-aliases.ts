import type { SupabaseClient } from "@supabase/supabase-js";

export type DirectoryCategory = { name: string; slug: string };

type CategoryAlias = {
  alias_slug: string;
  category_slug: string;
};

export async function loadCategoryAliasMap(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("category_aliases")
    .select("alias_slug, category_slug");
  if (error) throw new Error("Directory category aliases could not be loaded.");
  return new Map(
    ((data ?? []) as CategoryAlias[]).map((alias) => [
      alias.alias_slug,
      alias.category_slug,
    ]),
  );
}

export function canonicalCategorySlug(
  slug: string,
  aliases: ReadonlyMap<string, string>,
) {
  const normalized = slug.trim().toLocaleLowerCase();
  return aliases.get(normalized) ?? normalized;
}

export function canonicalDirectoryCategories(
  categories: DirectoryCategory[],
  aliases: ReadonlyMap<string, string>,
) {
  return categories.filter((category) => !aliases.has(category.slug));
}
