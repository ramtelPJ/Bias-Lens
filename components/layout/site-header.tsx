"use client";

import { useState } from "react";
import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/", active: true, badge: false },
  { label: "For You", href: "#", active: false, badge: true },
  { label: "Local", href: "#", active: false, badge: false },
  { label: "Blindspot", href: "#", active: false, badge: false },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="w-full border-b border-border bg-background">
      <div className="container-biasly flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-9 items-center justify-center rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:hidden"
          >
            {menuOpen ? (
              <X className="size-5" strokeWidth={2} />
            ) : (
              <Menu className="size-5" strokeWidth={2} />
            )}
          </button>

          <Link href="/" className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={cn(
                  "relative pb-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  link.active
                    ? "border-b-2 border-foreground text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
                {link.badge && (
                  <span className="absolute -right-2 top-0 size-1.5 rounded-full bg-bias-left" />
                )}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Button variant="primary">Subscribe</Button>
          <Show when="signed-in">
            <UserButton />
          </Show>
          <Show when="signed-out">
            <SignInButton>
              <Button variant="secondary">Login</Button>
            </SignInButton>
          </Show>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 lg:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "relative rounded-md px-2 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                link.active ? "text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              {link.label}
              {link.badge && (
                <span className="ml-1.5 inline-block size-1.5 rounded-full bg-bias-left align-middle" />
              )}
            </Link>
          ))}
          <div className="mt-2 flex items-center gap-3 px-2 sm:hidden">
            <Button variant="primary" className="flex-1">
              Subscribe
            </Button>
            <Show when="signed-in">
              <UserButton />
            </Show>
            <Show when="signed-out">
              <SignInButton>
                <Button variant="secondary" className="flex-1">
                  Login
                </Button>
              </SignInButton>
            </Show>
          </div>
        </nav>
      )}
    </header>
  );
}
