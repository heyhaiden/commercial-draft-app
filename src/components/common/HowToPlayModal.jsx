import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Users, Star, TrendingUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const slides = [
  {
    icon: Users,
    title: "Join a Room",
    description: "Get your room code from the commissioner and join with up to 8 players. Choose your icon and get ready to draft!"
  },
  {
    icon: Trophy,
    title: "Draft Your Lineup",
    description: "Pick 5 commercials you think will be fan favorites. Snake draft style—choose wisely! Timer's ticking, so don't miss your turn."
  },
  {
    icon: Star,
    title: "Watch & Rate",
    description: "Rate each commercial as it airs during THE BIG GAME. Give stars from 1-5. Your ratings power the points!"
  },
  {
    icon: TrendingUp,
    title: "Track Your Score",
    description: "Higher average ratings = more points. Watch the leaderboard live and see if you've got what it takes to win!"
  },
  {
    icon: null,
    title: "Scoring System",
    description: "Each commercial earns points based on its average star rating from all players.",
    scoring: true
  }
];

export default function HowToPlayModal({ show, onClose }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleClose = () => {
    setCurrentSlide(0);
    onClose();
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={handleClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-[#2d2d1e] rounded-3xl border-2 border-[#5a5a4a]/30 max-w-md w-full">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#f4c542] to-[#d4a532] p-6 rounded-t-3xl">
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#2d2d1e]/50 flex items-center justify-center hover:bg-[#2d2d1e] transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
                <h2 className="text-2xl font-black text-[#2d2d1e] italic">HOW TO PLAY</h2>
                <p className="text-[#3d3d2e] text-sm mt-1">Draft. Watch. Win.</p>
              </div>

              {/* Slide Content */}
              <div className="p-8 min-h-[320px] flex flex-col">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="flex-1 flex flex-col items-center text-center"
                  >
                    {slides[currentSlide].scoring ? (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center mb-6">
                          <span className="text-3xl">💡</span>
                        </div>
                        <h3 className="text-white font-black text-2xl mb-4">{slides[currentSlide].title}</h3>
                        <p className="text-[#a4a498] text-sm mb-6">{slides[currentSlide].description}</p>
                        <div className="rounded-2xl bg-[#3d3d2e] border border-[#5a5a4a]/30 p-4 w-full">
                          <div className="text-white text-xs space-y-1">
                            <div>5 stars = 90 pts</div>
                            <div>4 stars = 70 pts</div>
                            <div>3 stars = 50 pts</div>
                            <div>2 stars = 30 pts</div>
                            <div>1 star = 10 pts</div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#f4c542] to-[#d4a532] flex items-center justify-center mb-6">
                          {React.createElement(slides[currentSlide].icon, { className: "w-8 h-8 text-[#2d2d1e]" })}
                        </div>
                        <h3 className="text-white font-black text-2xl mb-4">{currentSlide + 1}. {slides[currentSlide].title}</h3>
                        <p className="text-[#a4a498] text-base leading-relaxed">{slides[currentSlide].description}</p>
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Navigation */}
              <div className="px-8 pb-8">
                {/* Dots */}
                <div className="flex justify-center gap-2 mb-6">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`h-2 rounded-full transition-all ${
                        index === currentSlide 
                          ? "w-8 bg-[#f4c542]" 
                          : "w-2 bg-[#5a5a4a]/50 hover:bg-[#5a5a4a]"
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  {currentSlide > 0 && (
                    <Button
                      onClick={prevSlide}
                      variant="outline"
                      className="flex-1 h-12 rounded-2xl bg-transparent border-2 border-[#5a5a4a]/40 hover:border-[#f4c542] hover:bg-[#f4c542]/10 text-white font-bold"
                    >
                      <ChevronLeft className="w-5 h-5 mr-1" />
                      Back
                    </Button>
                  )}
                  {currentSlide < slides.length - 1 ? (
                    <Button
                      onClick={nextSlide}
                      className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold"
                    >
                      Next
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleClose}
                      className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-[#f4c542] to-[#d4a532] hover:from-[#e4b532] hover:to-[#c49522] text-[#2d2d1e] font-bold"
                    >
                      GOT IT, LET'S PLAY!
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}