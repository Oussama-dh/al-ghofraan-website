import { getAllArticleSlugs, getAllEducationProgramSlugs } from "../../lib/directus.ts";

console.log("Article slugs:");
console.log(await getAllArticleSlugs());

console.log("Education slugs:");
console.log(await getAllEducationProgramSlugs());