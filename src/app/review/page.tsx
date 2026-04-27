import { ReviewFlow } from "@/components/ReviewFlow";
import { aspects } from "@/content/aspects";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  if (aspects.length === 0) {
    return (
      <div className="max-w-prose2">
        <h1 className="font-serif">No aspects configured yet</h1>
        <p className="mt-3 text-stone-700">
          Drop image files into <code>public/aspects/</code> using the
          naming convention <code>aspect-N-K.png</code> (K=0 developer, K=1–3
          alternatives) and reload.
        </p>
      </div>
    );
  }
  return (
    <ReviewFlow
      aspects={aspects}
      turnstileSiteKey={env.turnstile.siteKey}
      urbanScienceUrl={env.urbanScienceUrl}
    />
  );
}
