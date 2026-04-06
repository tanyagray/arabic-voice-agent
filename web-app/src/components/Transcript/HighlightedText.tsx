import { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Portal, Text } from '@chakra-ui/react';
import type { Highlight } from '@/api/sessions/sessions.types';

interface HighlightedTextProps {
  text: string;
  highlights: Highlight[];
}

interface PopoverState {
  meaning: string;
  top: number;
  left: number;
}

/**
 * Renders text with highlighted Arabizi words shown in blue.
 * Tapping a highlighted word shows a popover with its meaning.
 * Only one popover is shown at a time; clicking outside or scrolling dismisses it.
 */
export function HighlightedText({ text, highlights }: HighlightedTextProps) {
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

  const showPopover = useCallback(
    (meaning: string, target: HTMLElement) => {
      const rect = target.getBoundingClientRect();
      setPopover({
        meaning,
        top: rect.top - 4,
        left: rect.left + rect.width / 2,
      });
    },
    [],
  );

  const handleWordClick = useCallback(
    (meaning: string, e: React.MouseEvent) => {
      e.stopPropagation();
      showPopover(meaning, e.currentTarget as HTMLElement);
    },
    [showPopover],
  );

  // Show on hover for mouse pointers only (not touch)
  const handlePointerEnter = useCallback(
    (meaning: string, e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') {
        showPopover(meaning, e.currentTarget as HTMLElement);
      }
    },
    [showPopover],
  );

  const handlePointerLeave = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'mouse') {
        setPopover(null);
      }
    },
    [],
  );

  // Build text segments using start/end offsets from highlights
  const segments: { text: string; highlight?: Highlight }[] = [];
  const sorted = [...highlights].sort((a, b) => a.start - b.start);
  let cursor = 0;
  for (const h of sorted) {
    if (h.start > cursor) {
      segments.push({ text: text.slice(cursor, h.start) });
    }
    segments.push({ text: text.slice(h.start, h.end), highlight: h });
    cursor = h.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return (
    <>
      <Text fontSize="lg" lineHeight="relaxed">
        {segments.map((seg, i) =>
          seg.highlight ? (
            <Text
              as="span"
              key={i}
              color="blue.300"
              cursor="pointer"
              fontWeight="medium"
              _hover={{ textDecoration: 'underline' }}
              onClick={(e) => handleWordClick(seg.highlight!.meaning, e)}
              onPointerEnter={(e) => handlePointerEnter(seg.highlight!.meaning, e)}
              onPointerLeave={handlePointerLeave}
            >
              {seg.text}
            </Text>
          ) : (
            <span key={i}>{seg.text}</span>
          ),
        )}
      </Text>

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
            px={3}
            py={1.5}
            borderRadius="md"
            boxShadow="lg"
            fontSize="sm"
            zIndex="popover"
            whiteSpace="nowrap"
            pointerEvents="auto"
          >
            {popover.meaning}
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
