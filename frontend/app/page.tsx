'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Heart,
  Menu,
  Sparkles,
  Star,
  Users,
  X,
} from 'lucide-react';
import { BookingStudio } from '@/components/landing/BookingStudio';
import { CinematicVideoFeature } from '@/components/landing/CinematicVideoFeature';
import './landing.css';

const faqs = [
  {
    question: 'What ages do you welcome?',
    answer: 'Our learning paths are thoughtfully designed for children aged 4–16, with the pace and support adapted to the child in front of us.',
  },
  {
    question: 'Are sessions live or self-paced?',
    answer: 'Families can combine warm live mentorship with carefully guided lessons, so learning keeps moving even when life gets busy.',
  },
  {
    question: 'Can we meet a mentor first?',
    answer: 'Yes. A gentle introductory session lets your family meet a mentor and see whether the rhythm feels right before committing.',
  },
];

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <main className="lma-page">
      <section className="lma-hero" id="top">
        <div className="lma-hero-art" aria-hidden="true" />
        <div className="lma-hero-scrim" aria-hidden="true" />
        <div className="lma-hero-geometry" aria-hidden="true" />

        <div className="lma-shell lma-hero-shell">
          <header className="lma-site-header">
            <Link className="lma-brand" href="/" aria-label="Little Muslimah Academy home">
              <span className="lma-brand-mark"><Sparkles aria-hidden="true" /></span>
              <span>
                <strong>Little Muslimah</strong>
                <small>Academy</small>
              </span>
            </Link>

            <nav id="landing-navigation" className={`lma-header-nav ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Main navigation">
              <a href="#world" onClick={() => setMobileMenuOpen(false)}>Our world</a>
              <a href="#film" onClick={() => setMobileMenuOpen(false)}>In motion</a>
              <a href="#booking" onClick={() => setMobileMenuOpen(false)}>Meet a mentor</a>
              <a href="#questions" onClick={() => setMobileMenuOpen(false)}>Questions</a>
            </nav>

            <div className="lma-header-actions">
              <Link className="lma-header-signin" href="/sign-in">Sign in</Link>
              <Link className="lma-header-cta" href="/sign-up">
                <span>Begin together</span><ArrowRight aria-hidden="true" />
              </Link>
              <button
                type="button"
                className="lma-header-menu"
                aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls="landing-navigation"
                onClick={() => setMobileMenuOpen((open) => !open)}
              >
                {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
              </button>
            </div>
          </header>

          <div className="lma-hero-layout">
            <div className="lma-hero-copy">
              <p className="lma-eyebrow lma-hero-enter"><span className="lma-pulse" /> Faith-rooted learning for growing hearts</p>
              <h1 className="lma-hero-enter lma-delay-one">A beautiful start<br />to a <em>brighter inside.</em></h1>
              <p className="lma-hero-lead lma-hero-enter lma-delay-two">A colourful, faith-led learning home where children feel safe to ask, eager to explore, and proud of the small steps they take.</p>
              <div className="lma-hero-actions lma-hero-enter lma-delay-three">
                <Link href="/sign-up" className="lma-button lma-button-gold">Start with a free hello <ArrowRight aria-hidden="true" /></Link>
                <a href="#film" className="lma-hero-text-link">See the world in motion <span aria-hidden="true">↓</span></a>
              </div>
            </div>

            <aside className="lma-hero-fieldnote lma-hero-enter lma-delay-four">
              <div className="lma-fieldnote-icon"><Heart aria-hidden="true" /></div>
              <span>Made for the everyday</span>
              <p>Less pressure. More wonder. A gentle rhythm your family can keep.</p>
              <div><i>01</i><strong>Live mentorship<br />that feels personal</strong></div>
            </aside>
          </div>

          <div className="lma-hero-baseline lma-hero-enter lma-delay-four">
            <p>Quran <i /> Arabic <i /> Islamic studies</p>
            <div><Star aria-hidden="true" /> A calm, guided first step for every family</div>
          </div>
        </div>
      </section>

      <section className="lma-world" id="world">
        <div className="lma-shell">
          <div className="lma-world-layout">
            <div className="lma-world-copy">
              <p className="lma-eyebrow lma-eyebrow-dark">Not another online classroom</p>
              <h2>A world where<br /><em>curiosity belongs.</em></h2>
              <p>We turn timeless Islamic knowledge into meaningful moments children can return to with confidence — through stories, joyful practice, and mentors who notice the details.</p>
              <Link href="/sign-up" className="lma-text-link">See how your child can begin <ArrowRight aria-hidden="true" /></Link>
            </div>

            <div className="lma-world-gallery">
              <article className="lma-gallery-card lma-gallery-night">
                <Image src="/landing/stargazing.png" alt="Children discovering the night sky together" fill sizes="(max-width: 840px) 100vw, 42vw" />
                <div className="lma-gallery-shade" />
                <div><span>Wonder is welcome</span><h3>Big questions have a place here.</h3></div>
              </article>
              <article className="lma-gallery-card lma-gallery-story">
                <Image src="/landing/garden.png" alt="Children sharing a colourful story-led lesson" fill sizes="(max-width: 840px) 48vw, 24vw" />
                <div className="lma-gallery-shade" />
                <div><span>Story-led learning</span><h3>Lessons open like little worlds.</h3></div>
              </article>
              <article className="lma-gallery-message">
                <BookOpen aria-hidden="true" />
                <p>Children remember the way learning made them feel.</p>
                <span>Kind, clear, and full of colour.</span>
              </article>
            </div>
          </div>

          <div className="lma-proof-row">
            <ProofItem value="2,500+" label="young learners" />
            <ProofItem value="50+" label="trusted mentors" />
            <ProofItem value="4.9 / 5" label="parent rating" />
            <ProofItem value="15k" label="lessons loved" />
          </div>
        </div>
      </section>

      <section className="lma-rhythm" id="rhythm">
        <div className="lma-rhythm-glow" aria-hidden="true" />
        <div className="lma-shell lma-rhythm-layout">
          <div className="lma-rhythm-copy">
            <p className="lma-eyebrow">One learning world, thoughtfully held</p>
            <h2>A gentler rhythm.<br /><em>Deeper roots.</em></h2>
            <p>Every part of the academy works together, so children can discover at their own pace while parents always feel close to the journey.</p>
          </div>
          <div className="lma-rhythm-steps">
            <RhythmStep number="01" icon={<BookOpen aria-hidden="true" />} title="Discover" text="Story-led lessons turn curiosity into a natural next step." />
            <RhythmStep number="02" icon={<Users aria-hidden="true" />} title="Practise" text="Warm mentorship makes each next question feel safe to ask." />
            <RhythmStep number="03" icon={<Heart aria-hidden="true" />} title="Belong" text="Small, steady encouragement builds confidence that travels." />
          </div>
        </div>
      </section>

      <CinematicVideoFeature />
      <BookingStudio />

      <section className="lma-families" id="questions">
        <div className="lma-shell lma-families-layout">
          <aside className="lma-parent-note">
            <span className="lma-quote-mark">“</span>
            <p>It feels like someone has finally designed learning around the child, not around a timetable.</p>
            <div><span className="lma-parent-avatar">SM</span><span><strong>Sarah M.</strong><small>Parent in the academy</small></span></div>
          </aside>
          <div className="lma-faq-panel">
            <p className="lma-eyebrow lma-eyebrow-dark">For parents, too</p>
            <h2>Everything you need<br /><em>to feel ready.</em></h2>
            <div className="lma-faq-list">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <article className={`lma-faq-item ${isOpen ? 'is-open' : ''}`} key={faq.question}>
                    <button type="button" aria-expanded={isOpen} onClick={() => setOpenFaq(isOpen ? null : index)}>
                      <span>{faq.question}</span><ChevronDown aria-hidden="true" />
                    </button>
                    <div className="lma-faq-answer"><p>{faq.answer}</p></div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="lma-final-cta">
        <div className="lma-final-pattern" aria-hidden="true" />
        <div className="lma-shell lma-final-content">
          <span className="lma-final-spark"><Sparkles aria-hidden="true" /></span>
          <p className="lma-eyebrow">A beautiful place to begin</p>
          <h2>Give their curiosity<br /><em>a place to grow.</em></h2>
          <p>Begin with a free family account, then choose a gentle first session when you are ready.</p>
          <Link href="/sign-up" className="lma-button lma-button-light">Create your family account <ArrowRight aria-hidden="true" /></Link>
        </div>
      </section>

      <footer className="lma-footer">
        <div className="lma-shell lma-footer-inner">
          <Link className="lma-brand lma-brand-footer" href="/">
            <span className="lma-brand-mark"><Sparkles aria-hidden="true" /></span>
            <span><strong>Little Muslimah</strong><small>Academy</small></span>
          </Link>
          <p>Faith-rooted learning for curious, growing hearts.</p>
          <div><a href="#world">Our world</a><a href="#booking">Mentors</a><Link href="/sign-in">Sign in</Link></div>
        </div>
      </footer>
    </main>
  );
}

function ProofItem({ value, label }: { value: string; label: string }) {
  return <div><strong>{value}</strong><span>{label}</span></div>;
}

function RhythmStep({ number, icon, title, text }: { number: string; icon: ReactNode; title: string; text: string }) {
  return <article className="lma-rhythm-step"><span className="lma-rhythm-icon">{icon}</span><small>{number}</small><h3>{title}</h3><p>{text}</p></article>;
}
