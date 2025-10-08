'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Page() {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const urlOk = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
      const keyOk = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase.auth.getSession();
      setInfo({ urlOk, keyOk, loggedIn: !!session });
    })();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-2">ENV Check</h1>
      <pre>{JSON.stringify(info, null, 2)}</pre>
      <p className="mt-2 text-sm opacity-75">Erwartet: {"{ urlOk: true, keyOk: true, loggedIn: false }"}</p>
    </main>
  );
}
