import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  PencilIcon,
  AcademicCapIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "../components/Icons.jsx";

// ── Animated counter ──────────────────────────────────────────────────────
function Counter({ target, suffix = "", duration = 1800 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const numeric = parseInt(target.replace(/\D/g, ""), 10);
          const step = numeric / (duration / 16);
          let current = 0;
          const timer = setInterval(() => {
            current = Math.min(current + step, numeric);
            setCount(Math.floor(current));
            if (current >= numeric) clearInterval(timer);
          }, 16);
        }
      },
      { threshold: 0.5 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  const display = target.includes("+")
    ? `${count.toLocaleString()}+`
    : target.includes("%")
      ? `${count}%`
      : target.includes("<")
        ? target
        : count.toLocaleString();

  return (
    <span ref={ref} className="tabular-nums">
      {display}
      {suffix}
    </span>
  );
}

// ── Floating particle ─────────────────────────────────────────────────────
function Particle({ style }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        width: `${Math.random() * 4 + 2}px`,
        height: `${Math.random() * 4 + 2}px`,
        background: `rgba(${Math.random() > 0.5 ? "99,102,241" : "167,139,250"},${Math.random() * 0.5 + 0.2})`,
        animation: `particle-float ${Math.random() * 6 + 6}s ease-in-out infinite`,
        animationDelay: `${Math.random() * 8}s`,
        ...style,
      }}
    />
  );
}

// ── Scroll reveal hook ────────────────────────────────────────────────────
function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ── Feature card ──────────────────────────────────────────────────────────
const features = [
  {
    Icon: PencilIcon,
    title: "Post Requests",
    desc: "Describe your assignment, set a budget, and get matched with the right helper in minutes.",
    gradient: "from-indigo-500/20 via-indigo-600/10 to-transparent",
    iconBg: "bg-indigo-500/15",
    iconColor: "text-indigo-400",
    border: "border-indigo-500/20",
    glow: "rgba(99,102,241,0.15)",
    delay: "stagger-1",
  },
  {
    Icon: AcademicCapIcon,
    title: "Expert Helpers",
    desc: "Connect with verified students and tutors who specialize in your exact subject area.",
    gradient: "from-violet-500/20 via-violet-600/10 to-transparent",
    iconBg: "bg-violet-500/15",
    iconColor: "text-violet-400",
    border: "border-violet-500/20",
    glow: "rgba(167,139,250,0.15)",
    delay: "stagger-2",
  },
  {
    Icon: SparklesIcon,
    title: "AI-Powered",
    desc: "Built-in AI writes your offer messages, suggests budgets, and matches you with the best helpers.",
    gradient: "from-sky-500/20 via-sky-600/10 to-transparent",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
    border: "border-sky-500/20",
    glow: "rgba(56,189,248,0.15)",
    delay: "stagger-3",
  },
];

const howItWorks = [
  {
    step: "01",
    title: "Post your assignment",
    desc: "Describe what you need, set a budget, and publish in 30 seconds.",
  },
  {
    step: "02",
    title: "Get matched instantly",
    desc: "AI ranks the best helpers for your specific subject and budget.",
  },
  {
    step: "03",
    title: "Pay securely",
    desc: "Funds are held in escrow — only released when you're satisfied.",
  },
  {
    step: "04",
    title: "Work gets done",
    desc: "Chat in-app, share files, and mark complete when you're happy.",
  },
];

const stats = [
  { value: "2400", suffix: "+", label: "Students helped", icon: "👥" },
  { value: "98", suffix: "%", label: "Satisfaction rate", icon: "⭐" },
  { value: "< 2hrs", suffix: "", label: "Avg. response time", icon: "⚡" },
  { value: "50000", suffix: "+", label: "NGN paid to helpers", icon: "💰" },
];

const testimonials = [
  {
    name: "Adaeze O.",
    role: "200L, Computer Science",
    text: "Got my Python assignment done in 3 hours. The helper was amazing and the escrow system made me feel safe.",
    avatar: "A",
    color: "from-indigo-500 to-violet-600",
  },
  {
    name: "Emeka T.",
    role: "300L, Engineering",
    text: "I've earned over ₦45,000 helping other students. The platform is clean and payments are always on time.",
    avatar: "E",
    color: "from-emerald-500 to-teal-600",
  },
  {
    name: "Fatima B.",
    role: "100L, Medicine",
    text: "The AI matched me with a helper who had literally done the same assignment before. Incredible.",
    avatar: "F",
    color: "from-rose-500 to-pink-600",
  },
];

export default function Landing() {
  useScrollReveal();

  // Generate particles once
  const particles = useRef(
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
    })),
  );

  return (
    <div
      className="min-h-screen text-gray-100 overflow-x-hidden"
      style={{ background: "#07090f" }}
    >
      {/* ── Navbar ────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-6 sm:px-10 py-4 sticky top-0 z-30"
        style={{
          background: "rgba(7,9,15,0.8)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-900/50">
            <AcademicCapIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[17px] tracking-tight text-white">
            CampusHelp
          </span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-[13px] font-medium text-gray-400">
          <a
            href="#how"
            className="animated-underline hover:text-white transition-colors cursor-pointer"
          >
            How it works
          </a>
          <a
            href="#features"
            className="animated-underline hover:text-white transition-colors cursor-pointer"
          >
            Features
          </a>
          <a
            href="#testimonials"
            className="animated-underline hover:text-white transition-colors cursor-pointer"
          >
            Reviews
          </a>
        </nav>
        <div className="flex items-center gap-2.5">
          <Link
            to="/login"
            className="px-4 py-2 text-[13px] text-gray-400 hover:text-white transition-colors font-medium"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="shine-btn ripple-btn px-4 py-2 text-[13px] bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all font-semibold shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/60 hover:-translate-y-0.5 text-white"
          >
            Get Started →
          </Link>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Aurora blobs */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full blur-3xl pointer-events-none aurora-1"
          style={{
            background:
              "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-32 left-1/4 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none aurora-2"
          style={{
            background:
              "radial-gradient(ellipse, rgba(167,139,250,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-10 right-1/4 w-[350px] h-[350px] rounded-full blur-3xl pointer-events-none aurora-3"
          style={{
            background:
              "radial-gradient(ellipse, rgba(52,211,153,0.06) 0%, transparent 70%)",
          }}
        />

        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />

        {/* Floating particles */}
        {particles.current.map((p) => (
          <Particle key={p.id} style={{ left: p.left, top: p.top }} />
        ))}

        {/* Badge */}
        <div
          className="slide-up stagger-1 relative inline-flex items-center gap-2 text-[11px] font-bold tracking-widest text-indigo-400 uppercase mb-6 px-4 py-1.5 rounded-full"
          style={{
            background: "rgba(99,102,241,0.1)",
            border: "1px solid rgba(99,102,241,0.2)",
          }}
        >
          <SparklesIcon className="w-3.5 h-3.5" />
          Nigeria's #1 Campus Assignment Marketplace
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Headline */}
        <h1 className="slide-up stagger-2 relative text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] max-w-4xl mb-6 tracking-tight">
          Get help with your <span className="gradient-text">assignments</span>
          <br />
          <span className="text-white">faster than ever.</span>
        </h1>

        {/* Sub */}
        <p className="slide-up stagger-3 relative text-[17px] text-gray-400 max-w-xl mb-10 leading-relaxed">
          Post your request, get matched with verified helpers, pay securely via
          escrow — all in one beautifully simple platform.
        </p>

        {/* CTAs */}
        <div className="slide-up stagger-4 relative flex flex-col sm:flex-row gap-4 items-center">
          <Link
            to="/signup"
            className="shine-btn ripple-btn group flex items-center gap-2.5 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-[15px] transition-all shadow-2xl shadow-indigo-900/60 hover:shadow-indigo-800/70 hover:-translate-y-1 text-white"
          >
            Start for free
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-[15px] text-gray-300 hover:text-white transition-all hover:-translate-y-0.5"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            Sign in
          </Link>
        </div>

        {/* Trust badges */}
        <div className="slide-up stagger-5 relative flex items-center gap-3 mt-8 text-[12px] text-gray-500">
          {[
            "No credit card required",
            "Free to post",
            "Secure escrow payments",
          ].map((t, i) => (
            <span key={t} className="flex items-center gap-1.5">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-gray-700" />}
              <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
              {t}
            </span>
          ))}
        </div>

        {/* Stats */}
        <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 w-full max-w-2xl">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`reveal text-center p-4 rounded-2xl`}
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                transitionDelay: `${i * 0.08}s`,
              }}
            >
              <div className="text-2xl mb-1">{s.icon}</div>
              <p className="text-2xl font-bold text-white">
                {s.value === "< 2hrs" ? (
                  s.value
                ) : (
                  <Counter target={s.value} suffix={s.suffix} />
                )}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how" className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-14 reveal">
          <span
            className="text-[11px] font-bold tracking-widest text-indigo-400 uppercase px-3 py-1 rounded-full"
            style={{
              background: "rgba(99,102,241,0.1)",
              border: "1px solid rgba(99,102,241,0.2)",
            }}
          >
            Simple process
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-3">
            How CampusHelp works
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-[15px] leading-relaxed">
            From posting to completion in 4 simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {howItWorks.map((item, i) => (
            <div
              key={item.step}
              className="reveal tilt-card relative p-6 rounded-2xl"
              style={{
                background: "rgba(15,21,32,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              {/* Step number */}
              <div className="text-[11px] font-black tracking-widest mb-4 gradient-text">
                {item.step}
              </div>
              {/* Connector line */}
              {i < howItWorks.length - 1 && (
                <div
                  className="hidden lg:block absolute top-10 -right-2.5 w-5 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(99,102,241,0.4), transparent)",
                  }}
                />
              )}
              <h3 className="font-bold text-white text-[15px] mb-2">
                {item.title}
              </h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────── */}
      <section id="features" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14 reveal">
          <span
            className="text-[11px] font-bold tracking-widest text-violet-400 uppercase px-3 py-1 rounded-full"
            style={{
              background: "rgba(167,139,250,0.1)",
              border: "1px solid rgba(167,139,250,0.2)",
            }}
          >
            Platform features
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-3">
            Everything you need to succeed
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-[15px] leading-relaxed">
            From posting to completion — CampusHelp handles the entire workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map(
            (
              {
                Icon,
                title,
                desc,
                gradient,
                iconBg,
                iconColor,
                border,
                glow,
                delay,
              },
              i,
            ) => (
              <div
                key={title}
                className={`reveal tilt-card relative bg-gradient-to-b ${gradient} border ${border} rounded-2xl p-6 overflow-hidden`}
                style={{
                  transitionDelay: `${i * 0.1}s`,
                  boxShadow: `0 0 40px ${glow}`,
                }}
              >
                {/* Glow orb */}
                <div
                  className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none"
                  style={{ background: glow }}
                />

                <div
                  className={`relative inline-flex items-center justify-center w-11 h-11 rounded-xl ${iconBg} mb-4 ${iconColor} float`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="relative font-bold text-white mb-2 text-[15px]">
                  {title}
                </h3>
                <p className="relative text-[13px] text-gray-400 leading-relaxed">
                  {desc}
                </p>
              </div>
            ),
          )}
        </div>

        {/* Extra feature pills */}
        <div className="flex flex-wrap justify-center gap-2.5 mt-10 reveal">
          {[
            "🔒 Escrow payments",
            "⚖️ Dispute resolution",
            "🤖 AI matching",
            "💬 Real-time chat",
            "⭐ Reputation system",
            "📱 Mobile friendly",
            "🏆 Helper badges",
            "📊 Earnings dashboard",
          ].map((pill) => (
            <span
              key={pill}
              className="text-[12px] font-medium px-3.5 py-1.5 rounded-full transition-all hover:-translate-y-0.5 cursor-default"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#8b9ab8",
              }}
            >
              {pill}
            </span>
          ))}
        </div>
      </section>

      {/* ── Testimonials ──────────────────────────────────────────────── */}
      <section id="testimonials" className="max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-14 reveal">
          <span
            className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase px-3 py-1 rounded-full"
            style={{
              background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            Student reviews
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-4 mb-3">
            Loved by students across Nigeria
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className="reveal tilt-card p-6 rounded-2xl"
              style={{
                background: "rgba(15,21,32,0.8)",
                border: "1px solid rgba(255,255,255,0.07)",
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg
                    key={s}
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="#fbbf24"
                  >
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                ))}
              </div>
              <p className="text-[14px] text-gray-300 leading-relaxed mb-5">
                "{t.text}"
              </p>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-[12px] font-bold text-white shrink-0`}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">
                    {t.name}
                  </p>
                  <p className="text-[11px] text-gray-500">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div
          className="reveal gradient-border relative rounded-3xl p-10 text-center overflow-hidden"
          style={{ background: "rgba(15,21,32,0.9)" }}
        >
          {/* Inner glow */}
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)",
            }}
          />

          {/* Floating orbs */}
          <div
            className="absolute top-4 left-8 w-20 h-20 rounded-full blur-2xl float-slow pointer-events-none"
            style={{ background: "rgba(99,102,241,0.2)" }}
          />
          <div
            className="absolute bottom-4 right-8 w-16 h-16 rounded-full blur-2xl float-delayed pointer-events-none"
            style={{ background: "rgba(167,139,250,0.2)" }}
          />

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5 float">
              <UserGroupIcon className="w-7 h-7 text-indigo-400" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-3">
              Ready to get started?
            </h3>
            <p className="text-gray-400 text-[15px] mb-8 max-w-sm mx-auto leading-relaxed">
              Join thousands of Nigerian students already using CampusHelp to
              ace their assignments.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="shine-btn ripple-btn inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold text-[15px] transition-all shadow-xl shadow-indigo-900/50 hover:-translate-y-0.5 text-white"
              >
                Create free account
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-[15px] text-gray-300 hover:text-white transition-all hover:-translate-y-0.5"
                style={{
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                Sign in instead
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer
        className="text-center py-8 px-6"
        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
            <AcademicCapIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-[14px] text-white">CampusHelp</span>
        </div>
        <p className="text-[12px] text-gray-600">
          © {new Date().getFullYear()} CampusHelp. Built for Nigerian students.
        </p>
      </footer>
    </div>
  );
}
