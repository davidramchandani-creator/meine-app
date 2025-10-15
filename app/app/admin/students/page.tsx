export const dynamic = "force-dynamic";

import { supabaseService } from "@/lib/supabaseService";
import { StudentsOverview } from "./StudentsOverview";

const PACKAGE_BASE_PRICES: Record<string, number> = {
  "05c6afa6-8a00-4cb9-ba6e-68a59f37a0cc": 60,
  "4ab83713-13e4-4c7c-b403-42d2110fd73e": 55,
};

type StudentRow = {
  id: string;
  full_name: string | null;
  email: string | null;
};

type ActivePackageRow = {
  student_id: string;
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

type PackageSummaryRow = {
  student_id: string;
  lessons_left: number | null;
  next_lesson_at: string | null;
};

export type StudentOverviewCard = {
  id: string;
  name: string;
  email: string;
  creditsLeft: number;
  creditsUsed: number;
  creditsTotal: number;
  statusLabel: string;
  nextLesson: string;
  pricePerLessonLabel: string | null;
  travelFeeLabel: string | null;
  travelDistanceLabel: string | null;
};

export default async function AdminStudentsPage() {
  const [{ data: studentRows }, { data: activePackages }, { data: summaries }] =
    await Promise.all([
      supabaseService
        .from("profiles")
        .select("id, full_name, email")
        .eq("role", "student")
        .order("full_name", { ascending: true })
        .returns<StudentRow[]>(),
      supabaseService
        .from("student_packages")
        .select(
          "student_id, package_id, lessons_total, lessons_used, status, travel_distance_km, travel_fee_per_lesson_chf, packages(name, base_price_chf, price_per_lesson_chf), created_at"
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .returns<ActivePackageRow[]>(),
      supabaseService
        .from("v_student_current_package")
        .select("student_id, lessons_left, next_lesson_at")
        .returns<PackageSummaryRow[]>(),
    ]);

  const packageByStudent = new Map<string, ActivePackageRow>();
  activePackages?.forEach((pkg) => {
    if (!packageByStudent.has(pkg.student_id)) {
      packageByStudent.set(pkg.student_id, pkg);
    }
  });

  const summaryByStudent = new Map<string, PackageSummaryRow>();
  summaries?.forEach((summary) => {
    summaryByStudent.set(summary.student_id, summary);
  });

  const students: StudentOverviewCard[] =
    studentRows?.map((student) => {
      const pkg = packageByStudent.get(student.id);
      const summary = summaryByStudent.get(student.id);

      const creditsTotal = pkg?.lessons_total ?? 0;
      const creditsUsed = pkg?.lessons_used ?? 0;
      const creditsLeft =
        summary?.lessons_left ?? Math.max(creditsTotal - creditsUsed, 0);
      const statusLabel = (() => {
        switch (pkg?.status) {
          case "active":
            return "Aktiv";
          case "completed":
            return "Abgeschlossen";
          case "inactive":
            return "Inaktiv";
          default:
            return "Kein Paket";
        }
      })();

      const nextLesson = summary?.next_lesson_at
        ? new Date(summary.next_lesson_at).toLocaleString("de-CH", {
            weekday: "short",
            day: "numeric",
            month: "long",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Keine Lektion geplant";

      const basePriceFromDb =
        pkg?.packages?.base_price_chf ??
        pkg?.packages?.price_per_lesson_chf ??
        null;
      const fallbackBase =
        pkg?.package_id && PACKAGE_BASE_PRICES[pkg.package_id]
          ? PACKAGE_BASE_PRICES[pkg.package_id]
          : null;
      const basePrice = basePriceFromDb ?? fallbackBase;

      const travelFee =
        pkg?.travel_fee_per_lesson_chf != null
          ? Number(pkg.travel_fee_per_lesson_chf)
          : null;
      const travelDistance =
        pkg?.travel_distance_km != null ? Number(pkg.travel_distance_km) : null;

      const pricePerLesson =
        basePrice != null
          ? Number(basePrice) + Number(travelFee ?? 0)
          : null;

      return {
        id: student.id,
        name: student.full_name?.trim() || "Unbenannter Schüler",
        email: student.email ?? "Keine E-Mail hinterlegt",
        creditsLeft,
        creditsUsed,
        creditsTotal,
        statusLabel,
        nextLesson,
        pricePerLessonLabel:
          pricePerLesson != null
            ? `CHF ${pricePerLesson.toFixed(2)} pro Lektion`
            : null,
        travelFeeLabel:
          travelFee != null
            ? `Wegkosten: CHF ${travelFee.toFixed(2)}`
            : null,
        travelDistanceLabel:
          travelDistance != null
            ? `Distanz (Snapshot): ${travelDistance.toFixed(1)} km`
            : null,
      };
    }) ?? [];

  return <StudentsOverview students={students} />;
}
