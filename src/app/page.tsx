import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Brain,
  Shield,
  Smartphone,
  ArrowRight,
  Target,
  Zap,
  PieChart,
  Star,
} from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default async function LandingPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-cream-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-4 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy-900 flex items-center justify-center p-1.5 shadow-sm">
            <Logo variant="light" size={20} />
          </div>
          <span className="font-semibold text-lg text-navy-900 tracking-tight">MoneyLens</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-default"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 rounded-lg bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-default"
          >
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 max-w-[1400px] mx-auto">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-forest-500/10 text-forest-600 text-xs font-medium mb-6">
            <Zap className="w-3.5 h-3.5" />
            AI-powered financial intelligence
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-navy-900 leading-[1.1] mb-6">
            The clearer side of money.
          </h1>
          <p className="text-gray-500 text-lg md:text-xl max-w-xl mx-auto mb-8 leading-relaxed">
            Track income, expenses, and savings goals with AI-powered insights. Smart receipt scanning, automated budgeting, and beautiful analytics.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="px-6 py-3 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default flex items-center gap-2"
            >
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/sign-in"
              className="px-6 py-3 rounded-lg border border-cream-300 bg-white text-gray-700 text-sm font-medium hover:bg-cream-100 transition-default"
            >
              Sign in
            </Link>
          </div>
          <p className="text-gray-400 text-xs mt-4">
            No credit card required · Set up in 2 minutes
          </p>
        </div>

        {/* Dashboard Preview with 3D Tilt */}
        <div className="mt-16 dashboard-preview">
          <div className="dashboard-preview-inner max-w-4xl mx-auto bg-white rounded-2xl border border-cream-300 shadow-2xl shadow-black/5 overflow-hidden">
            <div className="bg-navy-900 h-10 flex items-center px-4 gap-2">
              <div className="w-3 h-3 rounded-full bg-coral-500/60" />
              <div className="w-3 h-3 rounded-full bg-gold-500/60" />
              <div className="w-3 h-3 rounded-full bg-forest-500/60" />
            </div>
            <div className="p-4 sm:p-6 bg-cream-100">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
                <div className="bg-gradient-to-br from-forest-500 to-forest-700 rounded-xl p-3 sm:p-4 text-white">
                  <p className="text-[8px] font-semibold tracking-[0.15em] uppercase text-green-200">Total Balance</p>
                  <p className="text-base sm:text-xl font-bold mt-1">₹1,81,950</p>
                  <p className="text-green-200 text-[10px] mt-1">+4.8% this month</p>
                </div>
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-cream-300">
                  <p className="text-[8px] font-semibold tracking-[0.15em] uppercase text-gray-500">Monthly Income</p>
                  <p className="text-base sm:text-xl font-bold mt-1">₹82,400</p>
                </div>
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-cream-300">
                  <p className="text-[8px] font-semibold tracking-[0.15em] uppercase text-gray-500">Monthly Spend</p>
                  <p className="text-base sm:text-xl font-bold mt-1">₹34,128</p>
                </div>
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-cream-300">
                  <p className="text-[8px] font-semibold tracking-[0.15em] uppercase text-gray-500">Savings Rate</p>
                  <p className="text-base sm:text-xl font-bold mt-1">58.6%</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 border border-cream-300 h-32">
                  <p className="text-xs font-medium text-gray-500 mb-2">Balance Rhythm</p>
                  <div className="flex items-end gap-1 h-16">
                    {[30, 45, 38, 55, 42, 60, 52, 65, 58, 70, 62, 75].map((h, i) => (
                      <div key={i} className="flex-1 bg-forest-500/20 rounded-t" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-cream-300 h-32">
                  <p className="text-xs font-medium text-gray-500 mb-2">This Month&apos;s Shape</p>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-forest-500 border-r-coral-500 border-b-gold-500" />
                    <div className="space-y-1 text-[10px] text-gray-500">
                      <p>● Home 38%</p>
                      <p>● Food 20%</p>
                      <p>● Travel 15%</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="px-6 lg:px-12 py-12 bg-white border-y border-cream-300">
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "10K+", label: "Active Users" },
            { value: "₹50Cr+", label: "Tracked" },
            { value: "99.9%", label: "Uptime" },
            { value: "4.9★", label: "User Rating" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-3xl font-serif text-navy-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-500 mb-3">
            Everything you need
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-navy-900">
            Built for modern money management
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              icon: Brain,
              title: "AI Receipt Scanner",
              desc: "Snap a photo, let Gemini AI extract every detail. No more manual entry.",
              color: "bg-purple-500/10 text-purple-600",
            },
            {
              icon: BarChart3,
              title: "Smart Analytics",
              desc: "Interactive charts that show exactly where your money goes each week, month, and year.",
              color: "bg-forest-500/10 text-forest-600",
            },
            {
              icon: Target,
              title: "Savings Goals",
              desc: "Set targets, track contributions, and redeem when you're ready. Money stays in your bank.",
              color: "bg-gold-500/10 text-gold-600",
            },
            {
              icon: Shield,
              title: "Bank-Level Security",
              desc: "Arcjet bot protection, rate limiting, and encrypted auth via Clerk.",
              color: "bg-coral-500/10 text-coral-600",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-xl border border-cream-300 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center mb-4`}>
                <feature.icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 bg-navy-900">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-12">
            <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-400 mb-3">
              How it works
            </p>
            <h2 className="text-3xl md:text-4xl font-serif text-white">
              Three steps to clarity
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Connect your accounts",
                desc: "Add your bank accounts and set initial balances. Takes about 30 seconds.",
              },
              {
                step: "02",
                title: "Track everything",
                desc: "Log transactions, scan receipts with AI, set up recurring entries. All automated.",
              },
              {
                step: "03",
                title: "Get insights",
                desc: "Beautiful charts, AI-powered monthly reports, and budget alerts delivered to your inbox.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-gold-400 font-serif text-xl">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 max-w-[1200px] mx-auto">
        <div className="text-center mb-12">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-gold-500 mb-3">
            Loved by thousands
          </p>
          <h2 className="text-3xl md:text-4xl font-serif text-navy-900">
            What our users say
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              quote: "Finally, an app that makes finance feel approachable. The AI receipt scanner saves me hours every week.",
              name: "Priya Sharma",
              role: "Freelance Designer",
            },
            {
              quote: "The savings goals feature is brilliant. Being able to see where the money is without it leaving the bank is exactly what I needed.",
              name: "Aarav Kapoor",
              role: "Software Engineer",
            },
            {
              quote: "The monthly AI reports are like having a personal financial advisor. The charts are beautiful too.",
              name: "Meera Patel",
              role: "Small Business Owner",
            },
          ].map((testimonial) => (
            <div
              key={testimonial.name}
              className="bg-white rounded-xl border border-cream-300 p-6"
            >
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold-400 text-gold-400" />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                <p className="text-xs text-gray-400">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-16 lg:py-24 bg-gradient-to-br from-navy-900 to-navy-950">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-serif text-white mb-4">
            Ready to take control?
          </h2>
          <p className="text-gray-400 text-sm mb-8">
            Join thousands who&apos;ve already simplified their financial life. Free to start, powerful to grow.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg bg-forest-500 text-white text-sm font-medium hover:bg-forest-600 transition-default"
          >
            Create free account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-8 border-t border-cream-300">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-navy-900 flex items-center justify-center p-1">
              <Logo variant="light" size={16} />
            </div>
            <span className="text-sm font-semibold text-gray-800">MoneyLens</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} MoneyLens. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
