"use client";

import { useState, useEffect, useRef } from "react";

interface PupilProps {
  size?: number;
  maxDistance?: number;
  pupilColor?: string;
  forceLookX?: number;
  forceLookY?: number;
  mouseX: number;
  mouseY: number;
}

const Pupil = ({ 
  size = 12, 
  maxDistance = 5,
  pupilColor = "black",
  forceLookX,
  forceLookY,
  mouseX,
  mouseY
}: PupilProps) => {
  const pupilRef = useRef<HTMLDivElement>(null);

  const calculatePupilPosition = () => {
    if (!pupilRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const pupil = pupilRef.current.getBoundingClientRect();
    const pupilCenterX = pupil.left + pupil.width / 2;
    const pupilCenterY = pupil.top + pupil.height / 2;

    const deltaX = mouseX - pupilCenterX;
    const deltaY = mouseY - pupilCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  // eslint-disable-next-line react-hooks/refs
  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={pupilRef}
      className="rounded-full"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: pupilColor,
        transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
        transition: 'transform 0.1s ease-out',
      }}
    />
  );
};

interface EyeBallProps {
  size?: number;
  pupilSize?: number;
  maxDistance?: number;
  eyeColor?: string;
  pupilColor?: string;
  isBlinking?: boolean;
  forceLookX?: number;
  forceLookY?: number;
  mouseX: number;
  mouseY: number;
}

const EyeBall = ({ 
  size = 48, 
  pupilSize = 16, 
  maxDistance = 10,
  eyeColor = "white",
  pupilColor = "black",
  isBlinking = false,
  forceLookX,
  forceLookY,
  mouseX,
  mouseY
}: EyeBallProps) => {
  const eyeRef = useRef<HTMLDivElement>(null);

  const calculatePupilPosition = () => {
    if (!eyeRef.current) return { x: 0, y: 0 };

    if (forceLookX !== undefined && forceLookY !== undefined) {
      return { x: forceLookX, y: forceLookY };
    }

    const eye = eyeRef.current.getBoundingClientRect();
    const eyeCenterX = eye.left + eye.width / 2;
    const eyeCenterY = eye.top + eye.height / 2;

    const deltaX = mouseX - eyeCenterX;
    const deltaY = mouseY - eyeCenterY;
    const distance = Math.min(Math.sqrt(deltaX ** 2 + deltaY ** 2), maxDistance);

    const angle = Math.atan2(deltaY, deltaX);
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;

    return { x, y };
  };

  // eslint-disable-next-line react-hooks/refs
  const pupilPosition = calculatePupilPosition();

  return (
    <div
      ref={eyeRef}
      className="rounded-full flex items-center justify-center transition-all duration-150"
      style={{
        width: `${size}px`,
        height: isBlinking ? '2px' : `${size}px`,
        backgroundColor: eyeColor,
        overflow: 'hidden',
      }}
    >
      {!isBlinking && (
        <div
          className="rounded-full"
          style={{
            width: `${pupilSize}px`,
            height: `${pupilSize}px`,
            backgroundColor: pupilColor,
            transform: `translate(${pupilPosition.x}px, ${pupilPosition.y}px)`,
            transition: 'transform 0.1s ease-out',
          }}
        />
      )}
    </div>
  );
};

interface AnimatedAuthPanelProps {
  /**
   * @deprecated Artık yok sayılıyor. Typing durumu document.activeElement ile
   * kendiliğinden takip ediliyor. Geriye dönük uyumluluk için tutuluyor.
   */
  isTyping?: boolean;
  showPassword: boolean;
  passwordLength: number;
  heading?: string;
  subheading?: string;
}

const DEFAULT_HEADING = "Uzmanlar için akıllı platform";
const DEFAULT_SUBHEADING = "Öğrenci takibi, müfredat planlama ve kişiselleştirilmiş öğrenme kartları — hepsi tek platformda.";

export function AnimatedAuthPanel({
  showPassword,
  passwordLength,
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
}: AnimatedAuthPanelProps) {
  const [mouseX, setMouseX] = useState<number>(0);
  const [mouseY, setMouseY] = useState<number>(0);
  const [isTyping, setIsTyping] = useState(false);
  const [isPurpleBlinking, setIsPurpleBlinking] = useState(false);
  const [isBlackBlinking, setIsBlackBlinking] = useState(false);
  const [isLookingAtEachOther, setIsLookingAtEachOther] = useState(false);
  const [isPurplePeeking, setIsPurplePeeking] = useState(false);
  
  const purpleRef = useRef<HTMLDivElement>(null);
  const blackRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const orangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX(e.clientX);
      setMouseY(e.clientY);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Document-level focus tracking — input'tan input'a geçerken flicker olmasın
  useEffect(() => {
    const checkFocus = () => {
      const el = document.activeElement;
      const isInput = el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
      setIsTyping(!!isInput);
    };
    document.addEventListener("focusin", checkFocus);
    document.addEventListener("focusout", checkFocus);
    checkFocus();
    return () => {
      document.removeEventListener("focusin", checkFocus);
      document.removeEventListener("focusout", checkFocus);
    };
  }, []);

  // Blinking effect for purple character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsPurpleBlinking(true);
        setTimeout(() => {
          setIsPurpleBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Blinking effect for black character
  useEffect(() => {
    const getRandomBlinkInterval = () => Math.random() * 4000 + 3000;

    const scheduleBlink = () => {
      const blinkTimeout = setTimeout(() => {
        setIsBlackBlinking(true);
        setTimeout(() => {
          setIsBlackBlinking(false);
          scheduleBlink();
        }, 150);
      }, getRandomBlinkInterval());

      return blinkTimeout;
    };

    const timeout = scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Looking at each other animation when typing starts
  useEffect(() => {
    if (isTyping) {
      setIsLookingAtEachOther(true);
      const timer = setTimeout(() => {
        setIsLookingAtEachOther(false);
      }, 800);
      return () => clearTimeout(timer);
    } else {
      setIsLookingAtEachOther(false);
    }
  }, [isTyping]);

  // Purple sneaky peeking animation when typing password and it's visible
  const isShowPwdActive = passwordLength > 0 && showPassword;
  
  useEffect(() => {
    if (isShowPwdActive) {
      const schedulePeek = () => {
        const peekInterval = setTimeout(() => {
          setIsPurplePeeking(true);
          setTimeout(() => {
            setIsPurplePeeking(false);
          }, 800);
        }, Math.random() * 3000 + 2000);
        return peekInterval;
      };

      const firstPeek = schedulePeek();
      return () => clearTimeout(firstPeek);
    } else {
      setIsPurplePeeking(false);
    }
  }, [isShowPwdActive, isPurplePeeking]);

  const calculatePosition = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (!ref.current) return { faceX: 0, faceY: 0, bodySkew: 0 };

    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;

    const deltaX = mouseX - centerX;
    const deltaY = mouseY - centerY;

    const faceX = Math.max(-15, Math.min(15, deltaX / 20));
    const faceY = Math.max(-10, Math.min(10, deltaY / 30));

    const bodySkew = Math.max(-6, Math.min(6, -deltaX / 120));

    return { faceX, faceY, bodySkew };
  };

  // eslint-disable-next-line react-hooks/refs
  const purplePos = calculatePosition(purpleRef);
  // eslint-disable-next-line react-hooks/refs
  const blackPos = calculatePosition(blackRef);
  // eslint-disable-next-line react-hooks/refs
  const yellowPos = calculatePosition(yellowRef);
  // eslint-disable-next-line react-hooks/refs
  const orangePos = calculatePosition(orangeRef);

  const isTypingActive = isTyping || (passwordLength > 0 && !showPassword);

  return (
    <div className="relative hidden lg:flex flex-col justify-between bg-[#F4AE10]/20 p-12 text-[#692137]">
      <div className="relative z-20">
        <div className="flex items-center gap-2 text-lg font-semibold text-[#692137]">
          <div 
            className="h-16 w-[200px] bg-[#692137]"
            style={{
              WebkitMaskImage: 'url(/logo.svg)',
              WebkitMaskSize: 'contain',
              WebkitMaskRepeat: 'no-repeat',
              maskImage: 'url(/logo.svg)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'left center',
              maskPosition: 'left center'
            }}
            aria-label="Luden"
            role="img"
          />
        </div>

        <div className="mt-8">
          <h2 className="text-3xl font-bold text-[#692137] mb-4">{heading}</h2>
          <p className="text-[#692137]/80 text-sm leading-relaxed mb-8 max-w-sm">
            {subheading}
          </p>
          <div className="flex gap-2">
            <div className="h-2 w-12 rounded-full bg-[#F4B2A6]" />
            <div className="h-2 w-6 rounded-full bg-[#FE703A]" />
            <div className="h-2 w-3 rounded-full bg-[#692137]/30" />
          </div>
        </div>
      </div>

      <div className="relative z-20 flex items-end justify-center h-[500px]">
        {/* Cartoon Characters */}
        <div className="relative" style={{ width: '550px', height: '400px' }}>
          {/* Purple tall rectangle character - Back layer */}
          <div 
            ref={purpleRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '70px',
              width: '180px',
              height: isTypingActive ? '440px' : '400px',
              backgroundColor: '#6C3FF5',
              borderRadius: '10px 10px 0 0',
              zIndex: 1,
              transform: isShowPwdActive
                ? `skewX(0deg)`
                : isTypingActive
                  ? `skewX(${(purplePos.bodySkew || 0) - 12}deg) translateX(40px)` 
                  : `skewX(${purplePos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Eyes */}
            <div 
              className="absolute flex gap-8 transition-all duration-700 ease-in-out"
              style={{
                left: isShowPwdActive ? `${20}px` : isLookingAtEachOther ? `${55}px` : `${45 + purplePos.faceX}px`,
                top: isShowPwdActive ? `${35}px` : isLookingAtEachOther ? `${65}px` : `${40 + purplePos.faceY}px`,
              }}
            >
              <EyeBall 
                size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" 
                isBlinking={isPurpleBlinking}
                forceLookX={isShowPwdActive ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                forceLookY={isShowPwdActive ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                mouseX={mouseX} mouseY={mouseY}
              />
              <EyeBall 
                size={18} pupilSize={7} maxDistance={5} eyeColor="white" pupilColor="#2D2D2D" 
                isBlinking={isPurpleBlinking}
                forceLookX={isShowPwdActive ? (isPurplePeeking ? 4 : -4) : isLookingAtEachOther ? 3 : undefined}
                forceLookY={isShowPwdActive ? (isPurplePeeking ? 5 : -4) : isLookingAtEachOther ? 4 : undefined}
                mouseX={mouseX} mouseY={mouseY}
              />
            </div>
          </div>

          {/* Black tall rectangle character - Middle layer */}
          <div 
            ref={blackRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '240px',
              width: '120px',
              height: '310px',
              backgroundColor: '#2D2D2D',
              borderRadius: '8px 8px 0 0',
              zIndex: 2,
              transform: isShowPwdActive
                ? `skewX(0deg)`
                : isLookingAtEachOther
                  ? `skewX(${(blackPos.bodySkew || 0) * 1.5 + 10}deg) translateX(20px)`
                  : isTypingActive
                    ? `skewX(${(blackPos.bodySkew || 0) * 1.5}deg)` 
                    : `skewX(${blackPos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Eyes */}
            <div 
              className="absolute flex gap-6 transition-all duration-700 ease-in-out"
              style={{
                left: isShowPwdActive ? `${10}px` : isLookingAtEachOther ? `${32}px` : `${26 + blackPos.faceX}px`,
                top: isShowPwdActive ? `${28}px` : isLookingAtEachOther ? `${12}px` : `${32 + blackPos.faceY}px`,
              }}
            >
              <EyeBall 
                size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking}
                forceLookX={isShowPwdActive ? -4 : isLookingAtEachOther ? 0 : undefined}
                forceLookY={isShowPwdActive ? -4 : isLookingAtEachOther ? -4 : undefined}
                mouseX={mouseX} mouseY={mouseY}
              />
              <EyeBall 
                size={16} pupilSize={6} maxDistance={4} eyeColor="white" pupilColor="#2D2D2D" isBlinking={isBlackBlinking}
                forceLookX={isShowPwdActive ? -4 : isLookingAtEachOther ? 0 : undefined}
                forceLookY={isShowPwdActive ? -4 : isLookingAtEachOther ? -4 : undefined}
                mouseX={mouseX} mouseY={mouseY}
              />
            </div>
          </div>

          {/* Orange semi-circle character - Front left */}
          <div 
            ref={orangeRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '0px',
              width: '240px',
              height: '200px',
              zIndex: 3,
              backgroundColor: '#FF9B6B',
              borderRadius: '120px 120px 0 0',
              transform: isShowPwdActive ? `skewX(0deg)` : `skewX(${orangePos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Eyes */}
            <div 
              className="absolute flex gap-8 transition-all duration-200 ease-out"
              style={{
                left: isShowPwdActive ? `${50}px` : `${82 + (orangePos.faceX || 0)}px`,
                top: isShowPwdActive ? `${85}px` : `${90 + (orangePos.faceY || 0)}px`,
              }}
            >
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={isShowPwdActive ? -5 : undefined} forceLookY={isShowPwdActive ? -4 : undefined} mouseX={mouseX} mouseY={mouseY} />
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={isShowPwdActive ? -5 : undefined} forceLookY={isShowPwdActive ? -4 : undefined} mouseX={mouseX} mouseY={mouseY} />
            </div>
          </div>

          {/* Yellow tall rectangle character - Front right */}
          <div 
            ref={yellowRef}
            className="absolute bottom-0 transition-all duration-700 ease-in-out"
            style={{
              left: '310px',
              width: '140px',
              height: '230px',
              backgroundColor: '#E8D754',
              borderRadius: '70px 70px 0 0',
              zIndex: 4,
              transform: isShowPwdActive ? `skewX(0deg)` : `skewX(${yellowPos.bodySkew || 0}deg)`,
              transformOrigin: 'bottom center',
            }}
          >
            {/* Eyes */}
            <div 
              className="absolute flex gap-6 transition-all duration-200 ease-out"
              style={{
                left: isShowPwdActive ? `${20}px` : `${52 + (yellowPos.faceX || 0)}px`,
                top: isShowPwdActive ? `${35}px` : `${40 + (yellowPos.faceY || 0)}px`,
              }}
            >
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={isShowPwdActive ? -5 : undefined} forceLookY={isShowPwdActive ? -4 : undefined} mouseX={mouseX} mouseY={mouseY} />
              <Pupil size={12} maxDistance={5} pupilColor="#2D2D2D" forceLookX={isShowPwdActive ? -5 : undefined} forceLookY={isShowPwdActive ? -4 : undefined} mouseX={mouseX} mouseY={mouseY} />
            </div>
            {/* Horizontal line for mouth */}
            <div 
              className="absolute w-20 h-[4px] bg-[#2D2D2D] rounded-full transition-all duration-200 ease-out"
              style={{
                left: isShowPwdActive ? `${10}px` : `${40 + (yellowPos.faceX || 0)}px`,
                top: isShowPwdActive ? `${88}px` : `${88 + (yellowPos.faceY || 0)}px`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="relative z-20 flex flex-col items-start text-xs text-[#692137]/60">
        <p>© {new Date().getFullYear()} LudenLab</p>
      </div>

      {/* Decorative elements */}
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
      <div className="absolute top-1/4 right-1/4 size-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 size-96 bg-[#FE703A]/10 rounded-full blur-3xl pointer-events-none" />
    </div>
  );
}
