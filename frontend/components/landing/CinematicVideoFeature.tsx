'use client';

import { Pause, Play, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';

export function CinematicVideoFeature() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  async function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      await video.play();
    } else {
      video.pause();
    }
  }

  return (
    <section className="lma-film" id="film" aria-labelledby="film-heading">
      <div className="lma-shell">
        <div className="lma-film-heading">
          <div>
            <p className="lma-eyebrow"><Sparkles aria-hidden="true" /> A glimpse inside</p>
            <h2 id="film-heading">Learning can feel<br /><em>like a little bit of magic.</em></h2>
          </div>
          <p>One warm, visual moment from the world we are building for children and their families.</p>
        </div>

        <div className="lma-film-frame">
          <video
            ref={videoRef}
            className="lma-film-video"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster="/landing/hero-image.jpg"
            onCanPlay={(event) => {
              const video = event.currentTarget;
              if (!video.paused) return;
              video.play().then(() => setIsPaused(false)).catch(() => setIsPaused(true));
            }}
            onPause={() => setIsPaused(true)}
            onPlay={() => setIsPaused(false)}
          >
            <source src="/landing/That_edit_outside_1080p_202602061632.mp4" type="video/mp4" />
          </video>
          <div className="lma-film-overlay" aria-hidden="true" />
          <div className="lma-film-corner lma-film-corner-one" aria-hidden="true" />
          <div className="lma-film-corner lma-film-corner-two" aria-hidden="true" />
          <button
            type="button"
            className="lma-film-control"
            onClick={togglePlayback}
            aria-label={isPaused ? 'Play academy film' : 'Pause academy film'}
            aria-pressed={!isPaused}
          >
            {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          </button>
        </div>
        <p className="lma-film-note">A short looping film — it plays quietly, with no sound required.</p>
      </div>
    </section>
  );
}
