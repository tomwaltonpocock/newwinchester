import { ReviewFlow } from "@/components/ReviewFlow";
import { imagePairs } from "@/content/imagePairs";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  return (
    <ReviewFlow
      pairs={imagePairs}
      showImageSources={env.validation.showImageSources}
      turnstileSiteKey={env.turnstile.siteKey}
      urbanScienceUrl={env.urbanScienceUrl}
    />
  );
}
