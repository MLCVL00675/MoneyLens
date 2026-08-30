import { Logo } from "@/components/ui/logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 relative overflow-hidden flex-col justify-between p-10">
        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5 shadow-sm">
            <Logo variant="light" size={22} />
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">MoneyLens</span>
        </div>

        {/* Decorative Circle */}
        <div className="absolute top-1/2 right-0 translate-x-1/3 -translate-y-1/2">
          <div className="w-[500px] h-[500px] rounded-full bg-forest-700/40" />
        </div>
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/3">
          <div className="w-[400px] h-[400px] rounded-full bg-forest-700/30" />
        </div>

        {/* Content */}
        <div className="z-10 max-w-md">
          <p className="text-gold-400 text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            Start with clarity
          </p>
          <h1 className="text-white font-serif text-4xl lg:text-5xl leading-tight mb-4">
            Make money feel less loud.
          </h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            A simple, intelligent place to see what you have, what you spend, and what comes next.
          </p>
          <div className="flex items-center gap-2 mt-8 text-gray-500 text-xs">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-forest-500">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
            Private, secure, and yours.
          </div>
        </div>

        {/* Bottom text */}
        <p className="text-gray-600 text-xs z-10">
          No credit card required · Set up in two minutes
        </p>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 bg-cream-100 flex items-center justify-center p-8">
        {children}
      </div>
    </div>
  );
}
