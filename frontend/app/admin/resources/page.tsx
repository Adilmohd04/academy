"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Video,
  Link as LinkIcon,
  BookOpen,
  Search,
  Plus,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  ExternalLink,
  X,
  Loader2,
  Sparkles,
  ShieldCheck,
  Layers3,
} from "lucide-react";

import { api } from "@/lib/api";

interface Resource {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string;
  status: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  profiles?: { full_name: string } | null;
}

type TabStatus = "all" | "pending" | "approved" | "rejected";

const typeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="w-5 h-5" />,
  video: <Video className="w-5 h-5" />,
  link: <LinkIcon className="w-5 h-5" />,
  book: <BookOpen className="w-5 h-5" />,
};

export default function AdminResourcesPage() {
  const { getToken } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newType, setNewType] = useState("document");
  const [newUrl, setNewUrl] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      const token = await getToken();
      const response = await api.admin.getResources(token);
      setResources(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id);
    try {
      const token = await getToken();
      const response = await api.admin.updateResourceStatus(id, status, token);
      if (response.status >= 200 && response.status < 300) {
        setResources((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      }
    } catch (err) {
      console.error(`Failed to ${status} resource:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    setActionLoading(id);
    try {
      const token = await getToken();
      const response = await api.admin.deleteResource(id, token);
      if (response.status >= 200 && response.status < 300) {
        setResources((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete resource:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) return;
    setCreateLoading(true);
    try {
      const token = await getToken();
      const response = await api.admin.createResource({
          title: newTitle,
          description: newDescription || null,
          type: newType,
          url: newUrl,
        }, token);
      if (response.status >= 200 && response.status < 300) {
        setShowCreateModal(false);
        setNewTitle("");
        setNewDescription("");
        setNewType("document");
        setNewUrl("");
        loadResources();
      }
    } catch (err) {
      console.error("Failed to create resource:", err);
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = resources.filter((r) => {
    const matchesTab = activeTab === "all" || r.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs: { label: string; value: TabStatus; count: number }[] = [
    { label: "All", value: "all", count: resources.length },
    { label: "Pending", value: "pending", count: resources.filter((r) => r.status === "pending").length },
    { label: "Approved", value: "approved", count: resources.filter((r) => r.status === "approved").length },
    { label: "Rejected", value: "rejected", count: resources.filter((r) => r.status === "rejected").length },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#587067]">
          <Loader2 className="w-8 h-8 animate-spin text-[#1f5b4b]" />
          <p className="text-sm font-medium">Loading resources</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-wrap space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[rgba(230,225,213,0.95)] bg-[#20342d] p-8 text-white shadow-[0_20px_55px_rgba(18,30,24,0.18)]">
        <div className="absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, rgba(199,169,107,0.32) 0, transparent 30%), radial-gradient(circle at 85% 0%, rgba(255,255,255,0.10) 0, transparent 24%), radial-gradient(circle at 100% 100%, rgba(31,91,75,0.34) 0, transparent 30%)' }} />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="admin-kicker !bg-white/10 !text-white !border-white/10 mb-3">Content library</p>
            <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">Resource management</h1>
            <p className="mt-3 max-w-2xl text-white/75 leading-7">Review learning materials, approve useful assets, and keep the knowledge library tidy and easy to scan.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <MiniStat label="Total" value={resources.length} icon={<Layers3 className="h-4 w-4" />} />
            <MiniStat label="Pending" value={resources.filter((r) => r.status === 'pending').length} icon={<Clock className="h-4 w-4" />} />
            <MiniStat label="Approved" value={resources.filter((r) => r.status === 'approved').length} icon={<ShieldCheck className="h-4 w-4" />} />
            <MiniStat label="Drafting" value={resources.filter((r) => r.status === 'rejected').length} icon={<Sparkles className="h-4 w-4" />} />
          </div>
        </div>
      </section>

      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7b857d]" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="admin-panel w-full pl-10 pr-4 py-3"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-btn-primary inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 font-semibold whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          Add resource
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.value
                ? 'bg-[#1f5b4b] text-white shadow-md'
                : 'bg-white text-[#6f7a72] border border-[#e6e1d5] hover:bg-[#f6f2e8]'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="admin-panel text-center py-12 text-[#6f7a72]">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No resources found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((resource) => (
              <motion.div
                key={resource.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="admin-panel p-5"
              >
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-2 bg-[#f4f1ea] rounded-lg text-[#1f5b4b] border border-[#e6e1d5]">
                      {typeIcons[resource.type] || <FileText className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-[#1f2a24] truncate">{resource.title}</h3>
                      <p className="text-xs text-[#6f7a72]">{resource.profiles?.full_name || 'Unknown creator'}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    resource.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : resource.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {resource.status}
                  </span>
                </div>

                <p className="text-sm text-[#6f7a72] line-clamp-3 mb-4">{resource.description || 'No description provided.'}</p>

                <div className="flex items-center gap-2 text-xs text-[#6f7a72] mb-4">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(resource.created_at).toLocaleString()}
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-[#f4f1ea] text-[#1f5b4b] text-sm font-semibold hover:bg-[#e9e2d3]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open
                  </a>

                  {resource.status !== "approved" && (
                    <button
                      onClick={() => handleStatusUpdate(resource.id, "approved")}
                      disabled={actionLoading === resource.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                  {resource.status !== "rejected" && (
                    <button
                      onClick={() => handleStatusUpdate(resource.id, "rejected")}
                      disabled={actionLoading === resource.id}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(resource.id)}
                    disabled={actionLoading === resource.id}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-[#e6e1d5] text-[#6f7a72] text-sm font-semibold hover:bg-[#f6f2e8] disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="admin-panel w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="admin-kicker mb-2">Add new resource</p>
                <h2 className="admin-section-title">Create resource</h2>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="admin-btn-muted rounded-full p-2">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="admin-panel px-4 py-3" />
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="admin-panel px-4 py-3">
                  <option value="document">Document</option>
                  <option value="video">Video</option>
                  <option value="link">Link</option>
                  <option value="book">Book</option>
                </select>
              </div>
              <textarea value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" rows={4} className="admin-panel w-full px-4 py-3" />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="admin-panel w-full px-4 py-3" />
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowCreateModal(false)} className="admin-btn-muted rounded-full px-4 py-2 font-semibold">Cancel</button>
                <button type="submit" disabled={createLoading} className="admin-btn-primary rounded-full px-5 py-2 font-semibold disabled:opacity-60">
                  {createLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/15 bg-white/10 backdrop-blur-md p-4">
      <div className="flex items-center justify-between gap-3 text-white/80 mb-3">
        <span className="text-xs uppercase tracking-[0.18em] font-semibold">{label}</span>
        <span className="rounded-full bg-white/10 p-2">{icon}</span>
      </div>
      <p className="text-2xl font-semibold text-white truncate">{value}</p>
    </div>
  )
}
