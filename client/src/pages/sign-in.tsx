import { SignIn } from "@clerk/clerk-react";
import { Link } from "wouter";
import { BarChart2 } from "lucide-react";
import { CLERK_ENABLED } from "@/lib/clerk";

// Shared Newsprint appearance overrides for Clerk's themable components:
// zero radius, ink borders, Inter font, black primary instead of Clerk purple.
const newsprintAppearance = {
  variables: {
    colorPrimary: "#111111",
    colorText: "#111111",
    colorTextOnPrimaryBackground: "#F9F9F7",
    colorBackground: "#F9F9F7",
    colorInputBackground: "transparent",
    colorInputText: "#111111",
    fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
    borderRadius: "0px",
  },
  elements: {
    card: "border border-[#111111] shadow-none bg-[#F9F9F7]",
    headerTitle: "font-serif text-2xl font-bold text-[#111111]",
    headerSubtitle: "font-sans text-[#525252]",
    formButtonPrimary:
      "bg-[#111111] hover:bg-[#F9F9F7] hover:text-[#111111] border border-[#111111] uppercase tracking-widest text-xs font-semibold shadow-none",
    formFieldInput: "border-0 border-b-2 border-[#111111] rounded-none bg-transparent font-mono",
    footerActionLink: "text-[#111111] underline decoration-[#CC0000] decoration-2",
    socialButtonsBlockButton: "border border-[#111111] rounded-none shadow-none",
    dividerLine: "bg-[#111111]",
    identityPreviewEditButton: "text-[#CC0000]",
  },
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 newsprint-texture">
      <Link href="/" className="flex items-center gap-3 mb-8">
        <div className="h-9 w-9 bg-foreground flex items-center justify-center shrink-0">
          <BarChart2 className="w-5 h-5 text-background" strokeWidth={2} />
        </div>
        <span className="font-serif font-black text-xl tracking-tight">Strategy Lab</span>
      </Link>

      <div className="news-label mb-6">Subscriber Sign-In &middot; Vol. 1</div>

      {CLERK_ENABLED ? (
        // "virtual" routing keeps Clerk's internal steps (e.g. verification)
        // client-side, which avoids needing extra wildcard routes in wouter.
        <SignIn
          routing="virtual"
          signUpUrl="/sign-up"
          forceRedirectUrl="/dashboard"
          appearance={newsprintAppearance}
        />
      ) : (
        <div className="border border-foreground bg-card p-8 max-w-sm text-center">
          <p className="font-body text-sm text-neutral-700 mb-2">
            Sign-in is not configured yet.
          </p>
          <p className="news-label">Set VITE_CLERK_PUBLISHABLE_KEY to enable it.</p>
        </div>
      )}
    </div>
  );
}
