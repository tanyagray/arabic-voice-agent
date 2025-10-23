import { Hero } from '../components/Hero/Hero';
import { Features } from '../components/Features/Features';
import { Footer } from '../components/Footer/Footer';

export function HomePage() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <Footer />
    </div>
  );
}
