import { SignIn } from "@clerk/nextjs";

import { Logo } from "@/components/logo";

export default function SignInPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 py-16">
      <Logo />
      <SignIn />
    </main>
  );
}
