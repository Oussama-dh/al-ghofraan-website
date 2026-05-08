// scripts/seed/steps/11c-education-flow-fields.mjs
//
// Voegt drie boolean-velden toe aan `education_programs` waarmee de
// beheerder per onderwijsprogramma kan bepalen hoe de inschrijfflow
// zich gedraagt:
//
//   - show_registration_form_immediately : boolean, default false
//        Bij `false` toont de detailpagina eerst alleen informatie en
//        een knop "Inschrijven" — pas na klikken verschijnt het
//        formulier (client-side toggle, geen route-wijziging).
//        Bij `true` is het formulier direct zichtbaar onderaan de
//        pagina, zoals voor delivery 4.
//
//   - require_terms_acceptance           : boolean, default true
//        Bij `true` toont het formulier de voorwaarden-checkbox en
//        wordt deze server-side afgedwongen.
//        Bij `false` verdwijnt de checkbox volledig en wordt deze
//        ook server-side niet vereist. De privacy-checkbox blijft
//        wél altijd verplicht.
//
//   - allow_multiple_students            : boolean, default true
//        Bij `true` toont het formulier de knop "+ Voeg nog een
//        student toe" en kunnen meerdere studenten in één indiening
//        worden ingeschreven (max 20).
//        Bij `false` is de knop verborgen, blijft de students-array
//        begrensd tot één en weigert de API meer dan één student.
//
// Bestaande records worden NIET overschreven — `ensureField` voegt
// alleen de kolom toe als die nog niet bestaat. De `default_value`
// op DB-niveau zorgt ervoor dat reeds bestaande programma's na de
// migratie de gewenste defaults krijgen (false / true / true).
//
// Idempotent: tweede run is een no-op.

import { ensureField } from "../lib/helpers.mjs";

export async function setupEducationFlowFields(client) {
  console.log("\n🎛️  Stap 11c · Onderwijs-flow toggles op education_programs");

  await ensureField(client, "education_programs", {
    field: "show_registration_form_immediately",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Aan: formulier staat direct onder de uitleg. " +
        "Uit (standaard): bezoeker ziet eerst alleen info en een 'Inschrijven'-knop, " +
        "het formulier verschijnt pas na klikken op die knop.",
    },
    schema: { default_value: false, is_nullable: false },
  });

  await ensureField(client, "education_programs", {
    field: "require_terms_acceptance",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Aan (standaard): toont en verplicht de voorwaarden-checkbox. " +
        "Uit: voorwaarden-checkbox verdwijnt en wordt niet afgedwongen. " +
        "De privacy-checkbox blijft altijd verplicht.",
    },
    schema: { default_value: true, is_nullable: false },
  });

  await ensureField(client, "education_programs", {
    field: "allow_multiple_students",
    type:  "boolean",
    meta: {
      width:     "half",
      interface: "boolean",
      note:
        "Aan (standaard): meerdere studenten/kinderen in één inschrijving toegestaan, " +
        "incl. de '+ Voeg nog een student toe'-knop. " +
        "Uit: maximaal één student per inschrijving (knop verborgen, server-side afgedwongen).",
    },
    schema: { default_value: true, is_nullable: false },
  });

  console.log("✓ Stap 11c voltooid");
}
