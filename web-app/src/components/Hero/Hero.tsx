import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BsArrowRight } from 'react-icons/bs';
import { LiveDemoWidget } from '../LiveDemoWidget/LiveDemoWidget';

export function Hero() {
  const [showDemo, setShowDemo] = useState(false);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500 via-purple-600 to-primary-700">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full h-full">
        <div className="flex flex-col md:flex-row gap-12 items-center justify-center h-full">
          {/* Heading - Initially Centered, Then Moves Left */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className={`flex flex-col ${showDemo ? 'flex-1 items-start justify-center' : 'max-w-3xl items-center justify-center text-center'}`}
          >
            <h1 className="font-bold text-white leading-tight">
              <span className="block text-5xl md:text-7xl">
                Master Arabic
              </span>
              <span className="block text-3xl md:text-5xl mt-2 bg-gradient-to-r from-accent-300 to-accent-500 bg-clip-text text-transparent">
                with AI-Powered Conversations
              </span>
            </h1>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="mt-8 flex items-center gap-4"
            >
              <button
                className="px-8 py-4 bg-white hover:bg-gray-100 text-primary-600 font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 text-lg"
              >
                Sign Up
              </button>
              {!showDemo && (
                <button
                  onClick={() => setShowDemo(true)}
                  className="px-8 py-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 text-lg"
                >
                  Chat Now
                  <BsArrowRight className="text-xl" />
                </button>
              )}
            </motion.div>
          </motion.div>

          {/* Voice Agent Widget - Fades in after heading moves */}
          <AnimatePresence>
            {showDemo && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="flex-1 flex items-stretch self-stretch"
              >
                <LiveDemoWidget />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
