import { useRef, useEffect } from 'react';
import './VideoBackground.css';

// ═══════════════════════════════════════════════════════════════════════════════
// VIDEO TRANSFORM CONTROLS
// ═══════════════════════════════════════════════════════════════════════════════
// Scale: 1.0 = native size, 2.0 = double size, 0.5 = half size
const VIDEO_SCALE = 1.0;

// Translation (in pixels, applied after scaling)
// Positive X = move right, Negative X = move left
// Positive Y = move down, Negative Y = move up
const VIDEO_OFFSET_X = 0;
const VIDEO_OFFSET_Y = -300;

// Alternative: Use percentage-based translation (relative to viewport)
// Set to true to interpret offsets as percentages instead of pixels
const USE_PERCENTAGE_OFFSET = false;
// ═══════════════════════════════════════════════════════════════════════════════

interface VideoBackgroundProps {
  showVideo: boolean;
}

export function VideoBackground({ showVideo }: VideoBackgroundProps) {
  const panFullRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep video playing when window regains focus (only if video should be shown)
  useEffect(() => {
    if (!showVideo) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && panFullRef.current) {
        panFullRef.current.play().catch(() => {});
      }
    };

    const handleFocus = () => {
      if (panFullRef.current) {
        panFullRef.current.play().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [showVideo]);

  // Play video when it should be shown (video element is created)
  useEffect(() => {
    if (!showVideo || !panFullRef.current) return;
    panFullRef.current.play().catch(() => {});
  }, [showVideo]);

  // Don't render anything if video is hidden - completely remove from DOM
  if (!showVideo) {
    return null;
  }

  // Build transform string from parameters
  const offsetUnit = USE_PERCENTAGE_OFFSET ? 'vw' : 'px';
  const offsetYUnit = USE_PERCENTAGE_OFFSET ? 'vh' : 'px';
  const videoTransform = `scale(${VIDEO_SCALE}) translate(${VIDEO_OFFSET_X}${offsetUnit}, ${VIDEO_OFFSET_Y}${offsetYUnit})`;

  return (
    <div 
      ref={containerRef} 
      className="video-background"
    >
      <video
        ref={panFullRef}
        className="video-background__video"
        style={{ transform: videoTransform }}
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/videos/cannon-pan-full.mp4" type="video/mp4" />
      </video>

      <div className="video-background__vignette" />
    </div>
  );
}
