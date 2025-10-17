import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabaseServer";
import styles from "./student-dashboard.module.css";
import { PackagePurchase } from "./package/PackagePurchase";
import { getDrivingDistanceKm } from "@/lib/googleMaps";

type PackageView = {
  lessons_total: number | null;
  lessons_used: number | null;
  lessons_left: number | null;
  next_lesson_at: string | null;
};

type ProfileView = {
  lat: number | null;
  lng: number | null;
  first_name: string | null;
};

const PACKAGE_BASE_PRICES: Record<string, number> = {
  "05c6afa6-8a00-4cb9-ba6e-68a59f37a0cc": 60,
  "4ab83713-13e4-4c7c-b403-42d2110fd73e": 55,
};

const BASE_PACKAGES = [
  {
    packageId: "05c6afa6-8a00-4cb9-ba6e-68a59f37a0cc",
    id: "10" as const,
    lessons: 10,
    basePrice: 60,
    title: "10er Paket",
  },
  {
    packageId: "4ab83713-13e4-4c7c-b403-42d2110fd73e",
    id: "20" as const,
    lessons: 20,
    basePrice: 55,
    title: "20er Paket",
  },
];

type ActivePackageDetail = {
  package_id: string | null;
  lessons_total: number | null;
  lessons_used: number | null;
  status: string | null;
  travel_distance_km: number | null;
  travel_fee_per_lesson_chf: number | null;
  packages: {
    name: string | null;
    base_price_chf: number | null;
    price_per_lesson_chf?: number | null;
  } | null;
};

function computeTravelFeeChf(distanceKm: number | null): number | null {
  if (distanceKm == null) {
    return null;
  }
  const overKm = Math.max(distanceKm - 10, 0);
  const fee = Math.ceil(overKm / 7) * 7;
  return fee;
}

export default async function StudentHome() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [{ data: rows }, { data: detail }, { data: profile }] = await Promise.all([
    supabase
      .from("v_student_current_package")
      .select("*")
      .eq("student_id", user.id)
      .limit(1),
    supabase
      .from("student_packages")
      .select(
        "package_id, lessons_total, lessons_used, status, travel_distance_km, travel_fee_per_lesson_chf, packages(name, base_price_chf, price_per_lesson_chf), created_at"
      )
      .eq("student_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("profiles")
      .select("lat, lng, first_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  const currentPackage = (rows?.[0] as PackageView | null) ?? null;
  const total = currentPackage?.lessons_total ?? 0;
  const used = currentPackage?.lessons_used ?? 0;
  const left = currentPackage?.lessons_left ?? 0;
  const progress = total ? Math.round((used / total) * 100) : 0;
  const canBuyNew = left === 0;
  const nextLessonDate = currentPackage?.next_lesson_at
    ? new Date(currentPackage.next_lesson_at)
    : null;

  const pkgDetail = (detail?.[0] as ActivePackageDetail | undefined) ?? null;
  const profileData = (profile as ProfileView | null) ?? null;
  const travelFee = pkgDetail?.travel_fee_per_lesson_chf ?? 0;
  const basePriceFromDb =
    pkgDetail?.packages?.base_price_chf ??
    pkgDetail?.packages?.price_per_lesson_chf ??
    null;
  const fallbackBase =
    pkgDetail?.package_id && PACKAGE_BASE_PRICES[pkgDetail.package_id]
      ? PACKAGE_BASE_PRICES[pkgDetail.package_id]
      : null;
  const basePrice = basePriceFromDb ?? fallbackBase;
  const pricePerLesson =
    basePrice != null ? Number(basePrice) + Number(travelFee ?? 0) : null;
  const travelDistance =
    pkgDetail?.travel_distance_km != null
      ? Number(pkgDetail.travel_distance_km)
      : null;
  const packageStatusRaw = pkgDetail?.status ?? (total ? "active" : "inactive");
  const packageStatus =
    packageStatusRaw === "active"
      ? "Aktiv"
      : packageStatusRaw === "completed"
        ? "Abgeschlossen"
        : packageStatusRaw === "inactive"
          ? "Inaktiv"
          : packageStatusRaw ?? "";

  const metaHints: string[] = [];
  if (pricePerLesson != null) {
    metaHints.push(`Preis pro Lektion · CHF ${pricePerLesson.toFixed(2)}`);
  }
  if (travelDistance != null) {
    metaHints.push(`Distanz (Snapshot) · ${travelDistance.toFixed(1)} km`);
  }

  const { data: adminSettings } = await supabase
    .from("admin_settings")
    .select("start_lat, start_lng")
    .eq("id", 1)
    .maybeSingle();

  let estimatedDistance: number | null = null;
  let estimatedTravelFee: number | null = null;

  if (
    adminSettings?.start_lat != null &&
    adminSettings.start_lng != null &&
    profileData?.lat != null &&
    profileData.lng != null
  ) {
    estimatedDistance = await getDrivingDistanceKm(
      { lat: Number(adminSettings.start_lat), lng: Number(adminSettings.start_lng) },
      { lat: Number(profileData.lat), lng: Number(profileData.lng) }
    );
    estimatedTravelFee = computeTravelFeeChf(estimatedDistance);
  }

  const packageOptions = BASE_PACKAGES.map((pkg) => {
    const totalPrice = pkg.basePrice * pkg.lessons;
    const perLessonWithTravel =
      estimatedTravelFee != null
        ? pkg.basePrice + estimatedTravelFee
        : pkg.basePrice;
    const totalPriceWithTravel = perLessonWithTravel * pkg.lessons;

    return {
      id: pkg.id,
      title: pkg.title,
      description:
        estimatedTravelFee != null
          ? `${pkg.lessons} Lektionen · CHF ${totalPriceWithTravel.toFixed(
              0
            )} total (inkl. Weg)`
          : `${pkg.lessons} Lektionen · CHF ${totalPrice.toFixed(0)} total`,
      priceLabel: `CHF ${perLessonWithTravel.toFixed(2)}`,
    };
  });

  const rawName =
    profileData?.first_name?.trim() ||
    (typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : "") ||
    (typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : "");
  const greetingName =
    rawName && rawName.length > 0
      ? rawName
      : user.email?.split("@")[0] ?? "Schüler";

  return (
    <div className={styles.container}>
      <header className={styles.greeting}>
        <h1 className={styles.greetingTitle}>Hallo {greetingName}</h1>
      </header>
      <div className={styles.infoGrid}>
        <section className={`${styles.infoCard} ${styles.packageOverview}`}>
          <div className={styles.packageHeader}>
            <span className={styles.packageIcon} aria-hidden />
            <div className={styles.packageHeading}>
              <h2 className={styles.packageTitle}>
                {total ? `${total}er Paket` : "Kein aktives Paket"}
              </h2>
              <p className={styles.packageSubline}>
                {total
                  ? `Noch ${left} Lektion${left === 1 ? "" : "en"} verfügbar`
                  : "Starte mit einem Paket deiner Wahl."}
              </p>
            </div>
            {total ? (
              <span className={styles.packageBadge}>{packageStatus}</span>
            ) : null}
          </div>

          {total ? (
            <>
              <div className={styles.packageMetaRow}>
                <span className={styles.metaLabel}>Verbrauchte Lektionen</span>
                <span className={styles.metaValue}>
                  {used} von {total}
                </span>
              </div>

              <div className={styles.progressBlock}>
                <div className={styles.progressLabel}>
                  <span>Fortschritt</span>
                  <span className={styles.progressValueText}>
                    {used} von {total}
                  </span>
                </div>
                <div className={styles.progressTrack}>
                  <div
                    className={styles.progressValue}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{left}</div>
                  <div className={styles.statLabel}>Lektionen verfügbar</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statValue}>{used}</div>
                  <div className={styles.statLabel}>Lektionen gebucht</div>
                </div>
              </div>

              {metaHints.length ? (
                <div className={styles.metaHints}>
                  {metaHints.map((hint) => (
                    <span key={hint} className={styles.metaHint}>
                      {hint}
                    </span>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className={styles.emptyState}>
              Du hast kein aktives Paket. Wähle ein Paket, um loszulegen.
            </p>
          )}
        </section>

        <section className={styles.infoCard}>
          <h3 className={styles.cardTitle}>Nächste Schritte</h3>
          {total ? (
            nextLessonDate ? (
              <p className={styles.nextLesson}>
                Nächste Lektion:{" "}
                {nextLessonDate.toLocaleString("de-CH", {
                  weekday: "short",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            ) : (
              <p className={styles.mutedText}>Keine kommende Lektion geplant.</p>
            )
          ) : (
            <p className={styles.mutedText}>
              Buche eine Lektion, sobald dein Paket aktiv ist.
            </p>
          )}

          <div className={styles.actionButtons}>
            <Link className={styles.bookButton} href="/app/student/request">
              Nächste Lektion buchen
            </Link>
            <Link
              className={styles.secondaryButton}
              href="/app/student/suggestions"
            >
              Vorschläge ansehen
            </Link>
            <Link className={styles.secondaryButton} href="/app/student/profile">
              Zahlungen &amp; Profil
            </Link>
          </div>
        </section>
      </div>

      <section className={`${styles.infoCard} ${styles.purchaseCard}`}>
        <div className={styles.purchaseHeader}>
          <h3 className={styles.cardTitle}>Neues Paket</h3>
          <p className={styles.purchaseSubline}>
            {canBuyNew
              ? "Triff deine Wahl für das nächste Paket."
              : "Neue Pakete sind verfügbar, sobald alle Lektionen verbraucht sind."}
          </p>
        </div>

        {!canBuyNew ? (
          <div className={styles.callout}>
            <p className={styles.calloutTitle}>Paket noch aktiv</p>
            <p className={styles.calloutText}>
              Du hast noch {left} Lektion(en). Neue Pakete können gebucht
              werden, wenn alle Lektionen verbraucht sind.
            </p>
          </div>
        ) : null}

        <PackagePurchase options={packageOptions} disabled={!canBuyNew} />
      </section>
    </div>
  );
}
