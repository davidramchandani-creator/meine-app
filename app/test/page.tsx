'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

type Todo = { id: number; title: string; done: boolean };

export default function Page() {
  const [sessionChecked, setSessionChecked] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');

  // Session laden + auf Änderungen reagieren
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setSessionChecked(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setUser(sess?.user ?? null);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMsg(error.message);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setTodos([]);
  }

  async function load() {
    if (!user) return;
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('id', { ascending: false });
    if (error) setMsg(error.message);
    else setTodos((data ?? []) as Todo[]);
  }
  useEffect(() => { if (user) load(); }, [user]);

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !user) return;
    const { error } = await supabase.from('todos').insert({ title, user_id: user.id });
    if (error) setMsg(error.message);
    setTitle('');
    load();
  }

  async function toggle(id: number, done: boolean) {
    if (!user) return;
    const { error } = await supabase
      .from('todos')
      .update({ done: !done })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) setMsg(error.message);
    load();
  }

  if (!sessionChecked) return <main className="p-6">Laden…</main>;

  if (!user) {
    return (
      <main className="max-w-sm mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        <form onSubmit={signIn} className="flex flex-col gap-2">
          <input className="border p-2" type="email" placeholder="E-Mail"
                 value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="border p-2" type="password" placeholder="Passwort"
                 value={password} onChange={e=>setPassword(e.target.value)} />
          <button className="border p-2">Einloggen</button>
        </form>
        {msg && <p className="text-red-600 mt-2">{msg}</p>}
      </main>
    );
  }

  return (
    <main className="max-w-xl mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Todos</h1>
        <button className="text-sm border rounded px-3 py-1" onClick={signOut}>Logout</button>
      </div>

      <form onSubmit={addTodo} className="flex gap-2 mb-6">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Neues Todo…"
          value={title}
          onChange={e=>setTitle(e.target.value)}
        />
        <button className="border rounded px-4 py-2">Add</button>
      </form>

      {msg && <p className="text-red-600 mb-3">{msg}</p>}

      <ul className="space-y-2">
        {todos.map(t => (
          <li key={t.id} className="border rounded px-3 py-2 flex justify-between">
            <span className={t.done ? 'line-through opacity-60' : ''}>{t.title}</span>
            <button className="text-sm border rounded px-2 py-1"
                    onClick={()=>toggle(t.id, t.done)}>
              {t.done ? 'Undo' : 'Done'}
            </button>
          </li>
        ))}
        {todos.length === 0 && <li className="text-sm opacity-60">Noch keine Todos.</li>}
      </ul>
    </main>
  );
}
