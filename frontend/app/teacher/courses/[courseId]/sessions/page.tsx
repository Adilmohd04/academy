"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

interface LiveSession {
  session_id: string;
  topic: string;
  scheduled_time: string;
  duration_minutes: number;
  meeting_link: string;
  is_live: boolean;
  recording_url?: string;
}

export default function LiveSessionsPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const courseId = params.id as string;

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    topic: "",
    scheduled_time: "",
    duration_minutes: 60,
    meeting_link: "",
  });

  useEffect(() => {
    loadSessions();
  }, [courseId]);

  const loadSessions = async () => {
    try {
      const token = await getToken();
      const response = await fetch(
        `${API_BASE_URL}/api/live-sessions?course_id=${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await response.json();
      if (response.ok) {
        setSessions(data);
      }
    } catch (err) {
      console.error("Failed to load sessions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = await getToken();
      const response = await fetch(`${API_BASE_URL}/api/live-sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          course_id: courseId,
          ...formData,
        }),
      });

      if (response.ok) {
        setFormData({
          topic: "",
          scheduled_time: "",
          duration_minutes: 60,
          meeting_link: "",
        });
        setShowCreateForm(false);
        loadSessions();
      }
    } catch (err) {
      console.error("Failed to create session", err);
    }
  };

  const handleMarkAsLive = async (sessionId: string, isLive: boolean) => {
    try {
      const token = await getToken();
      const endpoint = isLive ? "start" : "end";
      await fetch(`${API_BASE_URL}/api/live-sessions/${sessionId}/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      loadSessions();
    } catch (err) {
      console.error("Failed to update session status", err);
    }
  };

  const handleAddRecording = async (sessionId: string) => {
    const recordingUrl = prompt("Enter YouTube recording URL:");
    if (!recordingUrl) return;

    try {
      const token = await getToken();
      await fetch(`${API_BASE_URL}/api/live-sessions/${sessionId}/recording`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recording_url: recordingUrl }),
      });
      loadSessions();
    } catch (err) {
      console.error("Failed to add recording", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const upcomingSessions = sessions.filter(
    (s) => new Date(s.scheduled_time) > new Date()
  );
  const pastSessions = sessions.filter(
    (s) => new Date(s.scheduled_time) <= new Date()
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-emerald-100 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-emerald-800">
                Live Sessions
              </h1>
              <p className="text-gray-600 mt-1">
                Schedule and manage your live teaching sessions
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              + Schedule Session
            </button>
          </div>

          {/* Upcoming Sessions */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Upcoming Sessions
            </h2>
            {upcomingSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No upcoming sessions scheduled
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="border border-emerald-200 rounded-lg p-6 bg-white"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {session.topic}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            📅{" "}
                            {new Date(session.scheduled_time).toLocaleString()}
                          </p>
                          <p>⏱️ Duration: {session.duration_minutes} minutes</p>
                          <a
                            href={session.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline block"
                          >
                            🔗 {session.meeting_link}
                          </a>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {session.is_live ? (
                          <>
                            <span className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold animate-pulse">
                              🔴 LIVE
                            </span>
                            <button
                              onClick={() =>
                                handleMarkAsLive(session.session_id, false)
                              }
                              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                              End Session
                            </button>
                            <button
                              onClick={() => handleAddRecording(session.session_id)}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                            >
                              Add Recording
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              handleMarkAsLive(session.session_id, true)
                            }
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                          >
                            Mark as Live
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Sessions */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Past Sessions
            </h2>
            {pastSessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No past sessions
              </p>
            ) : (
              <div className="space-y-4">
                {pastSessions.map((session) => (
                  <div
                    key={session.session_id}
                    className="border border-gray-200 rounded-lg p-6 bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {session.topic}
                        </h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            📅{" "}
                            {new Date(session.scheduled_time).toLocaleString()}
                          </p>
                          {session.recording_url ? (
                            <a
                              href={session.recording_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-600 hover:underline block"
                            >
                              🎥 View Recording
                            </a>
                          ) : (
                            <button
                              onClick={() => handleAddRecording(session.session_id)}
                              className="text-blue-600 hover:underline text-sm"
                            >
                              + Add Recording URL
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create Session Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4">
              <h2 className="text-2xl font-bold text-emerald-800 mb-6">
                Schedule Live Session
              </h2>
              <form onSubmit={handleCreateSession} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Topic *
                  </label>
                  <input
                    type="text"
                    value={formData.topic}
                    onChange={(e) =>
                      setFormData({ ...formData, topic: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="e.g., Q&A Session - Week 1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_time}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        scheduled_time: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        duration_minutes: Number(e.target.value),
                      })
                    }
                    required
                    min="15"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Google Meet / Zoom Link *
                  </label>
                  <input
                    type="url"
                    value={formData.meeting_link}
                    onChange={(e) =>
                      setFormData({ ...formData, meeting_link: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                  >
                    Schedule Session
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
