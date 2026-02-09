import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ONBOARDING_STEPS = [
  {
    title: "Welcome to Commercial Draft! 🏈",
    description: "Fantasy football meets the Super Bowl! Draft your favorite commercials and compete with friends based on viewer ratings.",
    highlight: "How to Play",
  },
  {
    title: "Draft Your Lineup",
    description: "Choose 5 brands across different categories. Pick wisely - your score depends on how viewers rate each commercial!",
    highlight: "Draft Phase",
  },
  {
    title: "Rate & Score",
    description: "During the game, rate commercials as they air (1-5 stars). Your picks earn points based on average viewer ratings.",
    highlight: "Live Scoring",
  },
  {
    title: "Climb the Leaderboard",
    description: "Track your rank in real-time and compete to become the ultimate commercial scout. May the best drafter win!",
    highlight: "Competition",
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