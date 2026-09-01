'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, Check, Clock3, Sparkles, Users } from 'lucide-react';
import { useMemo, useState } from 'react';

type Mentor = {
  id: string;
  name: string;
  focus: string;
  initials: string;
  image: string;
};

const mentors: Mentor[] = [
  { id: 'sarah', name: 'Ustadha Sarah', focus: 'Quran and Tajweed', initials: 'US', image: '/landing/hijabi_mentor_1.png' },
  { id: 'fatima', name: 'Ustadha Fatima', focus: 'Islamic History', initials: 'UF', image: '/landing/hijabi_mentor_2.png' },
  { id: 'karim', name: 'Ustadh Karim', focus: 'Arabic Language', initials: 'UK', image: '/landing/muslim_mentor_male.png' },
];

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const availableDates = new Set([12, 13, 14, 15, 16, 17, 18, 19, 20]);
const slotOptions = ['4:00 PM', '5:30 PM', '7:00 PM'];

const monthCells = [
  ...Array<null>(4).fill(null),
  ...Array.from({ length: 31 }, (_, index) => ({
    date: index + 1,
    weekday: weekDays[(index + 4) % weekDays.length],
    available: availableDates.has(index + 1),
  })),
];

export function BookingStudio() {
  const [mentorId, setMentorId] = useState('sarah');
  const [selectedDate, setSelectedDate] = useState(15);
  const [selectedSlot, setSelectedSlot] = useState('5:30 PM');

  const mentor = useMemo(
    () => mentors.find((item) => item.id === mentorId) ?? mentors[0],
    [mentorId],
  );
  const selectedWeekday = weekDays[(selectedDate + 3) % weekDays.length];

  return (
    <section className="lma-booking" id="booking" aria-labelledby="booking-heading">
      <div className="lma-shell">
        <div className="lma-booking-heading">
          <div>
            <p className="lma-eyebrow lma-eyebrow-dark">Your first hello</p>
            <h2 id="booking-heading">Choose a time<br /><em>that feels easy.</em></h2>
          </div>
          <p>Explore a sample introduction schedule, then create your family account when you are ready.</p>
        </div>

        <div className="lma-studio">
          <aside className="lma-studio-mentors" aria-label="Choose a mentor">
            <div className="lma-studio-rail-head">
              <span>01 / Choose a guide</span>
              <Users aria-hidden="true" />
            </div>
            <div className="lma-studio-mentor-list">
              {mentors.map((item) => {
                const selected = item.id === mentorId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`lma-studio-mentor ${selected ? 'is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => setMentorId(item.id)}
                  >
                    <span className="lma-studio-avatar">
                      <Image src={item.image} alt="" width={60} height={60} />
                      <b>{item.initials}</b>
                    </span>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.focus}</small>
                    </span>
                    {selected && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <div className="lma-studio-rail-note"><Sparkles aria-hidden="true" /><span>Gentle guidance, a relaxed first conversation, and no commitment.</span></div>
          </aside>

          <div className="lma-studio-calendar">
            <div className="lma-studio-calendar-head">
              <div>
                <span>02 / Find a day</span>
                <h3>May <em>2026</em></h3>
              </div>
              <div className="lma-studio-timezone"><CalendarDays aria-hidden="true" /> Dubai time</div>
            </div>
            <div className="lma-month-weekdays" aria-hidden="true">
              {weekDays.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="lma-month-grid" aria-label="May 2026 availability preview">
              {monthCells.map((cell, index) => {
                if (!cell) return <span className="lma-month-blank" key={`blank-${index}`} aria-hidden="true" />;
                const selected = cell.date === selectedDate;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    className={`lma-month-day ${cell.available ? 'is-available' : ''} ${selected ? 'is-selected' : ''}`}
                    disabled={!cell.available}
                    aria-pressed={selected}
                    aria-label={`${cell.weekday}, May ${cell.date}${cell.available ? ', available' : ', unavailable'}`}
                    onClick={() => setSelectedDate(cell.date)}
                  >
                    <span>{cell.date}</span>
                    {cell.available && <i aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <p className="lma-calendar-key"><i aria-hidden="true" /> Available introduction days</p>
          </div>

          <aside className="lma-studio-agenda" aria-label="Choose a session time">
            <div className="lma-studio-agenda-head">
              <span>03 / Pick a moment</span>
              <p>{selectedWeekday}, May {selectedDate}</p>
            </div>
            <div className="lma-studio-session-meta"><Clock3 aria-hidden="true" /> 30 minute introduction</div>
            <div className="lma-studio-slot-list">
              {slotOptions.map((slot) => {
                const selected = slot === selectedSlot;
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`lma-studio-slot ${selected ? 'is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <Clock3 aria-hidden="true" />
                    <span>{slot}</span>
                    {selected && <Check aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
            <div className="lma-studio-summary">
              <span>Your introduction</span>
              <strong>{mentor.name}</strong>
              <p>{selectedWeekday}, May {selectedDate} <i aria-hidden="true" /> {selectedSlot}</p>
              <Link href="/sign-up" className="lma-studio-cta">Continue with this time <ArrowRight aria-hidden="true" /></Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
