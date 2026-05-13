// scripts/seed/steps/29-vacatures.mjs
//
// Delivery 18 — Vacatures als echte collectie + bijbehorende seed-data.
//
// Levensloop van dit bestand:
//   - Delivery 17 introduceerde alleen `page_content/vacatures` + nav-item
//     (vacatures als rich-text op één pagina).
//   - Delivery 18 voegt daarbovenop de `vacancies` collectie toe met losse
//     records per vacature. De `page_content/vacatures` blijft staan en
//     wordt nu hergebruikt voor de hero/intro van de overzicht-pagina —
//     de body van page_content wordt door de nieuwe routes NIET meer
//     gerenderd.
//
// Wat deze stap doet (alles idempotent):
//   1. `vacancies` collectie aanmaken volgens articles-patroon (status,
//      slug unique, sort, archive_field).
//   2. Velden toevoegen: title, slug, summary, body (rich-text), location,
//      hours, deadline, apply_url, contact_email, sort, published_at,
//      created_at, hero_image.
//   3. `page_content/vacatures` soft-create (uit delivery 17 behouden,
//      blijft nodig voor hero-content). Bestaande record wordt NIET
//      overschreven.
//   4. `navigation_items/Vacatures` soft-create (uit delivery 17 behouden).
//   5. Twee voorbeeld-vacatures als `status=draft` (variant B uit
//      delivery 18 analyse). Soft-create op slug — bestaande wordt nooit
//      overschreven, dus admin-edits blijven staan.
//
// Hard rules respecteert:
//   - Bestaande page_content `vacatures` wordt nooit gemuteerd.
//   - Bestaande navigation_item `Vacatures` wordt nooit gemuteerd.
//   - Voorbeeld-vacatures zijn `draft` → niet publiek zichtbaar.
//   - Geen delete-permission elders nodig (status archive volstaat).
//   - Tweede `npm run seed` = no-op voor alle records.

import { ensureCollection, ensureField, softCreateItem } from "../lib/helpers.mjs";

// ─── page_content/vacatures (uit delivery 17, behouden) ─────────────
//
// Body-veld is in delivery 17 gevuld met een rich-text overzicht van
// vacatures. In delivery 18 wordt body NIET meer gerenderd door de
// frontend — daarvoor zijn nu de losse `vacancies` records. Body blijft
// staan om bestaande admin-edits niet te verliezen. Beheerder kan het
// veld leegmaken of een algemene intro-tekst plaatsen voor zichzelf.

const VACATURES_BODY = [
  "<h2>Openstaande vacatures</h2>",
  "<p>Hier vind je openstaande vrijwilligersfuncties en rollen binnen Al-Ghofraan.</p>",
  "",
  "<h3>Vrijwilliger jongerenactiviteiten</h3>",
  "<p>Help mee met het organiseren van activiteiten voor jongeren.</p>",
  "<p><a href=\"/contact\">Reageer op deze vacature</a></p>",
  "",
  "<hr>",
  "",
  "<h3>Ondersteuning communicatie</h3>",
  "<p>Help mee met teksten, aankondigingen en communicatie rondom activiteiten.</p>",
  "<p><a href=\"/contact\">Reageer op deze vacature</a></p>",
].join("\n");

const VACATURES_PAGE = {
  slug:         "vacatures",
  title:        "Vacatures",
  arabic_title: "وظائف شاغرة",
  subtitle:     "Vrijwilligersrollen en functies binnen Al-Ghofraan",
  intro:        "Wil je een actieve rol spelen binnen onze gemeenschap? Bekijk hieronder onze openstaande vacatures.",
  body:         VACATURES_BODY,
  status:       "published",
};

const VACATURES_NAV_ITEM = {
  label:     "Vacatures",
  href:      "/vacatures",
  sort:      47,         // tussen Contact (45) en Doneren (50)
  highlight: false,
  external:  false,
  active:    true,
  location:  "both",     // header + footer
};

// ─── Voorbeeld-vacatures (variant B, draft, soft-create) ────────────
//
// Allebei `status=draft` — beheerder ziet ze in admin maar publiek niet.
// Soft-create op slug zodat tweede `npm run seed` ze niet meer aanraakt,
// en admin-edits altijd voorrang hebben.

const SAMPLE_VACANCY_BODY_1 = [
  "<h2>Wat ga je doen?</h2>",
  "<p>Als vrijwilliger voor jongerenactiviteiten help je mee met het organiseren van bijeenkomsten, sport- en kennisactiviteiten voor jongeren binnen onze gemeenschap. Je werkt nauw samen met andere vrijwilligers en de DawahCommissie.</p>",
  "<h2>Wat vragen we?</h2>",
  "<ul>",
  "  <li>Affiniteit met jongeren tussen 12 en 18 jaar.</li>",
  "  <li>Beschikbaarheid van enkele uren per week, vooral in het weekend.</li>",
  "  <li>Goede communicatieve vaardigheden in het Nederlands.</li>",
  "  <li>Een positieve, geduldige houding.</li>",
  "</ul>",
  "<h2>Wat bieden we?</h2>",
  "<ul>",
  "  <li>Een waardevolle bijdrage aan de jeugd in onze gemeenschap.</li>",
  "  <li>Een enthousiast team van vrijwilligers.</li>",
  "  <li>Ruimte voor eigen initiatief en groei.</li>",
  "</ul>",
].join("\n");

const SAMPLE_VACANCY_BODY_2 = [
  "<h2>Wat ga je doen?</h2>",
  "<p>Je helpt mee met het schrijven, redigeren en plannen van teksten voor onze website, social media en interne communicatie. Denk aan aankondigingen van lezingen, nieuwsberichten en achtergrondartikelen.</p>",
  "<h2>Wat vragen we?</h2>",
  "<ul>",
  "  <li>Een goede schrijfvaardigheid in het Nederlands.</li>",
  "  <li>Affiniteit met de Islamitische gemeenschap en haar onderwerpen.</li>",
  "  <li>Een paar uur per week beschikbaar — flexibel in te delen.</li>",
  "</ul>",
  "<h2>Wat bieden we?</h2>",
  "<ul>",
  "  <li>Veel ruimte voor eigen invulling en creativiteit.</li>",
  "  <li>Samenwerking met een betrokken team.</li>",
  "  <li>Een zinvolle vrijwilligersrol op afstand mogelijk.</li>",
  "</ul>",
].join("\n");

const SAMPLE_VACANCIES = [
  {
    status:        "draft",
    title:         "Vrijwilliger jongerenactiviteiten",
    slug:          "vrijwilliger-jongerenactiviteiten",
    summary:       "Help mee met het organiseren van activiteiten voor jongeren binnen onze gemeenschap.",
    body:          SAMPLE_VACANCY_BODY_1,
    location:      "Steenbergen",
    hours:         "4-8 uur per week",
    deadline:      null,
    apply_url:     null,
    contact_email: null,
    sort:          1,
  },
  {
    status:        "draft",
    title:         "Ondersteuning communicatie",
    slug:          "ondersteuning-communicatie",
    summary:       "Help mee met teksten, aankondigingen en communicatie rondom activiteiten van de DawahCommissie.",
    body:          SAMPLE_VACANCY_BODY_2,
    location:      "Flexibel / op afstand mogelijk",
    hours:         "2-4 uur per week",
    deadline:      null,
    apply_url:     null,
    contact_email: null,
    sort:          2,
  },
];

// ─── Setup ──────────────────────────────────────────────────────────

export async function setupVacatures(client) {
  console.log("");
  console.log("29. Vacatures — collectie + page_content + nav-item + voorbeeld-records");

  // ─── Stap 1: vacancies collectie + velden ─────────────────────────
  // Patroon 1-op-1 van articles (stap 16):
  //   - sort_field "-published_at": archief vanzelf onderaan
  //   - archive_field/value zorgt voor "archiveren = niet meer publiek"
  await ensureCollection(client, {
    collection: "vacancies",
    meta: {
      icon:             "work",
      note:             "Vacatures voor /vacatures + /vacatures/[slug]. Alleen status=published is publiek.",
      display_template: "{{title}} ({{status}})",
      sort_field:       "-published_at",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "draft",
    },
    schema: {},
  });

  await ensureField(client, "vacancies", {
    field: "status",
    type:  "string",
    meta: {
      width:     "full",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Gepubliceerd", value: "published" },
          { text: "Concept",       value: "draft"     },
          { text: "Gearchiveerd",  value: "archived"  },
        ],
      },
      display: "labels",
      // Delivery 19 — kleurcodering voor de status-badges in de admin-lijst,
      // consistent met andere collecties zoals `articles` en `donation_campaigns`.
      // Voor bestaande installs (waar het veld al bestaat) dekt stap 31 dit af
      // via een idempotente PATCH; voor nieuwe installs zit het hier inline.
      display_options: {
        choices: [
          { text: "Gepubliceerd", value: "published", foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Concept",       value: "draft",     foreground: "#18222F", background: "#D3DAE4" },
          { text: "Gearchiveerd",  value: "archived",  foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
    },
    schema: { default_value: "draft", is_nullable: false },
  });

  await ensureField(client, "vacancies", {
    field: "title",
    type:  "string",
    meta:  { width: "full", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "vacancies", {
    field: "slug",
    type:  "string",
    meta: {
      width:     "full",
      interface: "input",
      options:   { slug: true, trim: true },
      special:   ["slug"],
      required:  true,
      note:      "URL-deel voor de detail-pagina (/vacatures/<slug>). Pas niet aan na publicatie — kan inkomende links breken.",
    },
    schema: { is_nullable: false, is_unique: true },
  });

  await ensureField(client, "vacancies", {
    field: "summary",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-multiline",
      note:      "Korte samenvatting (1-2 zinnen) voor de card op het overzicht en social previews.",
    },
    schema: {},
  });

  await ensureField(client, "vacancies", {
    field: "body",
    type:  "text",
    meta: {
      width:     "full",
      interface: "input-rich-text-html",
      note:      "Hoofdtekst van de vacature. Rich-text — gebruik koppen, lijsten, links naar /contact, etc.",
    },
    schema: {},
  });

  await ensureField(client, "vacancies", {
    field: "location",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Bv. 'Steenbergen', 'Flexibel', 'Op afstand mogelijk'.",
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "hours",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Bv. '4-8 uur per week' of 'Flexibel'.",
    },
    schema:{},
  });

  // Delivery 19 — Twee extra meta-velden voor de Arbeidsvoorwaarden-grid
  // op de detail-pagina. Vrije tekstvelden (geen format-validatie) zodat
  // admin zelf kan kiezen tussen "€ 2.500 – € 3.200 per maand",
  // "Vrijwilligersvergoeding" of "In overleg".
  await ensureField(client, "vacancies", {
    field: "salary",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:
        "Bv. '€ 2.500 – € 3.200 per maand', 'Vrijwilligersvergoeding' of " +
        "'In overleg'. Alleen tonen op de site als gevuld.",
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "contract_duration",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:
        "Bv. '1 jaar met optie tot verlenging', 'Onbepaalde tijd' of " +
        "'Vrijwilligersbasis'. Alleen tonen op de site als gevuld.",
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "deadline",
    type:  "date",
    meta:  {
      width:     "half",
      interface: "datetime",
      note:      "Reageer-deadline. Alleen tonen op frontend als gevuld.",
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "apply_url",
    type:  "string",
    meta:  {
      width:     "full",
      interface: "input",
      note:      "Optionele externe sollicitatie-URL. Als gevuld: CTA-knop op detailpagina linkt hierheen (target=_blank). Anders valt CTA terug op /contact.",
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "contact_email",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Optioneel direct contact-adres. Wordt als secundaire CTA op de detailpagina getoond.",
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "sort",
    type:  "integer",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "Handmatige volgorde op /vacatures (laag = bovenaan).",
    },
    schema:{ default_value: 0 },
  });

  await ensureField(client, "vacancies", {
    field: "published_at",
    type:  "timestamp",
    meta: {
      width:     "half",
      interface: "datetime",
      note:      "Publicatiedatum — tiebreaker voor sortering bij gelijke `sort`-waarde.",
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "created_at",
    type:  "timestamp",
    meta:  {
      width:     "half",
      interface: "datetime",
      readonly:  true,
      special:   ["date-created"],
    },
    schema:{},
  });

  await ensureField(client, "vacancies", {
    field: "hero_image",
    type:  "uuid",
    meta:  {
      width:     "full",
      interface: "file-image",
      special:   ["file"],
      note:      "Optionele hero-afbeelding boven de detailpagina. Werkt via dezelfde overlay-conventie als activiteit/onderwijs-detailpagina's.",
    },
    schema: { foreign_key_table: "directus_files" },
  });

  // ─── Stap 2: page_content/vacatures (delivery 17 — niet overschrijven) ──
  await softCreateItem(
    client,
    "page_content",
    "slug",
    VACATURES_PAGE.slug,
    VACATURES_PAGE,
  );

  // ─── Stap 3: navigation_items/Vacatures (delivery 17 — niet overschrijven) ──
  await softCreateItem(
    client,
    "navigation_items",
    "label",
    VACATURES_NAV_ITEM.label,
    VACATURES_NAV_ITEM,
  );

  // ─── Stap 4: voorbeeld-vacatures (variant B, draft) ───────────────
  for (const sample of SAMPLE_VACANCIES) {
    await softCreateItem(
      client,
      "vacancies",
      "slug",
      sample.slug,
      sample,
    );
  }
}
