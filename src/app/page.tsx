"use client";

import { useEffect, useState } from "react";

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
  photos?: string[];
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
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchCandidates = async () => {
    try {
      const res = await fetch(`/api/candidates`);
      const data = await res.json();
      const allCandidates = data.candidates || [];
      setCandidates(allCandidates);

      // Auto-select first candidate if none selected
      if (!selectedCandidate && allCandidates.length > 0) {
        const filtered = filter === "all"
          ? allCandidates
          : allCandidates.filter((c: Candidate) => c.status === filter);
        if (filtered.length > 0) {
          setSelectedCandidate(filtered[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Update selected candidate when filter changes
  useEffect(() => {
    const filtered = filteredCandidates;
    if (filtered.length > 0 && (!selectedCandidate || !filtered.find(c => c.id === selectedCandidate.id))) {
      setSelectedCandidate(filtered[0]);
    } else if (filtered.length === 0) {
      setSelectedCandidate(null);
    }
  }, [filter, candidates]);

  const updateStatus = async (id: string, status: "APPROVED" | "REJECTED") => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewedBy: "Dashboard Admin" }),
      });

      if (res.ok) {
        await fetchCandidates();
        // Update selected candidate with new status
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

  const filteredCandidates = filter === "all"
    ? candidates
    : candidates.filter(c => c.status === filter);

  const counts = {
    all: candidates.length,
    PENDING: candidates.filter((c) => c.status === "PENDING").length,
    APPROVED: candidates.filter((c) => c.status === "APPROVED").length,
    REJECTED: candidates.filter((c) => c.status === "REJECTED").length,
  };

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
          <div>
            <h1 className="text-xl font-bold text-[#c9a227] tracking-wide">
              EFI CASTING
            </h1>
            <p className="text-xs text-[#555] mt-0.5">
              European Fashion Institute
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-6">
            {(["all", "PENDING", "APPROVED", "REJECTED"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                  filter === status
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
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Candidates List */}
        <div className="w-[60%] border-r border-[#2a2a2a] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#c9a227] border-t-transparent mx-auto"></div>
                <p className="mt-3 text-[#555] text-sm">Зареждане...</p>
              </div>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[#555]">Няма намерени кандидати</p>
            </div>
          ) : (
            <div>
              {filteredCandidates.map((candidate) => {
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

                  {/* Submission Photos Placeholder */}
                  {selectedCandidate.photos && selectedCandidate.photos.length > 0 ? (
                    selectedCandidate.photos.map((photo, idx) => (
                      <img
                        key={idx}
                        src={photo}
                        alt={`Photo ${idx + 1}`}
                        className="h-32 w-32 rounded-xl object-cover border border-[#2a2a2a] cursor-pointer hover:border-[#c9a227] transition-colors"
                      />
                    ))
                  ) : (
                    <>
                      <div className="h-32 w-32 rounded-xl bg-[#1a1a1a] border border-dashed border-[#333] flex items-center justify-center">
                        <span className="text-[#444] text-xs text-center px-2">Снимка 1</span>
                      </div>
                      <div className="h-32 w-32 rounded-xl bg-[#1a1a1a] border border-dashed border-[#333] flex items-center justify-center">
                        <span className="text-[#444] text-xs text-center px-2">Снимка 2</span>
                      </div>
                    </>
                  )}
                </div>
                <p className="text-xs text-[#444] mt-2">
                  Снимките от кандидатурата ще бъдат добавени скоро
                </p>
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
