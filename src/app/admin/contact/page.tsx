import { getServiceClient } from "@/lib/supabase";
import { decrypt } from "@/lib/crypto";
import { StatusButton } from "./StatusButton";

export const dynamic = "force-dynamic";

type Search = { status?: string; category?: string };

export default async function ContactQueuePage({ searchParams }: { searchParams: Search }) {
  const supabase = getServiceClient();
  let q = supabase
    .from("contact_messages")
    .select("id, created_at, category, name, email_ciphertext, message, status")
    .order("created_at", { ascending: false });
  if (searchParams.status) q = q.eq("status", searchParams.status);
  if (searchParams.category) q = q.eq("category", searchParams.category);
  const { data } = await q;

  const rows = await Promise.all(
    (data ?? []).map(async (m) => ({
      ...m,
      email: m.email_ciphertext ? await decrypt(m.email_ciphertext).catch(() => null) : null,
    }))
  );

  return (
    <div>
      <h1 className="font-serif">Contact queue</h1>
      <p className="mt-2 text-sm text-stone-600">
        Filter:{" "}
        <a href="?status=new">new</a> · <a href="?status=needs_reply">needs_reply</a> ·{" "}
        <a href="?status=replied">replied</a> · <a href="?status=archived">archived</a> ·{" "}
        <a href="?">all</a>
      </p>

      <ul className="mt-6 space-y-4">
        {rows.map((m) => (
          <li key={m.id} className="card">
            <div className="flex justify-between flex-wrap gap-2 text-xs text-stone-600">
              <span>{new Date(m.created_at).toLocaleString("en-GB")}</span>
              <span>{m.category} · {m.status}</span>
            </div>
            <p className="mt-2 text-sm">
              <strong>{m.name || "(no name)"}</strong>{" "}
              {m.email ? <span className="text-stone-700">&lt;{m.email}&gt;</span> : <span className="text-stone-500">(no email)</span>}
            </p>
            <p className="mt-3 whitespace-pre-wrap">{m.message}</p>
            <div className="mt-3 flex gap-2">
              <StatusButton id={m.id} status="needs_reply" />
              <StatusButton id={m.id} status="replied" />
              <StatusButton id={m.id} status="archived" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
