// app/not-found.tsx

import Link      from "next/link";
import Container from "@/components/ui/Container";
import Button    from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="min-h-[70vh] flex items-center bg-sand-50">
      <Container className="text-center py-20">
        <div className="font-arabic text-6xl text-slate-mosque mb-4" lang="ar">
          ٤٠٤
        </div>
        <h1 className="font-display text-4xl text-ink mb-4">
          Pagina niet gevonden
        </h1>
        <p className="font-body text-taupe-dark text-lg mb-8 max-w-md mx-auto">
          De pagina die u zoekt bestaat niet of is verplaatst.
        </p>
        <Button href="/" size="lg">
          Terug naar home
        </Button>
      </Container>
    </section>
  );
}
