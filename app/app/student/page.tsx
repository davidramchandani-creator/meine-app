import { createSupabaseServer } from '@/lib/supabaseServer'
import Link from 'next/link'

export default async function StudentHome() {
  const supabase = await createSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  // aktuelles Paket
  const { data: rows } = await supabase
    .from('v_student_current_package')
    .select('*')
    .eq('student_id', user!.id)
    .limit(1)

  const p = rows?.[0] ?? null
  const total = p?.lessons_total ?? 0
  const used  = p?.lessons_used  ?? 0
  const left  = p?.lessons_left  ?? 0
  const progress = total ? Math.round((used / total) * 100) : 0
  const canBuyNew = left === 0

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6 border rounded-2xl p-6 bg-white">
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{total ? `${total}er Paket` : 'Kein aktives Paket'}</h2>
          {total ? (
            <>
              <div className="text-sm text-gray-600 mt-1">
                Verbraucht: {used} von {total}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded mt-2">
                <div className="h-2 rounded" style={{ width: `${progress}%`, background: '#1f2937' }} />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{left}</div>
                  <div className="text-sm text-gray-600">Lektionen verfügbar</div>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold">{used}</div>
                  <div className="text-sm text-gray-600">Lektionen gebucht</div>
                </div>
              </div>

              <div className="mt-4">
                <Link
                  href="/app/student/request"
                  className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-gray-900 text-white"
                >
                  Nächste Lektion buchen
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-2 text-gray-700">Du hast kein aktives Paket.</div>
          )}
        </div>

        {/* rechte Spalte: neues Paket buchen (disabled wenn aktiv) */}
        <div className="w-[320px]">
          {!canBuyNew ? (
            <div className="border rounded-xl p-4 bg-yellow-50 text-yellow-900">
              <div className="font-medium mb-1">Paket noch aktiv</div>
              <div className="text-sm">
                Du hast noch {left} Lektion(en). Neue Pakete können gebucht werden, wenn alle Lektionen verbraucht sind.
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <PackageOption name="10er Paket" price="CHF 60" disabled={false} href="/app/student/packages/10" />
              <PackageOption name="20er Paket" price="CHF 55" disabled={false} href="/app/student/packages/20" />
              <PackageOption name="Einzellektion" price="CHF 70" disabled={false} href="/app/student/packages/1" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PackageOption({ name, price, disabled, href }: { name: string; price: string; disabled?: boolean; href: string }) {
  const className = disabled
    ? 'block opacity-50 pointer-events-none border rounded-xl p-4 bg-gray-50'
    : 'block border rounded-xl p-4 hover:bg-gray-50'
  return (
    <a className={className} href={href}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{name}</div>
          <div className="text-sm text-gray-500">ohne Wegkosten</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">{price}</div>
          <div className="text-xs text-gray-500">pro Lektion</div>
        </div>
      </div>
    </a>
  )
}
