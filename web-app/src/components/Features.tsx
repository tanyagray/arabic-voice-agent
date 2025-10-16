import { motion } from 'framer-motion';

const features = [
  {
    icon: '🗣️',
    title: 'Multiple Arabic Dialects',
    description: 'Practice Modern Standard Arabic, Iraqi, and Egyptian dialects with native-like pronunciation and cultural context.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: '🔄',
    title: 'Seamless Code-Switching',
    description: 'Mix English and Arabic naturally in conversation, just like real bilinguals do in everyday life.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: '🤖',
    title: 'AI-Powered Tutor',
    description: 'Powered by GPT-4o and advanced voice models for natural, context-aware conversations and instant feedback.',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: '⚡',
    title: 'Real-Time Voice',
    description: 'Ultra-low latency voice processing using LiveKit infrastructure for smooth, natural conversations.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: '📱',
    title: 'Cross-Platform',
    description: 'Available on iOS, Android, and web. Practice Arabic anywhere, anytime, on any device.',
    gradient: 'from-indigo-500 to-purple-500',
  },
  {
    icon: '🎯',
    title: 'Personalized Learning',
    description: 'Adaptive conversation topics and difficulty levels that grow with your Arabic language skills.',
    gradient: 'from-yellow-500 to-orange-500',
  },
];

export function Features() {
  return (
    <section className="py-24 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Everything You Need to
            <span className="block bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Master Arabic
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            A comprehensive language learning platform that adapts to your needs and learning style
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              className="group relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
            >
              {/* Card */}
              <div className="h-full bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 group-hover:border-transparent relative overflow-hidden">
                {/* Gradient overlay on hover */}
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
                />

                {/* Content */}
                <div className="relative z-10">
                  {/* Icon */}
                  <div className="mb-6">
                    <div
                      className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center text-3xl shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
                    >
                      {feature.icon}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-primary-600 group-hover:to-purple-600 group-hover:bg-clip-text transition-all">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats section */}
        <motion.div
          className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {[
            { value: '3', label: 'Arabic Dialects' },
            { value: '<50ms', label: 'Voice Latency' },
            { value: '24/7', label: 'Available' },
            { value: '100%', label: 'Natural Speech' },
          ].map((stat, idx) => (
            <div key={idx} className="text-center">
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
