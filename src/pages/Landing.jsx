import { Link } from "react-router-dom";
import {
  PencilIcon,
  AcademicCapIcon,
  SparklesIcon,
  UserGroupIcon,
  ArrowRightIcon,
} from "../components/Icons.jsx";

const features = [
  {
    Icon: PencilIcon,
    title: "Post Requests",
    desc: "Describe your assignment, set a budget, and get matched with the right helper in minutes.",
    color: "from-indigo-500/20 to-indigo-600/5",
    iconColor: "text-indigo-400",
    border: "border-indigo-500/20",
  },
  {
    Icon: AcademicCapIcon,
    title: "Get Expert Help",
    desc: "Connect with students and tutors who specialize in your exact subject area.",
    color: "from-violet-500/20 to-violet-600/5",
    iconColor: "text-violet-400",
    border: "border-violet-500/20",
  },
  {
    Icon: SparklesIcon,
    title: "AI Assistant",
    desc: "Built-in AI helps you craft better requests and understand complex academic topics.",
    color: "from-sky-500/20 to-sky-600/5",
    iconColor: "text-sky-400",
    border: "border-sky-500/20",
  },
];

const stats = [
  { value: "2,400+", label: "Students helped" },
  { value: "98%", label: "Satisfaction rate" },
  { value: "< 2hrs", label: "Avg. response time" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#080b14] text-gray-100 overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 backdrop-blur-sm sticky top-0 z-20 bg-[#080b14]/80">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <AcademicCapIcon className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">CampusHelp</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors font-medium"
          >
            Sign in
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all font-semibold shadow-lg shadow-indigo-900/40 hover:shadow-indigo-800/50"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-6 pt-28 pb-24 overflow-hidden">
        {/* Background glow blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-[300px] h-[300px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />

        <span className="relative inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-indigo-400 uppercase mb-6 bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full">
          <SparklesIcon className="w-3.5 h-3.5" />
          Campus Assignment Marketplace
        </span>

        <h1 className="relative text-5xl sm:text-6xl font-extrabold leading-tight max-w-3xl mb-6 tracking-tight">
          Get help with your <span className="gradient-text">assignments</span>,
          <br />
          faster than ever.
        </h1>

        <p className="relative text-lg text-gray-400 max-w-xl mb-10 leading-relaxed">
          Post your assignment request, set a budget, and connect with verified
          tutors — all in one beautifully simple platform.
        </p>

        <div className="relative flex flex-col sm:flex-row gap-4 items-center">
          <Link
            to="/signup"
            className="group flex items-center gap-2 px-7 py-3.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-semibold transition-all shadow-xl shadow-indigo-900/50 hover:shadow-indigo-800/60 hover:-translate-y-0.5"
          >
            Start for free
            <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/login"
            className="px-7 py-3.5 border border-white/10 hover:border-white/20 rounded-2xl font-medium text-gray-300 hover:text-white transition-all hover:-translate-y-0.5"
          >
            Sign in
          </Link>
        </div>

        {/* Stats row */}
        <div className="relative flex flex-wrap justify-center gap-8 mt-16">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-white mb-3">
            Everything you need to succeed
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
            From posting to completion — CampusHelp handles the entire
            collaboration workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {features.map(({ Icon, title, desc, color, iconColor, border }) => (
            <div
              key={title}
              className={`card-hover relative bg-gradient-to-b ${color} border ${border} rounded-2xl p-6 overflow-hidden`}
            >
              <div
                className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 mb-4 ${iconColor}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-white mb-2 text-base">
                {title}
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl bg-gradient-to-br from-indigo-600/30 to-violet-600/20 border border-indigo-500/20 p-10 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-transparent pointer-events-none" />
          <UserGroupIcon className="w-10 h-10 text-indigo-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-3">
            Ready to get started?
          </h3>
          <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
            Join thousands of students already using CampusHelp to ace their
            assignments.
          </p>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-7 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-900/50 hover:-translate-y-0.5"
          >
            Create free account
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <footer className="text-center text-xs text-gray-700 pb-8">
        © {new Date().getFullYear()} CampusHelp. All rights reserved.
      </footer>
    </div>
  );
}
