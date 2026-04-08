'use client';

import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { useRef } from 'react';

// Import local JSON files
import animationChatbot from '../../../public/lottie/candido-chatbot.json';
import animationHello from '../../../public/lottie/candido-hello.json';
import animationPointing from '../../../public/lottie/candido-pointing.json';
import animationTalking from '../../../public/lottie/candido-talking.json';

export type DonCandidoMood = 'saludo' | 'explicando' | 'señalando' | 'chatbot';

interface Props {
  mood: DonCandidoMood;
  className?: string;
  loop?: boolean;
}

export const DonCandidoAvatar = ({ mood, className, loop = true }: Props) => {
  const lottieRef = useRef<LottieRefCurrentProps>(null);

  const getAnimation = () => {
    switch (mood) {
      case 'saludo':
        return animationHello;
      case 'explicando':
        return animationTalking;
      case 'señalando':
        return animationPointing;
      case 'chatbot':
        return animationChatbot;
      default:
        return animationHello;
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Lottie
        lottieRef={lottieRef}
        animationData={getAnimation()}
        loop={loop}
        className="w-full h-full"
      />
    </div>
  );
};
