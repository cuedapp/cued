"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, ChevronRight, List } from "lucide-react";
import { AppDialog } from "@/components/app-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  canFinishSetupWizard,
  getNextSetupWizardStep,
  getPreviousSetupWizardStep,
  getSetupWizardStepStates,
  isSetupWizardStepRequired,
  parseSetupWizardStep,
  setupWizardStepIds,
  type SetupWizardProviderId,
  type SetupWizardSnapshot,
} from "@/lib/setup-wizard";

interface WizardNavigationContextValue {
  dirtyRef: MutableRefObject<boolean>;
  markDirty: () => void;
  clearDirty: () => void;
  navigate: (href: string) => void;
  recordProvider: (provider: SetupWizardProviderId) => void;
  recordLibraries: () => void;
}

const WizardNavigationContext = createContext<WizardNavigationContextValue | null>(null);

export function useDirtyRef() {
  const value = useContext(WizardNavigationContext);
  if (!value) throw new Error("useDirtyRef must be used inside WizardShell");
  return value;
}

export function WizardShell({
  locale,
  snapshot,
  children,
}: {
  locale: string;
  snapshot: SetupWizardSnapshot;
  children: ReactNode;
}) {
  const t = useTranslations("Wizard");
  const pathname = usePathname();
  const router = useRouter();
  const dirtyRef = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string>();
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshot);
  const currentStep = parseSetupWizardStep(pathname.split("/").at(-1)) ?? "jellyfin";
  const states = getSetupWizardStepStates(currentSnapshot);

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);
  const clearDirty = useCallback(() => {
    dirtyRef.current = false;
  }, []);
  const navigate = useCallback(
    (href: string) => {
      if (dirtyRef.current) setPendingHref(href);
      else router.push(href);
    },
    [router],
  );
  const recordProvider = useCallback((provider: SetupWizardProviderId) => {
    setCurrentSnapshot((current) => ({
      ...current,
      providers: { ...current.providers, [provider]: true },
      healthy: { ...current.healthy, [provider]: true },
    }));
  }, []);
  const recordLibraries = useCallback(() => {
    setCurrentSnapshot((current) => ({ ...current, jellyfinLibrariesSelected: true }));
  }, []);
  const context = useMemo(
    () => ({ dirtyRef, markDirty, clearDirty, navigate, recordProvider, recordLibraries }),
    [clearDirty, markDirty, navigate, recordLibraries, recordProvider],
  );

  useEffect(() => {
    dirtyRef.current = false;
    headingRef.current?.focus();
  }, [pathname]);

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  const next = getNextSetupWizardStep(currentStep);
  const previous = getPreviousSetupWizardStep(currentStep);
  const review = currentStep === "review";
  const hrefFor = (step: string) => `/${locale}/setup/${step}`;
  function saveAndContinue() {
    const forms = Array.from(document.querySelectorAll("form"));
    const form = currentStep === "jellyfin" ? forms.at(-1) : forms[0];
    const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    if (submit) submit.click();
    else if (form) form.requestSubmit();
    else if (next) navigate(hrefFor(next));
  }

  function confirmNavigation() {
    if (!pendingHref) return;
    clearDirty();
    const href = pendingHref;
    setPendingHref(undefined);
    router.push(href);
  }

  return (
    <WizardNavigationContext.Provider value={context}>
      <div className="min-h-dvh bg-background pb-24">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:hidden">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("stepper.progress", {
                  current: setupWizardStepIds.indexOf(currentStep) + 1,
                  total: setupWizardStepIds.length,
                })}
              </p>
              <p className="font-semibold">{t(`steps.${currentStep}.title`)}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setStepsOpen(true)}>
              <List className="size-4" />
              {t("buttons.steps")}
            </Button>
            <AppDialog isOpen={stepsOpen} onOpenChange={setStepsOpen} label={t("stepper.label")} className="max-w-sm">
              <div className="p-6">
                <h2 className="text-lg font-semibold">{t("stepper.label")}</h2>
                <StepList
                  currentStep={currentStep}
                  states={states}
                  onSelect={(step) => {
                    setStepsOpen(false);
                    navigate(hrefFor(step));
                  }}
                  mobile
                />
                <div className="mt-5 flex justify-end">
                  <Button variant="outline" onClick={() => setStepsOpen(false)}>
                    {t("buttons.close")}
                  </Button>
                </div>
              </div>
            </AppDialog>
          </div>
          <nav className="mx-auto hidden max-w-6xl px-4 py-4 md:block" aria-label={t("stepper.label")}>
            <StepList currentStep={currentStep} states={states} onSelect={(step) => navigate(hrefFor(step))} />
          </nav>
        </header>

        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <h1 ref={headingRef} tabIndex={-1} className="text-3xl font-bold outline-none">
            {t(`steps.${currentStep}.title`)}
          </h1>
          <p className="mt-2 text-muted-foreground">{t(`steps.${currentStep}.description`)}</p>
          <div aria-live="polite" className="sr-only">
            {t("stepper.announcement", { step: t(`steps.${currentStep}.title`) })}
          </div>
          <div className="mt-8">{children}</div>
        </main>

        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4">
            <Button variant="ghost" disabled={!previous} onClick={() => previous && navigate(hrefFor(previous))}>
              <ChevronLeft className="size-4" />
              {t("buttons.back")}
            </Button>
            <div className="flex items-center gap-2">
              {!review ? (
                <>
                  {!isSetupWizardStepRequired(currentStep) ? (
                    <Button variant="ghost" onClick={() => next && navigate(hrefFor(next))}>
                      {t("buttons.skip")}
                    </Button>
                  ) : null}
                  <Button onClick={saveAndContinue}>
                    {t("buttons.continue")}
                    <ChevronRight className="size-4" />
                  </Button>
                </>
              ) : (
                <Button disabled={!canFinishSetupWizard(currentSnapshot)} onClick={() => navigate(`/${locale}/login`)}>
                  {t("buttons.finish")}
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </footer>

        <AppDialog
          isOpen={Boolean(pendingHref)}
          onOpenChange={(open) => !open && setPendingHref(undefined)}
          label={t("dialog.title")}
        >
          <div className="p-6">
            <h2 className="text-lg font-semibold">{t("dialog.title")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("dialog.description")}</p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setPendingHref(undefined)}>
                {t("dialog.stay")}
              </Button>
              <Button variant="destructive" onClick={confirmNavigation}>
                {t("dialog.leave")}
              </Button>
            </div>
          </div>
        </AppDialog>
      </div>
    </WizardNavigationContext.Provider>
  );
}
function StepList({
  currentStep,
  states,
  onSelect,
  mobile = false,
}: {
  currentStep: (typeof setupWizardStepIds)[number];
  states: ReturnType<typeof getSetupWizardStepStates>;
  onSelect: (step: (typeof setupWizardStepIds)[number]) => void;
  mobile?: boolean;
}) {
  const t = useTranslations("Wizard");
  return (
    <ol className={cn("flex items-start", mobile ? "mt-4 flex-col gap-2" : "justify-between gap-2")}>
      {setupWizardStepIds.map((step, index) => {
        const active = step === currentStep;
        const done = states[step] === "done";
        return (
          <li key={step} className={cn("flex", mobile ? "w-full" : "min-w-0 flex-1 items-center")}>
            <button
              type="button"
              aria-current={active ? "step" : undefined}
              onClick={() => onSelect(step)}
              className={cn(
                "flex items-center gap-2 rounded-lg p-2 text-left",
                mobile && "w-full",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
                  active && "border-primary bg-primary text-primary-foreground",
                  !active && done && "border-emerald-600 bg-emerald-600 text-white",
                )}
              >
                {done && !active ? <Check className="size-4" /> : index + 1}
              </span>
              <span className={cn("text-sm", !mobile && "hidden lg:inline")}>{t(`steps.${step}.title`)}</span>
            </button>
            {!mobile && index < setupWizardStepIds.length - 1 ? (
              <span className="h-px min-w-3 flex-1 bg-border" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
