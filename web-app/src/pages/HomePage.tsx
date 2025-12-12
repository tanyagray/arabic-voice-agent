import { Hero } from '../components/Hero/Hero';
import { Features } from '../components/Features/Features';
import { Footer } from '../components/Footer/Footer';
import { Header } from '../components/Header';
import { Box } from '@chakra-ui/react';

function HomePage() {
  return (
    <Box minH="100vh">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </Box>
  );
}

export default HomePage;
