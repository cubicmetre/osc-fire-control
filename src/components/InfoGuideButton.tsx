import { useState } from 'react';
import './InfoGuideButton.css';

interface InfoGuideButtonProps {
  onClick: () => void;
  isInfoHubActive: boolean;
}

export function InfoGuideButton({ onClick, isInfoHubActive }: InfoGuideButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      className={`info-guide-btn ${isHovered ? 'info-guide-btn--expanded' : ''} ${isInfoHubActive ? 'info-guide-btn--control-mode' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label={isInfoHubActive ? "Fire Control" : "Info Guide"}
    >
      <span className="info-guide-btn__icon">{isInfoHubActive ? 'c' : 'i'}</span>
      <span className="info-guide-btn__text">{isInfoHubActive ? 'Fire Control' : 'Info Guide'}</span>
    </button>
  );
}

