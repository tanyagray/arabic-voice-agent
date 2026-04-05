import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Flex, Portal, Spinner, Text, VStack } from '@chakra-ui/react';
import { useWimmelbild, getBox } from '@/hooks/useWimmelbild';
import type { WimmelbilderObject } from '@/hooks/useWimmelbild';

interface PopoverState {
  label: string;
  meta: string;
  top: number;
  left: number;
}

/** Hook to detect portrait/mobile viewport */
function useIsPortrait() {
  const [portrait, setPortrait] = useState(
    () => window.innerWidth < window.innerHeight || window.innerWidth < 768,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px), (orientation: portrait)');
    const handler = (e: MediaQueryListEvent) => setPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return portrait;
}

function StatusMessage({ status }: { status: string }) {
  const messages: Record<string, string> = {
    pending: 'Preparing to generate...',
    generating_image: 'Generating image...',
    detecting_objects: 'Detecting objects in the scene...',
    complete: 'Loading image...',
  };

  return (
    <Flex minH="100vh" align="center" justify="center">
      <VStack gap={4}>
        <Spinner size="xl" color="white" />
        <Text color="white/70" fontSize="lg">
          {messages[status] ?? status}
        </Text>
      </VStack>
    </Flex>
  );
}

function WimmelbilderViewer({
  imageUrl,
  objects,
  imageWidth,
  imageHeight,
}: {
  imageUrl: string;
  objects: WimmelbilderObject[];
  imageWidth: number;
  imageHeight: number;
}) {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click or scroll
  useEffect(() => {
    if (!popover) return;

    const close = () => setPopover(null);
    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('scroll', close, true);
    };

    function handlePointerDown(e: PointerEvent) {
      if (popoverRef.current?.contains(e.target as Node)) return;
      close();
    }
  }, [popover]);

  const handleHotspotClick = useCallback(
    (obj: WimmelbilderObject, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPopover({
        label: obj.label || obj.meta?.split(/[,.]/)?.at(0) || 'Object',
        meta: obj.meta,
        top: rect.top - 4,
        left: rect.left + rect.width / 2,
      });
    },
    [],
  );

  const isPortrait = useIsPortrait();

  // Filter out objects without valid bounding boxes
  const hotspots = objects.filter((obj) => getBox(obj) !== null);

  // The inner image + hotspots layer (shared between both modes)
  const imageLayer = (
    <Box
      position="relative"
      flexShrink={0}
      // Portrait/mobile: image height fills the viewport, width overflows for panning
      // Desktop: image fits within the frame
      width={isPortrait ? 'auto' : '100%'}
      height={isPortrait ? '100%' : 'auto'}
      style={{ aspectRatio: `${imageWidth} / ${imageHeight}` }}
    >
      <img
        src={imageUrl}
        alt="Wimmelbild scene"
        draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block', userSelect: 'none' }}
      />

      {/* Invisible hotspot overlays */}
      {hotspots.map((obj, i) => {
        const [x1, y1, x2, y2] = getBox(obj)!;
        return (
          <Box
            key={i}
            position="absolute"
            left={`${(x1 / imageWidth) * 100}%`}
            top={`${(y1 / imageHeight) * 100}%`}
            width={`${((x2 - x1) / imageWidth) * 100}%`}
            height={`${((y2 - y1) / imageHeight) * 100}%`}
            cursor="pointer"
            _hover={{ bg: 'white/10', outline: '2px solid', outlineColor: 'white/30' }}
            borderRadius="sm"
            transition="all 0.15s"
            onClick={(e) => handleHotspotClick(obj, e)}
          />
        );
      })}
    </Box>
  );

  return (
    <>
      {isPortrait ? (
        /* Mobile/portrait: full-height, horizontally scrollable */
        <Box
          width="100vw"
          height="100vh"
          overflow="auto hidden"
                   css={{ WebkitOverflowScrolling: 'touch' }}
        >
          {imageLayer}
        </Box>
      ) : (
        /* Desktop/landscape: framed with margin */
        <Flex
          minH="100vh"
          align="center"
          justify="center"
                   p={{ base: 4, md: 8, lg: 12 }}
        >
          <Box width="100%" maxW="1600px">
            {imageLayer}
          </Box>
        </Flex>
      )}

      {popover && (
        <Portal>
          <Box
            ref={popoverRef}
            position="fixed"
            top={`${popover.top}px`}
            left={`${popover.left}px`}
            transform="translate(-50%, -100%)"
            bg="gray.800"
            color="white"
            px={4}
            py={2.5}
            borderRadius="lg"
            boxShadow="xl"
            fontSize="sm"
            zIndex="popover"
            maxW="300px"
            pointerEvents="auto"
          >
            <Text fontWeight="bold" textTransform="capitalize">
              {popover.label}
            </Text>
            <Text color="white/70" mt={0.5}>
              {popover.meta}
            </Text>
            {/* Arrow */}
            <Box
              position="absolute"
              bottom="-6px"
              left="50%"
              transform="translateX(-50%)"
              borderLeft="6px solid transparent"
              borderRight="6px solid transparent"
              borderTop="6px solid"
              borderTopColor="gray.800"
            />
          </Box>
        </Portal>
      )}
    </>
  );
}

function WimmelbildPage() {
  const { id } = useParams<{ id: string }>();
  const { data, imageUrl, loading, error } = useWimmelbild(id);

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Spinner size="xl" color="white" />
      </Flex>
    );
  }

  if (error || !data) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <Text color="red.300" fontSize="lg">
          {error ?? 'Wimmelbilder not found'}
        </Text>
      </Flex>
    );
  }

  if (data.status === 'failed') {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <VStack gap={2}>
          <Text color="red.300" fontSize="lg" fontWeight="bold">
            Generation failed
          </Text>
          <Text color="white/50">{data.error}</Text>
        </VStack>
      </Flex>
    );
  }

  if (data.status !== 'complete') {
    return <StatusMessage status={data.status} />;
  }

  if (!imageUrl || !data.objects || !data.image_width || !data.image_height) {
    return <StatusMessage status="complete" />;
  }

  return (
    <WimmelbilderViewer
      imageUrl={imageUrl}
      objects={data.objects}
      imageWidth={data.image_width}
      imageHeight={data.image_height}
    />
  );
}

export default WimmelbildPage;
