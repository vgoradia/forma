import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { CONTACT_EMAIL, OPERATOR_NAME } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy — Forma",
  description: "How Forma handles your data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="Last updated: November 2026">
      <LegalSection title="Summary">
        <p>
          {OPERATOR_NAME} operates Forma at shopwithforma.com (&quot;we&quot;, &quot;us&quot;). We collect what we need
          to run product scans, accounts, and Forma Plus. We do not sell or share personal information.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Scans.</strong> Images, links, or text you submit. Guest scan history stays in your browser until
            you sign in or clear it.
          </li>
          <li>
            <strong>Account.</strong> If you sign in with Google, we receive your name, email, and profile photo.
          </li>
          <li>
            <strong>Payments.</strong> If you buy Forma Plus, our payment processor receives your email and payment
            details. We do not store your card number. We store whether your plan is free or Plus.
          </li>
          <li>
            <strong>Shared verdicts.</strong> If you tap Share verdict, we store a public copy of that product verdict
            (name, prices, recommendation, and retailer links). That copy does not include your account, email, user
            id, or uploaded screenshot.
          </li>
          <li>
            <strong>Usage.</strong> Page views and product events, such as a scan or a click on a retailer link.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Who processes data">
        <p>These companies process data to run Forma:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Supabase</strong> — auth and database. Accounts, signed-in scans, and shared verdicts.
          </li>
          <li>
            <strong>Stripe</strong> — payments for Forma Plus.
          </li>
          <li>
            <strong>Anthropic and OpenAI</strong> — scan analysis. They receive the image, link, or text you submit so
            they can identify the product and write the verdict.
          </li>
          <li>
            <strong>Serper</strong> — product search. Queries used to look up retailer listings, prices, and images.
          </li>
          <li>
            <strong>Vercel</strong> — hosting and analytics.
          </li>
          <li>
            <strong>Sentry</strong> — error monitoring, if enabled.
          </li>
          <li>
            <strong>PostHog</strong> — product analytics, if enabled.
          </li>
          <li>
            <strong>An email list</strong> — optional product updates, if enabled. We only add an address when someone
            opts in.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use data">
        <p>
          We use data to identify products, return prices and verdicts, sign you in, bill Forma Plus, keep the site
          working, and prevent abuse. We do not use your scans to advertise other people&apos;s products to you.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and local storage">
        <p>
          Sign-in uses cookies. Supabase Auth sets a session cookie so you stay signed in. Vercel Analytics may set a
          cookie to count visits. If Sentry or PostHog is enabled, those tools may set their own cookies.
        </p>
        <p>
          We use local storage on your device for guest scans, bookmarks, preferences (including email-update and
          sale-estimate toggles), onboarding, and the free monthly scan count. Clearing site data in your browser
          removes that guest history from the device.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep data">
        <p>
          Guest scans stay in local storage until you delete them or clear the browser. Signed-in scans and your
          account stay in our database until you delete the scan history or ask us to delete the account. Shared
          verdict links stay public until we remove them. Stripe keeps payment records as needed for billing, taxes,
          and disputes. Analytics and error logs, when those tools are enabled, follow that provider&apos;s retention.
        </p>
      </LegalSection>

      <LegalSection title="Deleting your account">
        <p>
          Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-forma-primary">
            {CONTACT_EMAIL}
          </a>{" "}
          and ask us to delete your account. We delete the account and the personal information we hold for it within
          30 days, except records we must keep for legal, tax, or security reasons.
        </p>
      </LegalSection>

      <LegalSection title="We do not sell or share personal information">
        <p>
          We do not sell or share personal information. That includes the CCPA meanings of &quot;sell&quot; and
          &quot;share&quot;: we do not sell personal information for money, and we do not share it for cross-context
          behavioral advertising.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Forma is not for children under 13. We do not create accounts for children under 13. If you believe a child
          under 13 has an account, email us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="Affiliate links">
        <p>
          Some outbound retailer links are affiliate links. See the{" "}
          <Link href="/affiliate-disclosure" className="text-forma-primary">
            affiliate disclosure
          </Link>
          . A commission does not change your price.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Privacy questions:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-forma-primary">
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
