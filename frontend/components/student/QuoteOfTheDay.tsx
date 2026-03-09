'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote } from 'lucide-react';

const quotes = [
  { text: "Read! In the name of your Lord who created.", source: "Surah Al-Alaq 96:1" },
  { text: "And say: My Lord, increase me in knowledge.", source: "Surah Taha 20:114" },
  { text: "Seeking knowledge is a duty upon every Muslim.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "The best of you are those who learn the Quran and teach it.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "Allah will raise those who have believed among you and those who were given knowledge, by degrees.", source: "Surah Al-Mujadila 58:11" },
  { text: "He who follows a path in quest of knowledge, Allah will make the path of Jannah easy to him.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "Knowledge is light.", source: "Imam Shafi'i" },
  { text: "Acquire knowledge, and learn tranquility and dignity.", source: "Umar ibn Al-Khattab (RA)" },
  { text: "Indeed, with hardship [will be] ease.", source: "Surah Ash-Sharh 94:6" },
  { text: "So remember Me; I will remember you.", source: "Surah Al-Baqarah 2:152" },
  { text: "And He found you lost and guided [you].", source: "Surah Ad-Duhaa 93:7" },
  { text: "My Lord, indeed I am, for whatever good You would send down to me, in need.", source: "Surah Al-Qasas 28:24" },
  { text: "Indeed, Allah is with the patient.", source: "Surah Al-Baqarah 2:153" },
  { text: "And whoever puts his trust in Allah, then He will suffice him.", source: "Surah At-Talaq 65:3" },
  { text: "Speak a good word or remain silent.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "The strong believer is better and more beloved to Allah than the weak believer, while there is good in both.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "Do not be sad, indeed Allah is with us.", source: "Surah At-Tawbah 9:40" },
  { text: "And We have certainly made the Quran easy for remembrance, so is there any who will remember?", source: "Surah Al-Qamar 54:17" },
  { text: "Call upon Me; I will respond to you.", source: "Surah Ghafir 40:60" },
  { text: "Verily, in the remembrance of Allah do hearts find rest.", source: "Surah Ar-Ra'd 13:28" },
  { text: "Be patient over what befalls you.", source: "Surah Luqman 31:17" },
  { text: "Allah does not burden a soul beyond that it can bear.", source: "Surah Al-Baqarah 2:286" },
  { text: "And speak to people good [words].", source: "Surah Al-Baqarah 2:83" },
  { text: "None of you [truly] believes until he loves for his brother that which he loves for himself.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "Cleanliness is half of faith.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "A good word is charity.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "The most beloved of deeds to Allah are those that are most consistent, even if they are small.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "Modesty brings nothing but good.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "Richness is not having many possessions, but richness is being content with oneself.", source: "Prophet Muhammad (peace be upon him)" },
  { text: "Make things easy and do not make them difficult.", source: "Prophet Muhammad (peace be upon him)" }
];

export const QuoteOfTheDay = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Rotate quote every 10 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % quotes.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative bg-gradient-to-br from-[#1e293b] to-[#0F172A] rounded-3xl p-8 text-center h-full min-h-[240px] flex flex-col items-center justify-center shadow-xl overflow-hidden group">
      {/* Islamic Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <Quote className="w-8 h-8 text-[#C5A059]/40 absolute top-6 left-6 rotate-180" />
      
      <div className="flex-1 flex items-center justify-center w-full relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="max-w-md"
          >
            <p className="text-lg md:text-xl font-serif text-[#F8FAFC] mb-4 leading-relaxed italic">
              "{quotes[currentIndex].text}"
            </p>
            <div className="inline-block border-t border-[#C5A059]/30 pt-3 mt-2">
              <p className="text-xs font-bold text-[#C5A059] uppercase tracking-widest">
                {quotes[currentIndex].source}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <Quote className="w-8 h-8 text-[#C5A059]/40 absolute bottom-6 right-6" />
    </div>
  );
};
