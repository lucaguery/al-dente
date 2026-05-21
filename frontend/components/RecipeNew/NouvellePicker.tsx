"use client";

// Phase 41 PICK-01 / PICK-02 — Nouvelle Recette stateless picker.
//
// Replaces the prior /recipes/new which mounted <RecipeThread mode="capture" />
// directly. The picker is a one-tap route-level chooser; the capture thread
// itself lives on /recipes/new/[surface] (form/voice/photo/url) or — for the
// 'quick' path — on a name-only modal (NoteRapideModal) that bypasses the
// thread entirely per D-02.
//
// Layout matches sketch §Ajouter lines 1714-1755 literally:
//
//   Nouvelle recette
//   5 méthodes · choisis-en une
//
//   01  Note rapide       juste le nom, à compléter plus tard      ⚡
//   02  Formulaire        tous les détails à la main               🖋
//   03  Voix              dicte, on transcrit                       🎙
//   04  Photo             photographie un plat, on lit              📷
//   05  Lien              colle une URL, on extrait                 🔗
//
// La Grille register (ADR-0004):
//   - Geist + Geist Mono on off-white #FAFAF7
//   - Hairline rows (border-b border-border), no Card wrapper, no shadow
//   - Geist Mono `01-NN` index prefix with tabular-nums
//
// Strings flow through useTranslations('recipes.new') — invariant #6.
// D-01 stateless: no Resume affordance — every tap creates a fresh draft.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Zap,
  PenLine,
  Mic,
  Camera,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react";
import { NoteRapideModal } from "./NoteRapideModal";

type Surface = "quick" | "form" | "voice" | "photo" | "url";

const OPTIONS: { id: Surface; icon: LucideIcon }[] = [
  { id: "quick", icon: Zap },
  { id: "form", icon: PenLine },
  { id: "voice", icon: Mic },
  { id: "photo", icon: Camera },
  { id: "url", icon: LinkIcon },
];

export function NouvellePicker() {
  const router = useRouter();
  const t = useTranslations("recipes.new");
  const [noteRapideOpen, setNoteRapideOpen] = useState(false);

  return (
    <main className="min-h-dvh bg-background flex flex-col px-6 pt-12">
      <h1 className="text-3xl font-medium tracking-tight">{t("hero")}</h1>
      <p className="mt-2 text-caption text-muted-foreground">{t("subtitle")}</p>
      <ul className="mt-10 flex flex-col">
        {OPTIONS.map((opt, ix) => {
          const num = String(ix + 1).padStart(2, "0");
          const Icon = opt.icon;
          const label = t(`options.${opt.id}.label`);
          const hint = t(`options.${opt.id}.hint`);
          const onClick =
            opt.id === "quick"
              ? () => setNoteRapideOpen(true)
              : () => router.push(`/recipes/new/${opt.id}`);
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={onClick}
                className="w-full flex items-center gap-4 py-4 border-b border-border text-left"
              >
                <span className="text-caption font-mono tabular-nums shrink-0 text-foreground">
                  {num}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-medium">{label}</span>
                  <span className="block text-caption text-muted-foreground">
                    {hint}
                  </span>
                </span>
                <Icon
                  className="size-5 text-muted-foreground shrink-0"
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
      <NoteRapideModal
        open={noteRapideOpen}
        onOpenChange={setNoteRapideOpen}
      />
    </main>
  );
}
