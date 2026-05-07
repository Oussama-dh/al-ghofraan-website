// scripts/seed/steps/17-contact.mjs
//
// Maakt:
//   - contact_messages collectie (admin-only, geen public access)
//   - page_content "contact" als draft (admin kan publiceren)
//   - site_settings.whatsapp_number en whatsapp_default_message
//
// Idempotent.

import { ensureCollection, ensureField, softCreateItem } from "../lib/helpers.mjs";

export async function setupContact(client) {
  console.log("\n📬 Stap 17 · contact_messages + contactpagina + WhatsApp");

  // ─── contact_messages ──────────────────────────────────────
  await ensureCollection(client, {
    collection: "contact_messages",
    meta: {
      icon:             "inbox",
      note:             "Berichten via /contact. Admin-only — geen public access.",
      display_template: "{{name}} — {{subject}}",
      sort_field:       "-created_at",
      archive_field:    "status",
      archive_value:    "archived",
      unarchive_value:  "new",
    },
    schema: {},
  });

  await ensureField(client, "contact_messages", {
    field: "name",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "contact_messages", {
    field: "email",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "contact_messages", {
    field: "phone",
    type:  "string",
    meta:  { width: "half", interface: "input" },
    schema:{},
  });

  await ensureField(client, "contact_messages", {
    field: "subject",
    type:  "string",
    meta:  { width: "half", interface: "input", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "contact_messages", {
    field: "message",
    type:  "text",
    meta:  { width: "full", interface: "input-multiline", required: true },
    schema:{ is_nullable: false },
  });

  await ensureField(client, "contact_messages", {
    field: "status",
    type:  "string",
    meta: {
      width:     "half",
      interface: "select-dropdown",
      options: {
        choices: [
          { text: "Nieuw",        value: "new"      },
          { text: "Gelezen",      value: "read"     },
          { text: "Beantwoord",   value: "replied"  },
          { text: "Gearchiveerd", value: "archived" },
        ],
      },
      display: "labels",
      display_options: {
        choices: [
          { text: "Nieuw",        value: "new",      foreground: "#FFFFFF", background: "#3A6F8F" },
          { text: "Gelezen",      value: "read",     foreground: "#18222F", background: "#E0C77A" },
          { text: "Beantwoord",   value: "replied",  foreground: "#FFFFFF", background: "#2ECDA7" },
          { text: "Gearchiveerd", value: "archived", foreground: "#FFFFFF", background: "#A2B5CD" },
        ],
      },
    },
    schema: { default_value: "new", is_nullable: false },
  });

  await ensureField(client, "contact_messages", {
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

  // ─── site_settings: WhatsApp velden ────────────────────────
  await ensureField(client, "site_settings", {
    field: "whatsapp_number",
    type:  "string",
    meta:  {
      width:     "half",
      interface: "input",
      note:      "WhatsApp-nummer in internationaal formaat (bv. '+31 6 12345678' of '31612345678'). Spaties/streepjes worden automatisch verwijderd. Leeg = geen WhatsApp-knop op /contact.",
    },
    schema:{},
  });

  await ensureField(client, "site_settings", {
    field: "whatsapp_default_message",
    type:  "text",
    meta:  {
      width:     "full",
      interface: "input-multiline",
      note:      "Optionele standaard­tekst die voor­ingevuld wordt in WhatsApp wanneer iemand op de knop klikt.",
    },
    schema:{},
  });

  // ─── page_content "contact" ────────────────────────────────
  // Soft-create: bestaat de pagina al, dan blijven handmatige edits intact.
  await softCreateItem(client, "page_content", "slug", "contact", {
    title:       "Contact",
    subtitle:    "Wij horen graag van u",
    intro:       "Heeft u een vraag, opmerking of voorstel? Neem gerust contact met ons op.",
    body:
      "<p>Wij streven ernaar om binnen enkele werkdagen op uw bericht te reageren. " +
      "Voor dringende zaken kunt u ons ook telefonisch of via WhatsApp bereiken " +
      "tijdens de openingstijden van de moskee.</p>",
    status:      "published",
  });

  console.log("✓ Stap 17 voltooid");
}
