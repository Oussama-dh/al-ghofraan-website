// components/registration/formStyles.ts
//
// Gedeelde Tailwind-klassen voor de inschrijfformulieren
// (RegistrationForm = algemeen onderwijs/activiteiten; QuranRegistrationForm =
// Hifdh programma). Eén bron, zodat beide formulieren er hetzelfde uitzien.

/** Invoerveld (input/select/textarea). */
export const inputClass =
  "w-full rounded-lg border border-sand-200 bg-white px-4 py-2.5 " +
  "font-body text-base text-ink placeholder:text-taupe/60 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-mosque " +
  "focus-visible:border-slate-mosque transition-colors " +
  "disabled:bg-sand-100 disabled:cursor-not-allowed";

/** Variant voor een veld met een foutmelding. */
export const inputErrorClass = "border-red-400 focus-visible:ring-red-500 focus-visible:border-red-500";

export const labelClass = "block font-body text-sm font-medium text-ink mb-1.5";

/** Legenda boven een <fieldset>-sectie ("OUDER / CONTACTPERSOON"). */
export const legendClass = "font-body text-sm font-semibold text-ink mb-3 uppercase tracking-wider";

/** De formulierkaart zelf. */
export const formCardClass =
  "p-6 sm:p-8 bg-white border border-sand-200 rounded-2xl shadow-sm scroll-mt-24";

/** Blok per student/kind binnen het formulier. */
export const memberBlockClass = "rounded-lg border border-sand-200 bg-sand-50/50 p-4";

/** Foutbanner onder het formulier (role="alert"). */
export const errorBannerClass =
  "mt-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 font-body text-sm";

/** Succeskaart na versturen. */
export const successCardClass =
  "p-6 bg-slate-mosque/10 border border-slate-mosque/20 rounded-2xl text-center";
