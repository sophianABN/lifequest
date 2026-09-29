"use client";

import * as React from "react";
import { toast } from "sonner";
import { BellRing } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/misc";
import { useMounted } from "@/hooks/use-mounted";
import { haptic, isNativeApp } from "@/lib/native";

/** Identifiant fixe : reprogrammer remplace le rappel au lieu d'en ajouter un. */
const REMINDER_ID = 2501;
const DEFAULT_TIME = "20:00";

/**
 * Rappel quotidien — application mobile uniquement.
 *
 * Une notification locale, programmée sur l'appareil : aucun serveur de push,
 * aucun jeton à stocker, et elle fonctionne hors connexion. Elle ouvre le
 * journal, le geste quotidien de l'application.
 *
 * L'état n'est stocké nulle part ailleurs que dans le système : on relit la
 * notification programmée pour savoir si le rappel est actif et à quelle heure.
 */
export function DailyReminderCard() {
  const mounted = useMounted();
  if (!mounted || !isNativeApp()) return null;
  return <DailyReminder />;
}

function DailyReminder() {
  const [enabled, setEnabled] = React.useState(false);
  const [time, setTime] = React.useState(DEFAULT_TIME);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    void (async () => {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      const { notifications } = await LocalNotifications.getPending();
      const pending = notifications.find((n) => n.id === REMINDER_ID);
      if (pending) {
        setEnabled(true);
        if (typeof pending.extra?.time === "string") setTime(pending.extra.time);
      }
      setReady(true);
    })();
  }, []);

  const schedule = async (at: string) => {
    const { LocalNotifications } = await import("@capacitor/local-notifications");

    let { display } = await LocalNotifications.checkPermissions();
    if (display !== "granted") ({ display } = await LocalNotifications.requestPermissions());
    if (display !== "granted") {
      toast.error("Notifications désactivées", {
        description: "Autorise LifeQuest dans les réglages de ton téléphone pour recevoir le rappel.",
      });
      return false;
    }

    const [hour, minute] = at.split(":").map(Number);
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_ID,
          title: "Ta quête t'attend ✨",
          body: "Deux minutes pour avancer d'une étape ou raconter ta journée.",
          schedule: { on: { hour, minute }, allowWhileIdle: true },
          // Une heure approximative suffit : pas d'alarme exacte, donc aucun
          // réglage système supplémentaire à demander sur Android.
          isExactNotification: false,
          extra: { url: "/journal", time: at },
        },
      ],
    });
    return true;
  };

  const toggle = async (next: boolean) => {
    void haptic("selection");
    if (next) {
      const scheduled = await schedule(time);
      setEnabled(scheduled);
      if (scheduled) toast.success(`Rappel programmé chaque jour à ${time.replace(":", " h ")}.`);
    } else {
      const { LocalNotifications } = await import("@capacitor/local-notifications");
      await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] });
      setEnabled(false);
    }
  };

  const changeTime = async (next: string) => {
    if (!next) return;
    setTime(next);
    if (enabled) await schedule(next);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="size-5 text-blush-500" /> Rappel quotidien
        </CardTitle>
        <CardDescription>
          Une notification chaque jour pour garder ta série — elle ouvre ton journal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="daily-reminder">Me le rappeler chaque jour</Label>
          <Switch id="daily-reminder" checked={enabled} disabled={!ready} onCheckedChange={toggle} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="daily-reminder-time" className={enabled ? undefined : "text-muted-foreground"}>
            Heure du rappel
          </Label>
          <Input
            id="daily-reminder-time"
            type="time"
            value={time}
            disabled={!ready || !enabled}
            onChange={(e) => void changeTime(e.target.value)}
            className="w-32 text-base"
          />
        </div>
      </CardContent>
    </Card>
  );
}
