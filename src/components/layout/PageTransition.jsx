import { motion } from "framer-motion";

export function PageTransition({ children, className }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className={className}>
      {children}
    </motion.div>
  );
}

export function Logo({ light, className, brand = "Turnamen Warkop Sippo", accent = "Warkop Sippo" }) {
  const name = brand.slice(0, brand.length - accent.length);
  return (
    <span className={`inline-flex items-center gap-2.5 ${className || ""}`}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-electric-500 to-accent-500 text-lg text-white shadow-lg shadow-electric-500/30">
        <i className="fi fi-sr-trophy" />
      </span>
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-navy-900"}`}>
        {name}<span className="text-electric-500">{accent}</span>
      </span>
    </span>
  );
}
