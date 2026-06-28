import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

// ── Animation helpers ──────────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.5, delay },
});

// ── Feature card ───────────────────────────────────────────────────────────
const FeatureCard = ({ icon, title, description, delay }) => (
  <motion.div {...fadeUp(delay)} className="glass-card p-6 flex flex-col gap-3">
    <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-2xl">
      {icon}
    </div>
    <h3 className="font-semibold text-gray-900 dark:text-white text-base">{title}</h3>
    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
  </motion.div>
);

// ── Stat pill ──────────────────────────────────────────────────────────────
const StatPill = ({ value, label }) => (
  <div className="text-center">
    <p className="text-3xl font-extrabold gradient-text">{value}</p>
    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
  </div>
);

// ── Landing ────────────────────────────────────────────────────────────────
const Landing = () => {
  return (
    <div className="min-h-screen bg-white dark:bg-dark overflow-x-hidden">

      {/* ─────────────── Navbar (public, minimal) ─────────────── */}
      <header className="sticky top-0 z-50 glass border-b border-gray-200/60 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">SyncUp</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 dark:text-gray-300
                hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="text-sm font-medium px-4 py-1.5 rounded-lg gradient-primary
                text-white hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─────────────── Hero ─────────────── */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-center">

        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px]
            bg-primary-500/10 dark:bg-primary-500/5 rounded-full blur-3xl" />
        </div>

        <motion.div {...fadeIn(0)}>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase
            bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300
            px-3 py-1 rounded-full mb-6">
            AI-Powered Collaboration
          </span>
        </motion.div>

        <motion.h1
          {...fadeUp(0.1)}
          className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900
            dark:text-white leading-[1.1] tracking-tight mb-6"
        >
          Where Student Teams{' '}
          <span className="gradient-text">Sync Up</span>
        </motion.h1>

        <motion.p
          {...fadeUp(0.2)}
          className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl
            mx-auto leading-relaxed mb-10"
        >
          Manage projects, collaborate in real time, and get AI-powered assistance — all
          in one beautifully crafted workspace built for students.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/register"
            id="hero-cta-primary"
            className="px-8 py-3.5 rounded-xl gradient-primary text-white font-semibold
              text-base hover:opacity-90 transition-opacity shadow-lg shadow-primary-500/25"
          >
            Start for Free →
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-xl glass border border-gray-200/80
              dark:border-white/10 text-gray-700 dark:text-gray-200 font-semibold text-base
              hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
          >
            Sign In
          </Link>
        </motion.div>

        {/* Social proof */}
        <motion.p
          {...fadeIn(0.5)}
          className="mt-8 text-xs text-gray-400"
        >
          No credit card required · Free for students
        </motion.p>
      </section>

      {/* ─────────────── Stats strip ─────────────── */}
      <motion.section
        {...fadeUp(0.3)}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-12"
      >
        <div className="glass-card py-8 px-6 grid grid-cols-3 gap-6 divide-x
          divide-gray-200 dark:divide-white/10">
          <StatPill value="10k+" label="Students" />
          <StatPill value="5k+" label="Projects" />
          <StatPill value="99.9%" label="Uptime" />
        </div>
      </motion.section>

      {/* ─────────────── Features ─────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <motion.div {...fadeUp(0)} className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Everything your team needs
          </h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            Built specifically for student collaboration — powerful, simple, and delightful to use.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FeatureCard
            icon="📂"
            title="Project Management"
            description="Create and manage projects, assign members, and track progress — all from a clean, intuitive dashboard."
            delay={0.05}
          />
          <FeatureCard
            icon="✅"
            title="Task Tracking"
            description="Break projects into tasks, set deadlines, and mark progress. Never miss a deliverable again."
            delay={0.1}
          />
          <FeatureCard
            icon="💬"
            title="Real-Time Chat"
            description="Chat with your team inside every project. No more hunting for conversations across different apps."
            delay={0.15}
          />
          <FeatureCard
            icon="🤖"
            title="AI Assistant"
            description="Get intelligent suggestions, auto-summaries, and writing help powered by the latest AI models."
            delay={0.2}
          />
          <FeatureCard
            icon="🔒"
            title="Secure by Default"
            description="JWT authentication, role-based access, and encrypted data keep your work private and protected."
            delay={0.25}
          />
          <FeatureCard
            icon="📱"
            title="Fully Responsive"
            description="Works beautifully on every device — laptop, tablet, or phone. Collaborate from anywhere."
            delay={0.3}
          />
        </div>
      </section>

      {/* ─────────────── About ─────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="glass-card p-10 sm:p-14 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div {...fadeUp(0.1)}>
            <span className="text-xs font-semibold tracking-widest uppercase
              text-primary-600 dark:text-primary-400">About SyncUp</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mt-3 mb-5">
              Built for the way students actually work
            </h2>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-5">
              SyncUp was built from the ground up to solve the real collaboration challenges
              that student teams face — scattered tools, missed deadlines, and communication
              breakdowns.
            </p>
            <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
              We bring project management, real-time chat, task tracking, and AI assistance
              into a single, distraction-free environment designed to help teams ship work
              they're proud of.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.2)} className="flex flex-col gap-4">
            {[
              { icon: '⚡', text: 'Real-time collaboration with zero lag' },
              { icon: '🎯', text: 'Focused tools without the bloat' },
              { icon: '🤝', text: 'Designed for teams of 2 to 20' },
              { icon: '📈', text: 'Track progress with visual dashboards' },
            ].map(({ icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">{text}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─────────────── CTA Banner ─────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <motion.div
          {...fadeUp(0.1)}
          className="relative overflow-hidden rounded-2xl gradient-primary p-12 text-center"
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/5 rounded-full" />

          <h2 className="relative text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to sync up your team?
          </h2>
          <p className="relative text-white/80 max-w-md mx-auto mb-8">
            Join thousands of students already using SyncUp to collaborate smarter.
          </p>
          <Link
            to="/register"
            id="footer-cta"
            className="relative inline-block px-8 py-3.5 bg-white text-primary-600
              font-bold rounded-xl hover:bg-gray-50 transition-colors text-base shadow-lg"
          >
            Create Free Account →
          </Link>
        </motion.div>
      </section>

      {/* ─────────────── Footer ─────────────── */}
      <footer className="border-t border-gray-200 dark:border-white/5 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row
          items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">SyncUp</span>
          </div>
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} SyncUp. Built for students, by students.
          </p>
          <div className="flex gap-4 text-xs text-gray-400">
            <Link to="/login" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Login</Link>
            <Link to="/register" className="hover:text-gray-600 dark:hover:text-gray-200 transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
