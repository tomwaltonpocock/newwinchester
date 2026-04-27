import { ContactForm } from "@/components/ContactForm";
import { siteCopy } from "@/content/siteCopy";
import { contactCategories } from "@/content/contacts";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <div>
      <h1 className="font-serif">{siteCopy.contact.title}</h1>
      <p className="mt-3 text-stone-700 max-w-prose2">{siteCopy.contact.body}</p>
      <div className="mt-8 max-w-prose2">
        <ContactForm
          categories={contactCategories}
          turnstileSiteKey={env.turnstile.siteKey}
        />
      </div>
    </div>
  );
}
