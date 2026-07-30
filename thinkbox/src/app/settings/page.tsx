import { db } from "@/lib/supabase";
import { getAccount } from "@/lib/google";
import { VoiceButton } from "@/components/VoiceButton";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  let account: { email: string } | null = null;
  let voice: { samples_analyzed: number; built_at: string } | null = null;
  let envReady = true;
  try {
    account = await getAccount();
    const { data } = await db().from("voice_profile").select("samples_analyzed, built_at").eq("id", 1).maybeSingle();
    voice = data;
  } catch {
    envReady = false;
  }

  return (
    <main>
      <h1 className="font-serif text-2xl mb-6">Settings</h1>

      {!envReady && (
        <div className="mb-6 rounded-xl border border-amber/40 bg-amberSoft p-4 text-sm">
          <p className="font-medium mb-1">Environment not configured.</p>
          <p className="text-muted">
            Copy <code>.env.example</code> to <code>.env.local</code> and fill in Supabase, Google and Anthropic keys, then
            restart. Full instructions in the README.
          </p>
        </div>
      )}

      <section className="mb-8 rounded-xl border border-hairline/60 bg-card p-4">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Google account</h2>
        {account ? (
          <div className="flex items-center justify-between">
            <p className="text-sm">
              Connected as <span className="font-medium">{account.email}</span>
            </p>
            <SyncButton />
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted mb-3">Connect the Gmail account Thinkbox should manage.</p>
            <a href="/api/auth/google" className="inline-block rounded-lg bg-accent px-4 py-2 text-sm text-white">
              Connect Google
            </a>
          </div>
        )}
      </section>

      <section className="mb-8 rounded-xl border border-hairline/60 bg-card p-4">
        <h2 className="text-sm uppercase tracking-wide text-muted mb-2">Your voice</h2>
        <p className="text-sm text-muted mb-3">
          {voice?.built_at
            ? `Style guide distilled from ${voice.samples_analyzed} sent emails on ${new Date(voice.built_at).toLocaleDateString("en-GB")}. Rebuild after your writing habits change.`
            : "Not built yet. Thinkbox reads your sent mail and distils a style guide so drafts sound like you."}
        </p>
        <VoiceButton built={!!voice?.built_at} />
      </section>

      <section className="rounded-xl border border-hairline/60 bg-card p-4 text-sm text-muted leading-relaxed">
        <h2 className="text-sm uppercase tracking-wide mb-2">How syncing works</h2>
        <p>
          A Vercel cron hits <code>/api/sync</code> every 15 minutes: new inbox mail is triaged into decisions, FYIs,
          signals and noise; contacts and warmth update; nothing is ever deleted, and nothing is sent without you
          pressing Send.
        </p>
      </section>
    </main>
  );
}
