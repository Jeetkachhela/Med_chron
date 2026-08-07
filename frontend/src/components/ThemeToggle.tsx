"use client";

import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
      style={{
        background: theme === "light"
          ? "linear-gradient(135deg, #1e293b, #334155)"
          : "linear-gradient(135deg, #fbbf24, #f59e0b)",
        boxShadow: theme === "light"
          ? "0 4px 20px rgba(30, 41, 59, 0.35)"
          : "0 4px 20px rgba(245, 158, 11, 0.35)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {theme === "light" ? (
          <motion.div
            key="moon"
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-5 w-5 text-yellow-300" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ scale: 0, rotate: 90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: -90 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-5 w-5 text-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}
