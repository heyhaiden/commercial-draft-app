import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_STEPS = [
  {
    title: "Draft Complete! 🏈",
    description: "You've selected your 5 commercials. Now it's time to watch the game and rate ads as they air!",
    highlight: "Game Time",
  },
  {
    title: "Live Rating System",
    description: "When a commercial airs during the game, you'll get a popup to rate it from 1-5 stars. Rate quickly before time runs out!",
    highlight: "Rate Ads",
  },
  {
    title: "Points & Scoring",
    description: "Points = (Average Rating × 20) - 10. A 5-star ad gets 90 points, while a 1-star gets only 10 points.",
    highlight: "Scoring",
  },
  {
    title: "Track the Competition",
    description: "Check the Rank page to see live standings. Your score updates after each commercial is rated by all players.",
    highlight: "Leaderboard",
  },
];

export default function OnboardingTooltip({ show, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("hasSeenOnboarding");
    if (hasSeenOnboarding) {
      onComplete?.();
    }
  }, [onComplete]);

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem("hasSeenOnboarding", "true");
    onComplete?.();
  };

  const step = ONBOARDING_STEPS[currentStep];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#2d2d1e] to-[#1d1d0e] border-2 border-[#f4c542] p-6 relative"
          >
            {/* Close Button */}
            <button
              onClick={handleComplete}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#4a4a3a]/40 flex items-center justify-center hover:bg-[#5a5a4a]/40"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mb-6">
              {ONBOARDING_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? "w-8 bg-[#f4c542]"
                      : idx < currentStep
                      ? "w-2 bg-[#f4c542]/50"
                      : "w-2 bg-[#5a5a4a]"
                  }`}
                />
              ))}
            </div>

            {/* Content */}
            <div className="text-center mb-8">
              <div className="inline-block px-4 py-1 rounded-full bg-[#f4c542]/20 border border-[#f4c542]/30 mb-4">
                <p className="text-[#f4c542] text-xs font-bold tracking-wider">
                  {step.highlight}
                </p>
              </div>
              <h2 className="text-2xl font-black text-white mb-3">{step.title}</h2>
              <p className="text-[#a4a498] leading-relaxed">{step.description}</p>
            </div>

            {/* Navigation */}
            <div className="flex gap-3">
              {currentStep > 0 && (
                <Button
                  onClick={handlePrev}
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl bg-[#3d3d2e] border-[#5a5a4a]/30 text-white hover:bg-[#4a4a3a]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className={`h-12 rounded-2xl bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold ${
                  currentStep === 0 ? "w-full" : "flex-1"
                }`}
              >
                {currentStep === ONBOARDING_STEPS.length - 1 ? "Let's Play!" : "Next"}
                {currentStep < ONBOARDING_STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>

            {/* Skip Option */}
            <button
              onClick={handleComplete}
              className="w-full mt-4 text-[#a4a498] text-sm hover:text-white transition-colors"
            >
              Skip tutorial
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}