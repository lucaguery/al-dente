"use client";

// Phase 41 PICK-02 / D-02 — Note rapide modal.
//
// Name-only modal that bypasses the conversational thread entirely. Single
// Geist text input + Enregistrer button. On submit:
//   1. POST /api/recipes  (creates blank draft, returns id)
//   2. PUT  /api/recipes/{id}  (sets title to the typed name)
//   3. router.push(`/recipes/{id}`)  (structured view, NOT /thread)
//
// Two backend calls because the existing POST /recipes accepts an empty body
// and stamps title='Extraction en cours…' — there is no name field on
// RecipeBlankCreate. Extending the backend is out of scope for Plan 41-03
// (frontend-only files_modified per the plan); the 2-call approach keeps the
// scope contract while preserving the user-facing semantics of D-02 ("POST
// {name} → land on structured view"). The structured view briefly shows the
// title transition; productize-later: collapse into one call by extending
// RecipeBlankCreate to accept optional name.
//
// All strings via useTranslations('recipes.new.note_rapide') — invariant #6.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { createBlankRecipe } from "@/lib/recipes";
import type { Recipe } from "@/lib/recipes";

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function NoteRapideModal({ open, onOpenChange }: Props) {
  const router = useRouter();
  const t = useTranslations("recipes.new.note_rapide");
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || isPending) return;
    startTransition(async () => {
      try {
        // 1. Create blank draft.
        const recipe = await createBlankRecipe();
        // 2. PUT the title so the structured view doesn't land on
        //    "Extraction en cours…" with no further capture in flight.
        await api<Recipe>(`/api/recipes/${recipe.id}`, {
          method: "PUT",
          body: JSON.stringify({ title: trimmed }),
        });
        // 3. Land on the structured view — Note rapide is intentionally
        //    NOT routed through /thread (D-02 bypass).
        onOpenChange(false);
        setName("");
        router.push(`/recipes/${recipe.id}`);
      } catch (err) {
        console.error("note rapide submit failed", err);
        toast.error(t("error"));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogDescription className="sr-only">
          {t("description")}
        </DialogDescription>
        <form onSubmit={onSubmit} className="flex flex-col gap-4 mt-4">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("placeholder")}
            maxLength={80}
          />
          <Button type="submit" disabled={isPending || !name.trim()}>
            {t("cta")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
