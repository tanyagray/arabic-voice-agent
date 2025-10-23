export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent mb-4">
              Arabic Voice Agent
            </h3>
            <p className="text-gray-400">
              Master Arabic through AI-powered conversations with support for multiple dialects and natural code-switching.
            </p>
          </div>

          {/* Supported Dialects */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Supported Dialects</h4>
            <ul className="space-y-2 text-gray-400">
              <li>Modern Standard Arabic (MSA)</li>
              <li>Iraqi Arabic</li>
              <li>Egyptian Arabic</li>
              <li>English Code-Switching</li>
            </ul>
          </div>

          {/* Technology */}
          <div>
            <h4 className="font-semibold text-lg mb-4">Powered By</h4>
            <ul className="space-y-2 text-gray-400">
              <li>OpenAI GPT-4o</li>
              <li>ElevenLabs TTS</li>
              <li>Soniox STT</li>
              <li>LiveKit Infrastructure</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm">
            © {currentYear} Arabic Voice Agent. Built with ❤️ for Arabic learners.
          </p>
          <div className="flex gap-6">
            <a
              href="#"
              className="text-gray-400 hover:text-primary-400 transition-colors text-sm"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-primary-400 transition-colors text-sm"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-primary-400 transition-colors text-sm"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
