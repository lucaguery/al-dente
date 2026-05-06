"use client";

// UI-SPEC §"Surface-by-Surface Pinning" §8 — Rapide vs Complète tabs.
// Rapide: title + optional photo → POST /api/recipes/quick → optional
//         POST /api/recipes/{id}/photos → /inbox
// Complète: full form via RecipeForm → POST /api/recipes → /recipes/[id]
//
// Auth — Phase 01.1 cookie model: api() wrapper uses credentials:"include"
// and `/api/*` paths get rewritten by Vercel to Railway. The fetch() call
// for photo upload (multipart) bypasses the api() helper because it can't
// JSON-stringify FormData — but it still uses credentials:"include".

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { RecipeForm, type RecipeBody } from "@/components/RecipeForm";
import { OnboardingGuard } from "@/lib/onboarding-guard";
import type { Recipe } from "@/lib/recipes";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "";

export default function RecipeNewPage() {
  return (
    <OnboardingGuard>
      <Inner />
    </OnboardingGuard>
  );
}

function Inner() {
  const router = useRouter();
  const t = useTranslations("recipes.new");
  const tCommon = useTranslations("common");
  const tErr = useTranslations("onboarding.errors");
  const tPhoto = useTranslations("photo_uploader");
  const [tab, setTab] = useState<"quick" | "full">("quick");
  const [quickTitle, setQuickTitle] = useState("");
  const [quickPhoto, setQuickPhoto] = useState<File | null>(null);
  // Two-stage progress: "title" (POSTing /api/recipes/quick),
  // "photo" (POSTing /photos), null (idle).
  const [quickStage, setQuickStage] = useState<null | "title" | "photo">(null);

  // RECIPE-02: Rapide MUST honor "title only and an optional photo". Two-step
  // flow:
  //   1. POST /api/recipes/quick { title } → returns the new draft's id
  //   2. If a photo was attached: POST /api/recipes/{id}/photos (multipart)
  //   3. Toast + route to /inbox regardless of photo outcome (the draft is
  //      the durable artifact).
  //   4. If photo upload fails, the draft is still saved — surface a softer
  //      toast that says so.
  async function submitQuick() {
    setQuickStage("title");
    let createdId: string | null = null;
    try {
      const r = await api<Recipe>("/api/recipes/quick", {
        method: "POST",
        body: JSON.stringify({ title: quickTitle.trim() }),
      });
      createdId = r.id;
    } catch {
      toast.error(tErr("network"));
      setQuickStage(null);
      return;
    }

    // No photo attached → done.
    if (!quickPhoto) {
      toast.success(t("saved_toast"));
      setQuickStage(null);
      router.replace(`/inbox`);
      return;
    }

    // Photo attached → step 2. Multipart upload via fetch (api() can't carry
    // FormData because it default-sets Content-Type: application/json).
    setQuickStage("photo");
    try {
      const fd = new FormData();
      fd.append("file", quickPhoto);
      const res = await fetch(
        `${API_BASE}/api/recipes/${createdId}/photos`,
        {
          method: "POST",
          body: fd,
          credentials: "include",
        },
      );
      if (!res.ok) {
        // Soft failure: draft was saved; only the photo failed.
        toast.warning(t("saved_without_photo"));
      } else {
        toast.success(t("saved_toast"));
      }
    } catch {
      toast.warning(t("saved_without_photo"));
    } finally {
      setQuickStage(null);
      router.replace(`/inbox`);
    }
  }

  async function submitFull(body: RecipeBody) {
    try {
      const r = await api<Recipe>("/api/recipes", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success(t("saved_toast"));
      router.replace(`/recipes/${r.id}`);
    } catch {
      toast.error(tErr("network"));
    }
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(v) => setTab(v as "quick" | "full")}
      className="flex flex-col flex-1"
    >
      <header className="sticky top-0 z-10 h-12 px-6 flex items-center justify-between bg-background/80 backdrop-blur-sm border-b border-border">
        <Button
          size="icon"
          variant="ghost"
          aria-label={tCommon("back")}
          asChild
        >
          <Link href="/recipes">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="text-base font-semibold">{t("tab_title")}</span>
        <span className="w-10" aria-hidden />
      </header>
      <TabsList className="mx-6 mt-4 w-auto">
        <TabsTrigger value="quick" className="flex-1">
          {t("tab_quick")}
        </TabsTrigger>
        <TabsTrigger value="full" className="flex-1">
          {t("tab_full")}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="quick" className="px-6 pt-6 pb-32 flex flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quick-title">{t("title_label")}</Label>
          <Input
            id="quick-title"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder={t("title_placeholder")}
            maxLength={200}
            required
            autoFocus
          />
        </div>
        {/* RECIPE-02 optional photo. UI-SPEC §10's richer PhotoUploader
            requires a recipe id (post-save), so the quick-add pre-save
            stage uses a simpler native file input. The photo is held in
            component state and uploaded in step 2 of submitQuick. */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="quick-photo">{tPhoto("add_label")}</Label>
          <input
            id="quick-photo"
            type="file"
            accept="image/*"
            className="block w-full text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium file:text-secondary-foreground"
            onChange={(e) => setQuickPhoto(e.target.files?.[0] ?? null)}
          />
          {quickPhoto != null && (
            <p className="text-xs text-muted-foreground mt-1">
              {quickPhoto.name}
            </p>
          )}
        </div>
        <div className="fixed bottom-16 inset-x-0 px-6 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 bg-background/80 backdrop-blur-sm border-t border-border z-30">
          <Button
            className="h-11 w-full"
            disabled={!quickTitle.trim() || quickStage !== null}
            onClick={submitQuick}
          >
            {quickStage === "title" ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                {tCommon("saving")}
              </>
            ) : quickStage === "photo" ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                {t("uploading_photo")}
              </>
            ) : (
              t("submit_quick")
            )}
          </Button>
        </div>
      </TabsContent>
      <TabsContent value="full" className="-mx-0">
        <RecipeForm
          recipeId={null}
          onSubmit={async (body) => submitFull(body)}
          submitLabel={t("submit_full")}
          backHref="/recipes"
          title={t("tab_title")}
          withChrome={false}
        />
      </TabsContent>
    </Tabs>
  );
}
