"use client";

// TODO(milestone-close): remove after v0.2 ships.
// This route exists only as the Phase 5 acceptance gate. The v0.2 milestone
// audit (post-Phase 9) closes the v0.2 milestone by deleting this directory.
// Strings on this page intentionally bypass next-intl — see UI-SPEC §Copywriting Contract.

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { toast } from "sonner";

import { variants, transitions } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

type Swatch = {
  token: string;
  oklch: string;
  hex: string;
  className: string;
};

const lightSwatches: Swatch[] = [
  {
    token: "--background",
    oklch: "oklch(0.985 0.008 60)",
    hex: "#FBF9F4",
    className: "bg-background text-foreground",
  },
  {
    token: "--secondary",
    oklch: "oklch(0.945 0.012 50)",
    hex: "#F0E9E0",
    className: "bg-secondary text-secondary-foreground",
  },
  {
    token: "--primary",
    oklch: "oklch(0.595 0.135 35)",
    hex: "#C45A3F",
    className: "bg-primary text-primary-foreground",
  },
  {
    token: "--destructive",
    oklch: "oklch(0.55 0.20 25)",
    hex: "#B23A1F",
    className: "bg-destructive text-primary-foreground",
  },
  {
    token: "--valide-tint",
    oklch: "oklch(0.93 0.07 145)",
    hex: "—",
    className: "bg-[var(--valide-tint)] text-foreground",
  },
  {
    token: "--surface-rose-100",
    oklch: "oklch(0.94 0.045 35)",
    hex: "#F1D2BD",
    className: "bg-surface-rose-100 text-foreground",
  },
];

function SwatchGrid({ swatches }: { swatches: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {swatches.map((s) => (
        <div
          key={s.token}
          className={`paper-grain flex h-24 w-full flex-col justify-between rounded-xl border border-border p-3 ${s.className}`}
        >
          <span className="text-caption font-medium">{s.token}</span>
          <span className="text-caption opacity-80">
            {s.hex}
            <br />
            {s.oklch}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function StyleguidePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [slideVisible, setSlideVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark");
    setDarkMode((prev) => !prev);
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-12 px-6 pt-12 pb-24">
      {/* Header + dark-mode toggle */}
      <header className="flex flex-col gap-4">
        <h1 className="text-display">« Al Dente. À la maison. »</h1>
        <p className="text-body text-foreground-muted">
          Phase 5 acceptance gate. Dev-only. Marked for milestone-close removal.
        </p>
        <button
          type="button"
          onClick={toggleDark}
          className="self-start rounded-lg border border-border bg-card px-3 py-2 text-caption font-medium transition-colors duration-fast ease-craft hover:bg-muted"
        >
          {darkMode ? "Mode clair" : "Mode sombre"}
        </button>
      </header>

      {/* (a) Tokens / Color */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Tokens / Color</h2>
        <div className="flex flex-col gap-4">
          <span className="text-caption font-medium uppercase tracking-wide text-foreground-muted">
            Light mode
          </span>
          <SwatchGrid swatches={lightSwatches} />
        </div>
        <div className="flex flex-col gap-4">
          <span className="text-caption font-medium uppercase tracking-wide text-foreground-muted">
            Dark mode preview
          </span>
          <div className="dark rounded-xl bg-background p-4">
            <SwatchGrid swatches={lightSwatches} />
          </div>
        </div>
      </section>

      {/* (b) Tokens / Typography */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Tokens / Typography</h2>
        <div className="flex flex-col gap-4">
          <p className="text-display">« Al Dente. À la maison. »</p>
          <p className="text-title">« Tagliatelles aux cèpes »</p>
          <p className="text-body">
            « On laisse mijoter à feu doux pendant trois quarts d&apos;heure.
            C&apos;est la patience qui fait le goût — pas l&apos;effort. »
          </p>
          <p className="text-caption">« Cuit le 7 mai »</p>
          <Label>Catégorie</Label>
        </div>
      </section>

      {/* (c) Tokens / Shadows */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Tokens / Shadows</h2>
        <div className="flex flex-col gap-4">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>shadow-card</CardTitle>
              <CardDescription>Au repos — paper-on-wood</CardDescription>
            </CardHeader>
          </Card>
          <Card className="shadow-card transition-shadow duration-fast ease-craft hover:shadow-card-hover">
            <CardHeader>
              <CardTitle>shadow-card-hover</CardTitle>
              <CardDescription>Survolez la carte</CardDescription>
            </CardHeader>
          </Card>
          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium text-foreground-muted">
              shadow-nav (hairline above bottom nav)
            </span>
            <div className="h-2 w-full bg-background shadow-nav" />
          </div>
        </div>
      </section>

      {/* (d) Tokens / Motion */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Tokens / Motion</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium text-foreground-muted">
              Tap-press feedback (scale 1 → 0.98 over duration-fast)
            </span>
            <motion.div
              variants={variants.pressFeedback}
              initial="rest"
              whileTap="pressed"
              className="self-start"
            >
              <Button>Appuyer</Button>
            </motion.div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-caption font-medium text-foreground-muted">
              Slide up (duration-normal)
            </span>
            <Button
              variant="outline"
              onClick={() => setSlideVisible((v) => !v)}
              className="self-start"
            >
              {slideVisible ? "Masquer" : "Afficher"}
            </Button>
            <motion.div
              variants={variants.slideUp}
              initial="hidden"
              animate={slideVisible ? "visible" : "hidden"}
            >
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>« Tagliatelles aux cèpes »</CardTitle>
                  <CardDescription>
                    Glisse vers le haut sur la courbe ease-craft.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </div>
          <p className="text-caption text-foreground-muted">
            Reduced motion: enable the OS-level <code>Reduce Motion</code>{" "}
            setting and reload — all transitions clamp to 0ms via globals.css{" "}
            <code>@media (prefers-reduced-motion: reduce)</code>.
          </p>
        </div>
      </section>

      {/* (e) Texture / Paper-grain */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Texture / Paper-grain</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="paper-grain flex h-20 w-32 items-center justify-center rounded-xl border border-border bg-card p-3 text-caption">
            small
          </div>
          <div className="paper-grain flex h-32 w-48 items-center justify-center rounded-xl border border-border bg-card p-3 text-caption">
            medium
          </div>
          <div className="paper-grain flex h-40 w-full items-center justify-center rounded-xl border border-border bg-card p-3 text-caption">
            large
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {/* Anti-pattern demo: paper-grain on a button surface — UI-SPEC §Paper-Grain "NOT applied to" */}
          <Button className="paper-grain self-start">
            NOT applied here (button surface)
          </Button>
          <span className="text-caption text-foreground-muted">
            paper-grain reserved for cards only
          </span>
        </div>
        <div className="bg-background p-6 text-caption">
          Body background — paper-grain NOT applied here
        </div>
      </section>

      {/* (f) Primitives / Buttons */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Primitives / Buttons</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button>default</Button>
            <Button variant="outline">outline</Button>
            <Button variant="secondary">secondary</Button>
            <Button variant="ghost">ghost</Button>
            <Button variant="destructive">destructive</Button>
            <Button variant="link">link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="xs">xs</Button>
            <Button size="sm">sm</Button>
            <Button size="default">default</Button>
            <Button size="lg">lg</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="icon-xs" aria-label="icon-xs">
              <ChevronRight />
            </Button>
            <Button size="icon-sm" aria-label="icon-sm">
              <ChevronRight />
            </Button>
            <Button size="icon" aria-label="icon">
              <ChevronRight />
            </Button>
            <Button size="icon-lg" aria-label="icon-lg">
              <ChevronRight />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled>disabled</Button>
            <Button aria-invalid="true">aria-invalid</Button>
          </div>
        </div>
      </section>

      {/* (g) Primitives / Form controls */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Primitives / Form controls</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-input-default">Catégorie</Label>
            <Input id="sg-input-default" placeholder="Saisir une catégorie" />
          </div>
          <Input placeholder="Disabled" disabled />
          <Input placeholder="aria-invalid" aria-invalid="true" />
          <Textarea placeholder="« Notes de cuisson »" />
          <Textarea placeholder="Disabled" disabled />
          <Textarea placeholder="aria-invalid" aria-invalid="true" />
          <div className="flex flex-col gap-2">
            <Label htmlFor="sg-select-season">Saison</Label>
            <Select>
              <SelectTrigger id="sg-select-season" className="w-48">
                <SelectValue placeholder="Choisir une saison" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hiver">Hiver</SelectItem>
                <SelectItem value="printemps">Printemps</SelectItem>
                <SelectItem value="ete">Été</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* (h) Primitives / Surfaces */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Primitives / Surfaces</h2>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>« Tagliatelles aux cèpes »</CardTitle>
              <CardDescription>
                Carte par défaut avec paper-grain visible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-body">
                « On laisse mijoter à feu doux pendant trois quarts d&apos;heure. »
              </p>
            </CardContent>
          </Card>
          <Card data-size="sm">
            <CardHeader>
              <CardTitle>Carte (sm)</CardTitle>
              <CardDescription>Variante compacte.</CardDescription>
            </CardHeader>
          </Card>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="self-start">
                Ouvrir le Dialog
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>« Confirmer »</DialogTitle>
                <DialogDescription>
                  Cette action est définitive.
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
          <div className="flex flex-wrap gap-2">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <Sheet key={side}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    Sheet {side}
                  </Button>
                </SheetTrigger>
                <SheetContent side={side}>
                  <SheetHeader>
                    <SheetTitle>« Confirmer »</SheetTitle>
                    <SheetDescription>
                      Cette action est définitive.
                    </SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>
            ))}
          </div>
        </div>
      </section>

      {/* (i) Primitives / Feedback */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Primitives / Feedback</h2>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast("Sauvegardé")}
            >
              toast()
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success("Sauvegardé")}
            >
              toast.success
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Information")}
            >
              toast.info
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.warning("Attention")}
            >
              toast.warning
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.error("Erreur")}
            >
              toast.error
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>default</Badge>
            <Badge variant="secondary">secondary</Badge>
            <Badge variant="destructive">destructive</Badge>
            <Badge variant="outline">outline</Badge>
            <Badge variant="ghost">ghost</Badge>
            <Badge variant="link">link</Badge>
          </div>
        </div>
      </section>

      {/* (j) Primitives / Navigation + structure */}
      <section className="flex flex-col gap-6">
        <h2 className="text-title">Primitives / Navigation + structure</h2>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <span className="text-caption font-medium text-foreground-muted">
              Tabs (default)
            </span>
            <Tabs defaultValue="recettes">
              <TabsList>
                <TabsTrigger value="recettes">Recettes</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
              </TabsList>
              <TabsContent value="recettes">
                <p className="text-body">« Tagliatelles aux cèpes »</p>
              </TabsContent>
              <TabsContent value="notes">
                <p className="text-body">« Cuit le 7 mai »</p>
              </TabsContent>
              <TabsContent value="photos">
                <p className="text-body">Trois clichés du dernier service.</p>
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-caption font-medium text-foreground-muted">
              Tabs (line)
            </span>
            <Tabs defaultValue="recettes">
              <TabsList variant="line">
                <TabsTrigger value="recettes">Recettes</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="photos">Photos</TabsTrigger>
              </TabsList>
              <TabsContent value="recettes">
                <p className="text-body">« Tagliatelles aux cèpes »</p>
              </TabsContent>
              <TabsContent value="notes">
                <p className="text-body">« Cuit le 7 mai »</p>
              </TabsContent>
              <TabsContent value="photos">
                <p className="text-body">Trois clichés du dernier service.</p>
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-caption font-medium text-foreground-muted">
              Separator (horizontal + vertical)
            </span>
            <div className="flex flex-col gap-2">
              <span className="text-body">Avant</span>
              <Separator />
              <span className="text-body">Après</span>
            </div>
            <div className="flex h-10 items-center gap-2">
              <span className="text-body">Gauche</span>
              <Separator orientation="vertical" />
              <span className="text-body">Droite</span>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-caption font-medium text-foreground-muted">
              ScrollArea (200px)
            </span>
            <ScrollArea className="h-[200px] rounded-lg border border-border bg-card p-3">
              <ul className="flex flex-col gap-1 text-body">
                {[
                  "Tagliatelles",
                  "Cèpes",
                  "Échalotes",
                  "Crème fraîche épaisse",
                  "Beurre demi-sel",
                  "Persil plat",
                  "Ail",
                  "Vin blanc sec",
                  "Bouillon de volaille",
                  "Parmesan râpé",
                  "Sel de Guérande",
                  "Poivre du moulin",
                  "Huile d'olive vierge extra",
                  "Œufs fermiers",
                  "Citron jaune",
                  "Thym frais",
                  "Romarin",
                  "Laurier",
                  "Muscade",
                  "Piment d'Espelette",
                  "Châtaignes",
                  "Truffe noire (à râper)",
                ].map((item) => (
                  <li key={item}>« {item} »</li>
                ))}
              </ul>
            </ScrollArea>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-caption font-medium text-foreground-muted">
              AlertDialog (destructive)
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="self-start">
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cet élément ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est définitive.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction>Supprimer</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>
    </main>
  );
}
