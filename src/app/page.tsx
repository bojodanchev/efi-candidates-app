"use client";

import { useEffect, useState, useCallback } from "react";

interface ScheduledEmail {
  id: string;
  emailNumber: number;
  templateId: number;
  subject: string;
  scheduledFor: string;
  status: "SCHEDULED" | "SENT" | "FAILED";
  sentAt: string | null;
}

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  birthDate: string | null;
  heightCm: number | null;
  instagram: string | null;
  tiktok: string | null;
  city: string | null;
  category: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedAt: string | null;
  photoUrls: string[];
  emailSequenceStartedAt: string | null;
  scheduledEmails: ScheduledEmail[];
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED";

// Extract Instagram username and get avatar URL
const getInstagramPhoto = (igUrl: string | null): string | null => {
  if (!igUrl) return null;
  const username = igUrl.match(/instagram\.com\/([^/?]+)/)?.[1];
  if (!username || username === "p" || username === "reel") return null;
  return `https://unavatar.io/instagram/${username}`;
};

const getInstagramUsername = (igUrl: string | null): string | null => {
  if (!igUrl) return null;
  const username = igUrl.match(/instagram\.com\/([^/?]+)/)?.[1];
  if (!username || username === "p" || username === "reel") return null;
  return `@${username}`;
};

const getTikTokUsername = (ttUrl: string | null): string | null => {
  if (!ttUrl) return null;
  const username = ttUrl.match(/tiktok\.com\/@?([^/?]+)/)?.[1];
  if (!username) return null;
  return username.startsWith("@") ? username : `@${username}`;
};

// Calculate age from birth date
const calculateAge = (birthDate: string | null): number | null => {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [availableCities, setAvailableCities] = useState<string[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [minAge, setMinAge] = useState<string>("");
  const [maxAge, setMaxAge] = useState<string>("");

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  // Counts for tabs (separate fetch for totals)
  const [counts, setCounts] = useState({ all: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 });

  const fetchCandidates = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "50");

      if (statusFilter !== "all") params.set("status", statusFilter);
      if (cityFilter) params.set("city", cityFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (minAge) params.set("minAge", minAge);
      if (maxAge) params.set("maxAge", maxAge);

      const res = await fetch(`/api/candidates?${params}`);
      const data = await res.json();

      setCandidates(data.candidates || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, totalPages: 0 });
      setAvailableCities(data.filters?.cities || []);

      // Auto-select first candidate
      if (data.candidates?.length > 0 && !selectedCandidate) {
        setSelectedCandidate(data.candidates[0]);
      }
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, cityFilter, searchQuery, minAge, maxAge]);

  // Fetch counts separately (without filters)
  const fetchCounts = async () => {
    try {
      const [all, pending, approved, rejected] = await Promise.all([
        fetch("/api/candidates?limit=1").then(r => r.json()),
        fetch("/api/candidates?limit=1&status=PENDING").then(r => r.json()),
        fetch("/api/candidates?limit=1&status=APPROVED").then(r => r.json()),
        fetch("/api/candidates?limit=1&status=REJECTED").then(r => r.json()),
      ]);
      setCounts({
        all: all.pagination?.total || 0,
        PENDING: pending.pagination?.total || 0,
        APPROVED: approved.pagination?.total || 0,
        REJECTED: rejected.pagination?.total || 0,
      });
    } catch (error) {
      console.error("Failed to fetch counts:", error);
    }
  };

  useEffect(() => {
    fetchCandidates(1);
    fetchCounts();
  }, []);

  // Refetch when filters change
  useEffect(() => {
    fetchCandidates(1);
  }, [statusFilter, cityFilter, minAge, maxAge]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCandidates(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewedBy: "Dashboard Admin" }),
      });

      if (res.ok) {
        await fetchCandidates(pagination.page);
        await fetchCounts();
        if (selectedCandidate?.id === id) {
          setSelectedCandidate(prev => prev ? { ...prev, status } : null);
        }
      }
    } catch (error) {
      console.error("Failed to update candidate:", error);
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("bg-BG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const clearFilters = () => {
    setCityFilter("");
    setMinAge("");
    setMaxAge("");
    setSearchQuery("");
  };

  const hasActiveFilters = cityFilter || minAge || maxAge || searchQuery;

  const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
      PENDING: "border border-[#c9a227] text-[#c9a227]",
      APPROVED: "bg-green-600 text-white",
      REJECTED: "bg-[#333] text-[#666] line-through",
    };
    const labels = {
      PENDING: "Чакащ",
      APPROVED: "Одобрен",
      REJECTED: "Отхвърлен",
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const InitialsAvatar = ({ firstName, lastName, size = "sm" }: { firstName: string; lastName: string; size?: "sm" | "lg" }) => {
    const sizeClasses = size === "lg" ? "h-32 w-32 text-3xl" : "h-10 w-10 text-sm";
    return (
      <div className={`${sizeClasses} rounded-lg bg-gradient-to-br from-[#c9a227] to-[#8b6914] flex items-center justify-center text-black font-semibold`}>
        {firstName[0]}{lastName[0]}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-[#2a2a2a] px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold text-[#c9a227] tracking-wide">
                EFI CASTING
              </h1>
              <p className="text-xs text-[#555] mt-0.5">
                European Fashion Institute
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Търси по име..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 px-4 py-2 pl-10 bg-[#1a1a1a] border border-[#333] rounded-lg text-white text-sm placeholder-[#555] focus:outline-none focus:border-[#c9a227] transition-colors"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#555]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555] hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-6">
            {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                  statusFilter === status
                    ? "text-[#c9a227] border-[#c9a227]"
                    : "text-[#888] border-transparent hover:text-white"
                }`}
              >
                {status === "all" ? "Всички" : status === "PENDING" ? "Чакащи" : status === "APPROVED" ? "Одобрени" : "Отхвърлени"}
                <span className="ml-1.5 text-xs opacity-60">
                  {counts[status]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Additional Filters Row */}
        <div className="flex items-center gap-4 mt-4">
          {/* City Filter */}
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="px-3 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#c9a227]"
          >
            <option value="">Всички градове</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {/* Age Range */}
          <div className="flex items-center gap-2">
            <span className="text-[#555] text-sm">Възраст:</span>
            <input
              type="number"
              placeholder="от"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
              className="w-16 px-2 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#c9a227]"
            />
            <span className="text-[#555]">-</span>
            <input
              type="number"
              placeholder="до"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              className="w-16 px-2 py-1.5 bg-[#1a1a1a] border border-[#333] rounded-lg text-white text-sm focus:outline-none focus:border-[#c9a227]"
            />
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-[#888] hover:text-white transition-colors"
            >
              Изчисти филтри
            </button>
          )}

          {/* Results count */}
          <span className="ml-auto text-sm text-[#555]">
            {pagination.total} резултата
          </span>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Candidates List */}
        <div className="w-[60%] border-r border-[#2a2a2a] flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#c9a227] border-t-transparent mx-auto"></div>
                  <p className="mt-3 text-[#555] text-sm">Зареждане...</p>
                </div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-[#555]">Няма намерени кандидати</p>
              </div>
            ) : (
              <div>
                {candidates.map((candidate) => {
                  const isSelected = selectedCandidate?.id === candidate.id;
                  const igPhoto = getInstagramPhoto(candidate.instagram);
                  const age = calculateAge(candidate.birthDate);

                  return (
                    <div
                      key={candidate.id}
                      onClick={() => setSelectedCandidate(candidate)}
                      className={`flex items-center gap-4 px-4 py-3 cursor-pointer border-l-2 transition-all ${
                        isSelected
                          ? "bg-[#1a1608] border-l-[#c9a227]"
                          : "border-l-transparent hover:bg-[#141414] hover:border-l-[#333]"
                      }`}
                    >
                      {/* Photo */}
                      {igPhoto ? (
                        <img
                          src={igPhoto}
                          alt={candidate.firstName}
                          className="h-10 w-10 rounded-lg object-cover border border-[#2a2a2a]"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={igPhoto ? 'hidden' : ''}>
                        <InitialsAvatar firstName={candidate.firstName} lastName={candidate.lastName} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">
                            {candidate.firstName} {candidate.lastName}
                          </span>
                        </div>
                        <div className="text-xs text-[#555] truncate">
                          {candidate.category || "Без категория"}
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-[#888]">
                        <span>{candidate.city || "-"}</span>
                        <span>{candidate.heightCm ? `${candidate.heightCm} см` : "-"}</span>
                        <span>{age ? `${age} год` : "-"}</span>
                      </div>

                      {/* Status */}
                      <StatusBadge status={candidate.status} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex-shrink-0 border-t border-[#2a2a2a] px-4 py-3 flex items-center justify-between">
              <button
                onClick={() => fetchCandidates(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="px-4 py-2 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#c9a227] transition-colors"
              >
                ← Предишна
              </button>
              <span className="text-sm text-[#888]">
                Страница {pagination.page} от {pagination.totalPages}
              </span>
              <button
                onClick={() => fetchCandidates(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="px-4 py-2 text-sm bg-[#1a1a1a] border border-[#333] rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#c9a227] transition-colors"
              >
                Следваща →
              </button>
            </div>
          )}
        </div>

        {/* Right Panel - Detail View */}
        <div className="w-[40%] bg-[#141414] overflow-y-auto">
          {selectedCandidate ? (
            <div className="p-6">
              {/* Header with Name & Status */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedCandidate.firstName} {selectedCandidate.lastName}
                  </h2>
                  <p className="text-[#888] text-sm mt-1">
                    {selectedCandidate.category || "Без категория"}
                  </p>
                </div>
                <StatusBadge status={selectedCandidate.status} />
              </div>

              {/* Photos Section */}
              <div className="mb-6">
                <div className="flex gap-3">
                  {/* Main Photo - Instagram or Initials */}
                  {getInstagramPhoto(selectedCandidate.instagram) ? (
                    <img
                      src={getInstagramPhoto(selectedCandidate.instagram)!}
                      alt={selectedCandidate.firstName}
                      className="h-32 w-32 rounded-xl object-cover border-2 border-[#2a2a2a]"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <InitialsAvatar
                      firstName={selectedCandidate.firstName}
                      lastName={selectedCandidate.lastName}
                      size="lg"
                    />
                  )}

                  {/* Submission Photos from Google Drive */}
                  {selectedCandidate.photoUrls && selectedCandidate.photoUrls.length > 0 ? (
                    selectedCandidate.photoUrls.slice(0, 3).map((photo, idx) => (
                      <a
                        key={idx}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={photo}
                          alt={`Снимка ${idx + 1}`}
                          className="h-32 w-32 rounded-xl object-cover border border-[#2a2a2a] cursor-pointer hover:border-[#c9a227] transition-colors"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect fill="%231a1a1a" width="128" height="128"/><text fill="%23444" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em">Грешка</text></svg>';
                          }}
                        />
                      </a>
                    ))
                  ) : (
                    <>
                      <div className="h-32 w-32 rounded-xl bg-[#1a1a1a] border border-dashed border-[#333] flex items-center justify-center">
                        <span className="text-[#444] text-xs text-center px-2">Няма снимки</span>
                      </div>
                    </>
                  )}
                </div>
                {selectedCandidate.photoUrls && selectedCandidate.photoUrls.length > 0 && (
                  <p className="text-xs text-[#555] mt-2">
                    {selectedCandidate.photoUrls.length} снимки от кандидатурата
                  </p>
                )}
              </div>

              {/* Details Section */}
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-[#c9a227] uppercase tracking-wider mb-3">
                  Детайли
                </h3>
                <div className="space-y-2">
                  <DetailRow label="Възраст" value={calculateAge(selectedCandidate.birthDate) ? `${calculateAge(selectedCandidate.birthDate)} години` : "-"} />
                  <DetailRow label="Височина" value={selectedCandidate.heightCm ? `${selectedCandidate.heightCm} см` : "-"} />
                  <DetailRow label="Град" value={selectedCandidate.city || "-"} />
                  <DetailRow label="Телефон" value={selectedCandidate.phone || "-"} />
                  <DetailRow label="Email" value={selectedCandidate.email} />
                  <DetailRow label="Дата" value={formatDate(selectedCandidate.submittedAt)} />
                </div>
              </div>

              {/* Social Section */}
              {(selectedCandidate.instagram || selectedCandidate.tiktok) && (
                <div className="mb-6">
                  <h3 className="text-xs font-semibold text-[#c9a227] uppercase tracking-wider mb-3">
                    Социални мрежи
                  </h3>
                  <div className="space-y-2">
                    {selectedCandidate.instagram && (
                      <a
                        href={selectedCandidate.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">IG</span>
                          </div>
                          <span className="text-white text-sm">{getInstagramUsername(selectedCandidate.instagram)}</span>
                        </div>
                        <span className="text-[#555] group-hover:text-[#c9a227] transition-colors">→</span>
                      </a>
                    )}
                    {selectedCandidate.tiktok && (
                      <a
                        href={selectedCandidate.tiktok}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-black border border-[#333] flex items-center justify-center">
                            <span className="text-white text-xs font-bold">TT</span>
                          </div>
                          <span className="text-white text-sm">{getTikTokUsername(selectedCandidate.tiktok)}</span>
                        </div>
                        <span className="text-[#555] group-hover:text-[#c9a227] transition-colors">→</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selectedCandidate.status === "PENDING" && (
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => updateStatus(selectedCandidate.id, "APPROVED")}
                    disabled={updating === selectedCandidate.id}
                    className="flex-1 py-3 bg-[#c9a227] text-black font-semibold rounded-lg hover:bg-[#ddb52f] disabled:opacity-50 transition-colors"
                  >
                    {updating === selectedCandidate.id ? "..." : "Одобри ✓"}
                  </button>
                  <button
                    onClick={() => updateStatus(selectedCandidate.id, "REJECTED")}
                    disabled={updating === selectedCandidate.id}
                    className="flex-1 py-3 bg-transparent border border-[#333] text-[#888] font-semibold rounded-lg hover:border-[#555] hover:text-white disabled:opacity-50 transition-colors"
                  >
                    {updating === selectedCandidate.id ? "..." : "Отхвърли"}
                  </button>
                </div>
              )}

              {selectedCandidate.status !== "PENDING" && (
                <div className="mt-8 p-4 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
                  <p className="text-sm text-[#555]">
                    {selectedCandidate.status === "APPROVED"
                      ? "Този кандидат е одобрен"
                      : "Този кандидат е отхвърлен"}
                    {selectedCandidate.reviewedAt && (
                      <span className="block mt-1">
                        Преглед: {formatDate(selectedCandidate.reviewedAt)}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* Email Sequence Section - Only for approved candidates */}
              {selectedCandidate.status === "APPROVED" && selectedCandidate.scheduledEmails && selectedCandidate.scheduledEmails.length > 0 && (
                <EmailSequenceTimeline emails={selectedCandidate.scheduledEmails} />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#555]">Избери кандидат от списъка</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper Component
function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-[#222]">
      <span className="text-[#555] text-sm">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  );
}

// Email Sequence Timeline Component
function EmailSequenceTimeline({ emails }: { emails: ScheduledEmail[] }) {
  const now = new Date();

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("bg-BG", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEmailStatus = (email: ScheduledEmail): "sent" | "pending" | "future" | "failed" => {
    if (email.status === "FAILED") return "failed";
    if (email.status === "SENT" || email.sentAt) return "sent";
    const scheduledDate = new Date(email.scheduledFor);
    if (scheduledDate <= now) return "pending";
    return "future";
  };

  const statusConfig = {
    sent: {
      icon: "✅",
      label: "Изпратен",
      iconClass: "text-green-500",
      lineClass: "bg-green-500",
    },
    pending: {
      icon: "⏳",
      label: "Изпраща се...",
      iconClass: "text-[#c9a227] animate-pulse",
      lineClass: "bg-[#c9a227]",
    },
    future: {
      icon: "○",
      label: "Планиран",
      iconClass: "text-[#555]",
      lineClass: "bg-[#333]",
    },
    failed: {
      icon: "❌",
      label: "Грешка",
      iconClass: "text-red-500",
      lineClass: "bg-red-500",
    },
  };

  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-[#c9a227] uppercase tracking-wider mb-4">
        Email последователност
      </h3>
      <div className="space-y-0">
        {emails.map((email, index) => {
          const status = getEmailStatus(email);
          const config = statusConfig[status];
          const isLast = index === emails.length - 1;

          return (
            <div key={email.id} className="flex gap-3">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <span className={`text-lg ${config.iconClass}`}>{config.icon}</span>
                {!isLast && (
                  <div className={`w-0.5 h-full min-h-[40px] ${config.lineClass}`} />
                )}
              </div>

              {/* Email details */}
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-medium">
                    Email {email.emailNumber}
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    status === "sent" ? "bg-green-900/30 text-green-400" :
                    status === "pending" ? "bg-[#c9a227]/20 text-[#c9a227]" :
                    status === "failed" ? "bg-red-900/30 text-red-400" :
                    "bg-[#222] text-[#666]"
                  }`}>
                    {config.label}
                  </span>
                </div>
                <p className="text-[#888] text-sm mt-0.5">{email.subject}</p>
                <p className="text-[#555] text-xs mt-1">
                  {status === "sent" && email.sentAt
                    ? `Изпратен: ${formatDateTime(email.sentAt)}`
                    : `Планиран: ${formatDateTime(email.scheduledFor)}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
