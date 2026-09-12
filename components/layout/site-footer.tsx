import Link from "next/link";

import { Logo } from "@/components/logo";

const COMPANY_LINKS = ["About", "Careers", "Press", "Contact"];
const HELP_LINKS = ["Help Center", "Guides", "Privacy Policy", "Terms of Service"];
// lucide-react no longer ships trademarked brand icons, so social links use
// short text initials in a circular badge instead of platform logos.
const SOCIAL_LINKS = [
  { label: "X", initial: "X" },
  { label: "LinkedIn", initial: "in" },
  { label: "Instagram", initial: "IG" },
  { label: "YouTube", initial: "YT" },
];

function FooterColumn({ title, links }: { title: string; links: string[] }) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-sm font-semibold text-foreground-inverted">{title}</h4>
      <ul className="flex flex-col gap-2">
        {links.map((link) => (
          <li key={link}>
            <Link
              href="#"
              className="text-sm text-muted-foreground-inverted transition-colors hover:text-foreground-inverted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {link}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="w-full bg-surface-inverted">
      <div className="container-biasly grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Logo inverted />
          <p className="text-sm text-muted-foreground-inverted">
            Balanced news coverage, powered by AI.
          </p>
        </div>

        <FooterColumn title="Company" links={COMPANY_LINKS} />
        <FooterColumn title="Help" links={HELP_LINKS} />

        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-semibold text-foreground-inverted">Connect</h4>
          <div className="flex items-center gap-3">
            {SOCIAL_LINKS.map(({ label, initial }) => (
              <Link
                key={label}
                href="#"
                aria-label={label}
                className="flex size-8 items-center justify-center rounded-full text-xs font-semibold text-muted-foreground-inverted transition-colors hover:bg-white/10 hover:text-foreground-inverted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {initial}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-biasly py-6 text-xs text-muted-foreground-inverted">
          © {new Date().getFullYear()} Bias Lens. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
