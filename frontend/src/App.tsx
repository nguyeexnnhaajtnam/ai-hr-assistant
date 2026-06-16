import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Cpu,
  Database,
  FileBadge2,
  FileSearch,
  FolderOpen,
  LayoutGrid,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { createJob, getCandidate, getCandidateFileUrl, getHealth, listCandidates, listJobs, updateJob, uploadCandidate } from "./api";
import type { CandidateDetail, CandidateListItem, Job, Recommendation } from "./types";

type TabKey = "overview" | "parsed" | "score" | "feedback" | "risks" | "questions";
type RecommendationFilter = Recommendation | "all";
type GeminiStatus = "unknown" | "configured" | "not_configured";
type BadgeTone = "strong" | "match" | "weak" | "low" | "success" | "accent" | "neutral" | "danger";
type JobModalMode = "create" | "edit";

type CreateJobForm = {
  title: string;
  description: string;
  experienceWeight: number;
  domainWeight: number;
};

type NavItem = {
  label: string;
  icon: typeof Sparkles;
  to: string;
};

type CandidateDirectoryItem = CandidateListItem & {
  job_title: string;
  job_created_at: string;
};

type AppState = {
  health: "loading" | "online" | "offline";
  geminiStatus: GeminiStatus;
  jobs: Job[];
  portfolioCandidates: CandidateDirectoryItem[];
  candidateDetailsIndex: Record<string, CandidateDetail>;
  selectedJob: Job | null;
  selectedJobId: string | null;
  candidates: CandidateListItem[];
  filteredCandidates: CandidateListItem[];
  selectedCandidateId: string | null;
  candidateDetail: CandidateDetail | null;
  activeTab: TabKey;
  evaluationFilter: RecommendationFilter;
  loadingJobs: boolean;
  loadingCandidates: boolean;
  loadingPortfolio: boolean;
  loadingDetail: boolean;
  creatingJob: boolean;
  uploadingCv: boolean;
  showCreateJob: boolean;
  jobModalMode: JobModalMode;
  jobForm: CreateJobForm;
  searchQuery: string;
  errorMessage: string | null;
  setSelectedJobId: (jobId: string) => void;
  setSelectedCandidateId: (candidateId: string) => void;
  setActiveTab: (tab: TabKey) => void;
  setSearchQuery: (value: string) => void;
  setShowCreateJob: (value: boolean) => void;
  setJobForm: React.Dispatch<React.SetStateAction<CreateJobForm>>;
  setEvaluationFilter: (value: RecommendationFilter) => void;
  handleCreateJob: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
  handleUploadCv: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  openCreateJobModal: () => void;
  openEditJobModal: (job: Job) => void;
  openCandidate: (jobId: string, candidateId: string, route?: string) => void;
  openJob: (jobId: string, route?: string) => void;
};

const navigationItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutGrid, to: "/dashboard" },
  { label: "Jobs", icon: BriefcaseBusiness, to: "/jobs" },
  { label: "Candidates", icon: UsersRound, to: "/candidates" },
  { label: "Evaluations", icon: FileSearch, to: "/evaluations" },
  { label: "Settings", icon: Settings, to: "/settings" },
];

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "parsed", label: "Parsed CV" },
  { key: "score", label: "Score Details" },
  { key: "feedback", label: "Feedback" },
  { key: "risks", label: "Risks" },
  { key: "questions", label: "Interview Questions" },
];

const evaluationFilters: Array<{ key: RecommendationFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "strong_match", label: "Strong Match" },
  { key: "match", label: "Match" },
  { key: "weak_match", label: "Weak Match" },
  { key: "not_match", label: "Not Match" },
];

const recommendationMap: Record<Recommendation, { label: string; tone: BadgeTone }> = {
  strong_match: { label: "Strong Match", tone: "strong" },
  match: { label: "Match", tone: "match" },
  weak_match: { label: "Weak Match", tone: "weak" },
  not_match: { label: "Not Match", tone: "low" },
};

const defaultForm: CreateJobForm = {
  title: "",
  description: "",
  experienceWeight: 20,
  domainWeight: 10,
};

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [health, setHealth] = useState<"loading" | "online" | "offline">("loading");
  const [geminiStatus, setGeminiStatus] = useState<GeminiStatus>("unknown");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [portfolioCandidates, setPortfolioCandidates] = useState<CandidateDirectoryItem[]>([]);
  const [candidateDetailsIndex, setCandidateDetailsIndex] = useState<Record<string, CandidateDetail>>({});
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateDetail, setCandidateDetail] = useState<CandidateDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);
  const [evaluationFilter, setEvaluationFilter] = useState<RecommendationFilter>("all");
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [creatingJob, setCreatingJob] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [showCreateJob, setShowCreateJob] = useState(false);
  const [jobModalMode, setJobModalMode] = useState<JobModalMode>("create");
  const [jobForm, setJobForm] = useState<CreateJobForm>(defaultForm);
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleHashChange = () => {
      const nextTab = getTabFromHash(window.location.hash);
      if (nextTab) {
        setActiveTab(nextTab);
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await getHealth();
        setHealth("online");
      } catch {
        setHealth("offline");
      }
      await refreshJobs();
    };

    void bootstrap();
  }, []);

  useEffect(() => {
    if (!selectedJobId) {
      setCandidates([]);
      setSelectedCandidateId(null);
      return;
    }

    void refreshCandidates(selectedJobId);
  }, [selectedJobId]);

  useEffect(() => {
    if (!selectedCandidateId) {
      setCandidateDetail(null);
      return;
    }

    const cached = candidateDetailsIndex[selectedCandidateId];
    if (cached) {
      setCandidateDetail(cached);
    }

    void refreshCandidateDetail(selectedCandidateId, Boolean(cached));
  }, [candidateDetailsIndex, selectedCandidateId]);

  useEffect(() => {
    if (location.pathname === "/") {
      navigate("/jobs", { replace: true });
    }
  }, [location.pathname, navigate]);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  const filteredCandidates = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) {
      return candidates;
    }

    return candidates.filter((candidate) => {
      const haystack = [
        candidate.name,
        candidate.email,
        candidate.phone,
        candidate.original_filename,
        candidateDetailsIndex[candidate.id]?.parsed_cv.current_title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [candidateDetailsIndex, candidates, searchQuery]);

  async function refreshJobs(selectJobId?: string) {
    setLoadingJobs(true);
    setErrorMessage(null);

    try {
      const nextJobs = await listJobs();
      setJobs(nextJobs);
      await refreshPortfolio(nextJobs);

      if (nextJobs.length === 0) {
        setSelectedJobId(null);
        return;
      }

      const preferredJobId =
        selectJobId ??
        (selectedJobId && nextJobs.some((job) => job.id === selectedJobId) ? selectedJobId : nextJobs[0].id);
      setSelectedJobId(preferredJobId);
    } catch (error) {
      setErrorMessage(normalizeError(error, "Could not load jobs."));
    } finally {
      setLoadingJobs(false);
    }
  }

  async function refreshPortfolio(nextJobs: Job[]) {
    setLoadingPortfolio(true);

    try {
      if (!nextJobs.length) {
        setPortfolioCandidates([]);
        setCandidateDetailsIndex({});
        return;
      }

      const jobCandidateGroups = await Promise.all(
        nextJobs.map(async (job) => {
          const items = await listCandidates(job.id);
          return items.map((candidate) => ({
            ...candidate,
            job_title: job.title,
            job_created_at: job.created_at,
          }));
        }),
      );

      const merged = jobCandidateGroups.flat().sort((left, right) =>
        right.created_at.localeCompare(left.created_at),
      );
      setPortfolioCandidates(merged);

      if (!merged.length) {
        setCandidateDetailsIndex({});
        return;
      }

      const details = await Promise.all(
        merged.map(async (candidate) => {
          try {
            const detail = await getCandidate(candidate.id);
            return [candidate.id, detail] as const;
          } catch {
            return null;
          }
        }),
      );

      const nextIndex = Object.fromEntries(
        details.filter((entry): entry is readonly [string, CandidateDetail] => Boolean(entry)),
      );

      setCandidateDetailsIndex(nextIndex);
    } catch (error) {
      setErrorMessage(normalizeError(error, "Could not load cross-job candidate data."));
    } finally {
      setLoadingPortfolio(false);
    }
  }

  async function refreshCandidates(jobId: string, preferredCandidateId?: string) {
    setLoadingCandidates(true);
    setErrorMessage(null);

    try {
      const nextCandidates = await listCandidates(jobId);
      setCandidates(nextCandidates);

      if (!nextCandidates.length) {
        setSelectedCandidateId(null);
        return;
      }

      const keepSelected =
        preferredCandidateId ??
        (selectedCandidateId && nextCandidates.some((candidate) => candidate.id === selectedCandidateId)
          ? selectedCandidateId
          : nextCandidates[0].id);

      setSelectedCandidateId(keepSelected);
    } catch (error) {
      setErrorMessage(normalizeError(error, "Could not load candidates."));
    } finally {
      setLoadingCandidates(false);
    }
  }

  async function refreshCandidateDetail(candidateId: string, useSoftLoading = false) {
    setLoadingDetail(!useSoftLoading);
    setErrorMessage(null);

    try {
      const detail = await getCandidate(candidateId);
      setCandidateDetail(detail);
      setCandidateDetailsIndex((current) => ({ ...current, [candidateId]: detail }));
      setGeminiStatus("configured");
    } catch (error) {
      setErrorMessage(normalizeError(error, "Could not load candidate detail."));
    } finally {
      setLoadingDetail(false);
    }
  }

  function normalizeError(error: unknown, fallback: string) {
    const message = error instanceof Error ? error.message : fallback;
    const lower = message.toLowerCase();

    if (
      lower.includes("gemini") ||
      lower.includes("api key") ||
      lower.includes("googleapicallerror") ||
      lower.includes("gemini_api_key") ||
      lower.includes("gemini_model")
    ) {
      setGeminiStatus("not_configured");
      return "Gemini is not configured correctly. Update GEMINI_API_KEY and GEMINI_MODEL in .env, then restart the app.";
    }

    return message;
  }

  function openJob(jobId: string, route = "/jobs") {
    setSelectedJobId(jobId);
    navigate(route);
  }

  function openCreateJobModal() {
    setJobModalMode("create");
    setJobForm(defaultForm);
    setShowCreateJob(true);
  }

  function openEditJobModal(job: Job) {
    setJobModalMode("edit");
    setJobForm({
      title: job.title,
      description: job.description,
      experienceWeight: Number(job.requirements.experience_weight ?? 20),
      domainWeight: Number(job.requirements.domain_weight ?? 10),
    });
    setShowCreateJob(true);
  }

  function closeJobModal() {
    setShowCreateJob(false);
    setJobModalMode("create");
    setJobForm(defaultForm);
  }

  function openCandidate(jobId: string, candidateId: string, route = "/candidates") {
    setSelectedJobId(jobId);
    setSelectedCandidateId(candidateId);
    const cached = candidateDetailsIndex[candidateId];
    if (cached) {
      setCandidateDetail(cached);
    }
    navigate(route);
  }

  async function handleCreateJob(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingJob(true);
    setErrorMessage(null);

    try {
      const payload = {
        title: jobForm.title,
        description: jobForm.description,
        default_weights: {
          experience_weight: Number(jobForm.experienceWeight),
          domain_weight: Number(jobForm.domainWeight),
        },
      };

      const createdOrUpdatedJob =
        jobModalMode === "edit" && selectedJobId
          ? await updateJob(selectedJobId, payload)
          : await createJob(payload);

      setGeminiStatus("configured");
      closeJobModal();
      await refreshJobs(createdOrUpdatedJob.id);
      navigate("/jobs");
    } catch (error) {
      setErrorMessage(
        normalizeError(error, jobModalMode === "edit" ? "Could not update job." : "Could not create job."),
      );
    } finally {
      setCreatingJob(false);
    }
  }

  async function handleUploadCv(event: React.ChangeEvent<HTMLInputElement>) {
    if (!selectedJobId || !event.target.files?.[0]) {
      return;
    }

    const file = event.target.files[0];
    setUploadingCv(true);
    setErrorMessage(null);

    try {
      const candidate = await uploadCandidate(selectedJobId, file);
      setGeminiStatus("configured");
      await refreshCandidates(selectedJobId, candidate.id);
      await refreshCandidateDetail(candidate.id);
      await refreshPortfolio(jobs);
      navigate("/candidates");
    } catch (error) {
      setErrorMessage(normalizeError(error, "Could not upload CV."));
    } finally {
      setUploadingCv(false);
      event.target.value = "";
    }
  }

  const appState: AppState = {
    health,
    geminiStatus,
    jobs,
    portfolioCandidates,
    candidateDetailsIndex,
    selectedJob,
    selectedJobId,
    candidates,
    filteredCandidates,
    selectedCandidateId,
    candidateDetail,
    activeTab,
    evaluationFilter,
    loadingJobs,
    loadingCandidates,
    loadingPortfolio,
    loadingDetail,
    creatingJob,
    uploadingCv,
    showCreateJob,
    jobModalMode,
    jobForm,
    searchQuery,
    errorMessage,
    setSelectedJobId,
    setSelectedCandidateId,
    setActiveTab,
    setSearchQuery,
    setShowCreateJob,
    setJobForm,
    setEvaluationFilter,
    handleCreateJob,
    handleUploadCv,
    openCreateJobModal,
    openEditJobModal,
    openCandidate,
    openJob,
  };

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-badge">AI</div>
          <div>
            <p className="eyebrow">Talent Operations</p>
            <h1>AI HR Scanner</h1>
          </div>
        </div>

        <nav className="nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-card-header">
            <span className="section-kicker">Runtime</span>
            <StatusPill online={health === "online"} />
          </div>
          <div className="sidebar-status-list">
            <StatusLine label="Storage" value="Local filesystem" />
            <StatusLine label="Scoring" value="Rule-based" />
            <StatusLine label="Parsing" value="Gemini-assisted" />
          </div>
        </div>

        <div className="operator">
          <div className="avatar avatar-admin">HR</div>
          <div>
            <strong>HR Admin</strong>
            <p>Local MVP workspace</p>
          </div>
          <ChevronRight size={14} />
        </div>
      </aside>

      <main className="workspace">
        {appState.errorMessage ? (
          <div className="banner error">
            <CircleAlert size={18} />
            <span>{appState.errorMessage}</span>
          </div>
        ) : null}

        <Routes>
          <Route path="/" element={<Navigate to="/jobs" replace />} />
          <Route path="/dashboard" element={<DashboardPage state={appState} />} />
          <Route path="/jobs" element={<JobsPage state={appState} />} />
          <Route path="/candidates" element={<CandidatesPage state={appState} />} />
          <Route path="/evaluations" element={<EvaluationsPage state={appState} />} />
          <Route path="/settings" element={<SettingsPage state={appState} />} />
        </Routes>
      </main>

      <AnimatePresence>
        {showCreateJob ? (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeJobModal}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <p className="eyebrow">{jobModalMode === "edit" ? "Edit Job" : "New Job"}</p>
                  <h3>{jobModalMode === "edit" ? "Update JD from text" : "Create JD from text"}</h3>
                </div>
                <button type="button" className="icon-button" onClick={closeJobModal}>
                  x
                </button>
              </div>

              <form className="modal-form" onSubmit={handleCreateJob}>
                <label>
                  <span>Job title</span>
                  <input
                    value={jobForm.title}
                    onChange={(event) => setJobForm((current) => ({ ...current, title: event.target.value }))}
                    placeholder="Frontend Developer (Angular)"
                    required
                  />
                </label>

                <label>
                  <span>Job description</span>
                  <textarea
                    value={jobForm.description}
                    onChange={(event) => setJobForm((current) => ({ ...current, description: event.target.value }))}
                    placeholder="Paste the JD here. Gemini will parse it into structured requirements."
                    rows={10}
                    required
                  />
                </label>

                <div className="modal-grid">
                  <label>
                    <span>Experience weight</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={jobForm.experienceWeight}
                      onChange={(event) =>
                        setJobForm((current) => ({ ...current, experienceWeight: Number(event.target.value) }))
                      }
                    />
                  </label>

                  <label>
                    <span>Domain weight</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={jobForm.domainWeight}
                      onChange={(event) =>
                        setJobForm((current) => ({ ...current, domainWeight: Number(event.target.value) }))
                      }
                    />
                  </label>
                </div>

                <div className="modal-actions">
                  <button type="button" className="ghost-button" onClick={closeJobModal}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-button solid" disabled={creatingJob}>
                    {creatingJob ? (
                      <>
                        <LoaderCircle className="spinner" size={16} />
                        <span>{jobModalMode === "edit" ? "Saving job..." : "Creating job..."}</span>
                      </>
                    ) : (
                      jobModalMode === "edit" ? "Save Job" : "Create Job"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function DashboardPage({ state }: { state: AppState }) {
  const topCandidate = state.portfolioCandidates
    .filter((candidate) => candidate.overall_score !== null)
    .sort((left, right) => (right.overall_score ?? 0) - (left.overall_score ?? 0))[0];

  const recentJobs = [...state.jobs]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 6);

  const recentCandidates = [...state.portfolioCandidates]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 6);

  return (
    <>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        meta={
          <>
            <StatusPill online={state.health === "online"} />
            <Badge tone="neutral">Local MVP</Badge>
            <Badge tone="accent">Rule-based scoring</Badge>
          </>
        }
        actions={
          <button className="primary-button" type="button" onClick={state.openCreateJobModal}>
            <Plus size={16} />
            <span>New Job</span>
          </button>
        }
      />

      <section className="metric-grid">
        <MetricCard label="Active jobs" value={String(state.jobs.length)} hint="+1 this week" />
        <MetricCard label="Candidates" value={String(state.portfolioCandidates.length)} hint="+8 this week" />
        <MetricCard
          label="Top score"
          value={topCandidate?.overall_score?.toFixed(1) ?? "--"}
          hint={topCandidate ? `${topCandidate.name ?? "Candidate"}` : "No ranked candidate yet"}
        />
        <MetricCard label="Scoring mode" value="Rule-based" hint="Backend scoring" />
      </section>

      <section className="dashboard-grid">
        <article className="surface-card">
          <SectionHeader
            eyebrow="Jobs"
            title="Recent jobs"
            action={<span className="section-meta">{state.loadingJobs ? "Refreshing..." : "Live data"}</span>}
          />
          {recentJobs.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Job title</th>
                    <th>Candidates</th>
                    <th>Created</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {recentJobs.map((job) => {
                    const candidateCount = state.portfolioCandidates.filter((candidate) => candidate.job_id === job.id).length;
                    return (
                      <tr key={job.id}>
                        <td>
                          <div className="table-primary">
                            <strong>{job.title}</strong>
                            <span>{summarizeSkills(job.requirements.required_skills)}</span>
                          </div>
                        </td>
                        <td>{candidateCount}</td>
                        <td>{formatDate(job.created_at)}</td>
                        <td><Badge tone="success">Active</Badge></td>
                        <td>
                          <button type="button" className="table-link" onClick={() => state.openJob(job.id, "/jobs")}>
                            <ArrowUpRight size={12} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel
              compact
              title="No jobs yet"
              description="Create the first job and the dashboard will fill with live candidate activity."
              actionLabel="Create first job"
              onAction={state.openCreateJobModal}
            />
          )}
        </article>

        <article className="surface-card">
          <SectionHeader
            eyebrow="Candidates"
            title="Recent candidates"
            action={<span className="section-meta">{state.loadingPortfolio ? "Refreshing..." : "Latest uploads"}</span>}
          />
          {recentCandidates.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Job</th>
                    <th>Score</th>
                    <th>Recommendation</th>
                    <th>Uploaded</th>
                  </tr>
                </thead>
                <tbody>
                  {recentCandidates.map((candidate) => (
                    <tr
                      key={candidate.id}
                      className="click-row"
                      onClick={() => state.openCandidate(candidate.job_id, candidate.id, "/candidates")}
                    >
                      <td>
                        <div className="table-primary">
                          <strong>{candidate.name ?? "Unnamed Candidate"}</strong>
                          <span>{candidate.email ?? candidate.original_filename}</span>
                        </div>
                      </td>
                      <td>{candidate.job_title}</td>
                      <td>{candidate.overall_score?.toFixed(1) ?? "--"}</td>
                      <td>
                        {candidate.recommendation ? (
                          <Badge tone={recommendationMap[candidate.recommendation].tone}>
                            {recommendationMap[candidate.recommendation].label}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Pending</Badge>
                        )}
                      </td>
                      <td>{formatDate(candidate.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyPanel compact title="No candidates yet" description="Upload a CV to start building the live shortlist." />
          )}
        </article>

        <article className="surface-card dashboard-overview-strip">
          <SectionHeader eyebrow="System status" title="System overview" />
          <div className="status-strip">
            <StatusOverviewItem label="API status" value={state.health === "online" ? "Online" : "Offline"} detail="Backend is running normally" icon={<CheckCircle2 size={14} />} tone={state.health === "online" ? "success" : "danger"} />
            <StatusOverviewItem label="Gemini" value={formatGeminiStatus(state.geminiStatus)} detail="AI parsing and feedback enabled" icon={<Sparkles size={14} />} tone={state.geminiStatus === "not_configured" ? "danger" : "success"} />
            <StatusOverviewItem label="Storage" value="Local filesystem" detail="Uploads stored locally" icon={<FolderOpen size={14} />} tone="accent" />
            <StatusOverviewItem label="Scoring" value="Rule-based" detail="Backend scoring engine" icon={<ShieldAlert size={14} />} tone="accent" />
            <StatusOverviewItem label="Last updated" value={formatDateTime(new Date().toISOString())} detail="Auto refresh every load" icon={<Clock3 size={14} />} tone="neutral" />
          </div>
        </article>
      </section>
    </>
  );
}

function JobsPage({ state }: { state: AppState }) {
  return (
    <>
      <PageHeader
        eyebrow="Jobs"
        title={state.selectedJob?.title ?? "Choose a job to review candidates"}
        meta={
          state.selectedJob ? (
            <>
              <StatusPill online={state.health === "online"} />
              <Badge tone="success">Active</Badge>
              <Badge tone="accent">Live parsed</Badge>
              <span>{state.candidates.length} candidates</span>
              <span>Created {formatDate(state.selectedJob.created_at)}</span>
            </>
          ) : (
            <>
              <StatusPill online={state.health === "online"} />
              <span>Create a job, then upload candidate CVs.</span>
            </>
          )
        }
      />

      <JobsWorkspace state={state} />
    </>
  );
}

function CandidatesPage({ state }: { state: AppState }) {
  return (
    <>
      <PageHeader
        eyebrow="Candidates"
        title="Candidate workspace"
        meta={
          <>
            <StatusPill online={state.health === "online"} />
            {state.selectedJob ? <Badge tone="accent">{state.selectedJob.title}</Badge> : null}
            <span>{state.filteredCandidates.length} candidates in view</span>
          </>
        }
      />

      <CandidatesWorkspace state={state} />
    </>
  );
}

function EvaluationsPage({ state }: { state: AppState }) {
  const filteredRows = state.portfolioCandidates.filter((candidate) =>
    state.evaluationFilter === "all" ? true : candidate.recommendation === state.evaluationFilter,
  );
  const [query, setQuery] = useState("");
  const visibleRows = filteredRows.filter((candidate) => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return true;
    }
    return [candidate.name, candidate.email, candidate.job_title].filter(Boolean).join(" ").toLowerCase().includes(keyword);
  });

  return (
    <>
      <PageHeader
        eyebrow="Evaluations"
        title="Candidate evaluations"
        meta={
          <>
            <StatusPill online={state.health === "online"} />
            <Badge tone="accent">Rule-based scoring</Badge>
            <span>{visibleRows.length} rows</span>
          </>
        }
      />

      <section className="surface-card">
        <div className="toolbar-row">
          <div className="filters-row">
            {evaluationFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className={`filter-chip ${state.evaluationFilter === filter.key ? "active" : ""}`}
                onClick={() => state.setEvaluationFilter(filter.key)}
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="search-row table-search">
            <Search size={14} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search candidates..." />
          </div>
        </div>

        {visibleRows.length ? (
          <div className="table-wrap">
            <table className="data-table clickable">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Candidate</th>
                  <th>Job</th>
                  <th>Score</th>
                  <th>Recommendation</th>
                  <th>Matched skills</th>
                  <th>Missing skills</th>
                  <th>Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((candidate, index) => {
                  const detail = state.candidateDetailsIndex[candidate.id];
                  return (
                    <tr
                      key={candidate.id}
                      onClick={() => state.openCandidate(candidate.job_id, candidate.id, "/candidates")}
                    >
                      <td>{index + 1}</td>
                      <td>
                        <div className="table-primary">
                          <strong>{candidate.name ?? "Unnamed Candidate"}</strong>
                          <span>{candidate.email ?? candidate.original_filename}</span>
                        </div>
                      </td>
                      <td>{candidate.job_title}</td>
                      <td>{candidate.overall_score?.toFixed(1) ?? "--"}</td>
                      <td>
                        {candidate.recommendation ? (
                          <Badge tone={recommendationMap[candidate.recommendation].tone}>
                            {recommendationMap[candidate.recommendation].label}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Pending</Badge>
                        )}
                      </td>
                      <td>{detail?.evaluation?.matched_skills.length ?? "--"}</td>
                      <td>{detail?.evaluation?.missing_skills.length ?? "--"}</td>
                      <td>{formatRelative(candidate.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyPanel compact title="No evaluations found" description="Adjust the filter or upload more candidates to populate this table." />
        )}

        <div className="table-footer">
          <span>Showing 1 to {visibleRows.length} of {visibleRows.length} results</span>
          <div className="pagination-mock">
            <button type="button" className="page-chip active">1</button>
            <button type="button" className="page-chip">2</button>
            <button type="button" className="page-chip">3</button>
          </div>
        </div>
      </section>
    </>
  );
}

function SettingsPage({ state }: { state: AppState }) {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Runtime and limitations"
        meta={
          <>
            <StatusPill online={state.health === "online"} />
            <Badge tone="neutral">Local MVP</Badge>
          </>
        }
      />

      <section className="settings-grid">
        <InfoPanel title="Runtime" icon={<Cpu size={16} />}>
          <StatusLine label="API status" value={state.health === "online" ? "Online" : "Offline"} />
          <StatusLine label="Gemini status" value={formatGeminiStatus(state.geminiStatus)} />
          <StatusLine label="Local upload path" value="uploads/" />
        </InfoPanel>

        <InfoPanel title="AI usage" icon={<Sparkles size={16} />}>
          <BulletCopy text="JD parsing" />
          <BulletCopy text="CV parsing" />
          <BulletCopy text="Feedback generation" />
          <BulletCopy text="Scoring remains backend rule-based" />
        </InfoPanel>

        <InfoPanel title="Storage" icon={<FolderOpen size={16} />}>
          <StatusLine label="Mode" value="Local filesystem" />
          <StatusLine label="Uploads folder" value="uploads/cvs/{candidate_id}" />
        </InfoPanel>

        <InfoPanel title="Demo limitations" icon={<ShieldAlert size={16} />}>
          <BulletCopy text="No OCR" />
          <BulletCopy text="No auth" />
          <BulletCopy text="No async queue" />
          <BulletCopy text="No cloud storage" />
        </InfoPanel>
      </section>

      <article className="settings-note">
        <CircleAlert size={16} />
        <div>
          <strong>This is a local MVP setup for demo purposes.</strong>
          <p>Data is stored locally and may be lost if the server is reset.</p>
        </div>
      </article>
    </>
  );
}

function JobsWorkspace({ state }: { state: AppState }) {
  return (
    <section className="screen-layout">
      <aside className="screen-rail">
        <article className="surface-card rail-card tight">
          <SectionHeader
            eyebrow="Jobs"
            title="Open roles"
            action={state.loadingJobs ? <LoaderCircle className="spinner" size={16} /> : null}
          />
          <div className="job-list">
            {state.jobs.map((job) => {
              const candidateCount = state.portfolioCandidates.filter((candidate) => candidate.job_id === job.id).length;
              return (
                <button
                  key={job.id}
                  type="button"
                  className={`job-card ${job.id === state.selectedJobId ? "selected" : ""}`}
                  onClick={() => state.setSelectedJobId(job.id)}
                >
                  <div className="job-card-top">
                    <strong>{job.title}</strong>
                    <Badge tone="success">Active</Badge>
                  </div>
                  <div className="job-card-meta">
                    <span>{candidateCount} candidates</span>
                    <span>{formatDate(job.created_at)}</span>
                  </div>
                  <p>{summarizeSkills(job.requirements.required_skills)}</p>
                </button>
              );
            })}

            {!state.loadingJobs && state.jobs.length === 0 ? (
              <EmptyPanel
                compact
                title="No jobs yet"
                description="Create the first JD to unlock the candidate workflow."
                actionLabel="Create first job"
                onAction={state.openCreateJobModal}
              />
            ) : null}
          </div>

          <button type="button" className="ghost-button rail-footer-button" onClick={state.openCreateJobModal}>
            <Plus size={14} />
            <span>New Job</span>
          </button>
        </article>
      </aside>

      <div className="screen-main">
        <JobDetailScreen state={state} />
      </div>
    </section>
  );
}

function CandidatesWorkspace({ state }: { state: AppState }) {
  return (
    <section className="screen-layout">
      <aside className="screen-rail">
        <article className="surface-card rail-card tight">
          <div className="search-row">
            <Search size={16} />
            <input
              value={state.searchQuery}
              onChange={(event) => state.setSearchQuery(event.target.value)}
              placeholder="Search candidates..."
            />
          </div>

          <div className="candidate-list compact">
            {state.filteredCandidates.map((candidate) => {
              const detail = state.candidateDetailsIndex[candidate.id];
              return (
                <button
                  key={candidate.id}
                  type="button"
                  className={`candidate-card compact ${candidate.id === state.selectedCandidateId ? "selected" : ""}`}
                  onClick={() => state.setSelectedCandidateId(candidate.id)}
                >
                  <div className="avatar small">{initials(candidate.name ?? candidate.email ?? "CV")}</div>
                  <div className="candidate-copy">
                    <div className="candidate-card-head">
                      <strong>{candidate.name ?? "Unnamed Candidate"}</strong>
                      <span className="candidate-card-score">{candidate.overall_score?.toFixed(1) ?? "--"}</span>
                    </div>
                    <span className="candidate-subline">{detail?.parsed_cv.current_title ?? candidate.email ?? candidate.original_filename}</span>
                    <div className="candidate-meta compact">
                      <span>{formatYears(detail?.parsed_cv.experience_years ?? null)}</span>
                      {candidate.recommendation ? (
                        <span className={`tone-${recommendationMap[candidate.recommendation].tone}`}>
                          {recommendationMap[candidate.recommendation].label}
                        </span>
                      ) : (
                        <span>Pending</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {!state.loadingCandidates && state.filteredCandidates.length === 0 ? (
              <EmptyPanel
                compact
                title="No candidates"
                description="Upload a CV or create a job first."
              />
            ) : null}
          </div>

          <UploadButton
            disabled={!state.selectedJobId || state.uploadingCv}
            loading={state.uploadingCv}
            label="Upload CV"
            onChange={state.handleUploadCv}
          />
        </article>
      </aside>

      <div className="screen-main">
        <CandidateDetailPanel state={state} mode="candidates" />
      </div>
    </section>
  );
}

function JobDetailScreen({ state }: { state: AppState }) {
  if (!state.selectedJob) {
    return (
      <EmptyPanel
        title="Choose a job"
        description="Select a job from the left rail to review its description, weights, and candidate ranking."
      />
    );
  }

  const job = state.selectedJob;

  return (
    <div className="detail-column">
      <article className="surface-card job-detail-shell">
        <div className="job-detail-header">
          <div>
            <p className="eyebrow">Jobs</p>
            <h3>{job.title}</h3>
            <div className="meta-row compact">
              <span>Created {formatDate(job.created_at)}</span>
              <span>{state.candidates.length} candidates</span>
              <Badge tone="success">Active</Badge>
            </div>
          </div>
          <div className="header-actions">
            <button type="button" className="ghost-button" onClick={() => state.openEditJobModal(job)}>
              <FileSearch size={14} />
              <span>Edit Job</span>
            </button>
            <UploadButton
              disabled={!state.selectedJobId || state.uploadingCv}
              loading={state.uploadingCv}
              label="Add Candidate"
              onChange={state.handleUploadCv}
            />
          </div>
        </div>

        <div className="job-detail-grid">
          <article className="surface-card nested-card">
            <SectionHeader eyebrow="Job description" title="Role summary" />
            <p className="job-description-text">{job.description}</p>
            <div className="tag-list">
              {(job.requirements.required_skills ?? []).slice(0, 5).map((skill) => (
                <span key={skill.name} className="tag neutral">{skill.name}</span>
              ))}
            </div>
          </article>

          <article className="surface-card nested-card">
            <SectionHeader eyebrow="Job weights" title="Scoring weights" />
            <div className="status-line"><span>Skills weight</span><strong>{formatWeight(calculateSkillWeight(job))}</strong></div>
            <div className="status-line"><span>Experience weight</span><strong>{formatWeight(job.requirements.experience_weight ?? 0)}</strong></div>
            <div className="status-line"><span>Domain weight</span><strong>{formatWeight(job.requirements.domain_weight ?? 0)}</strong></div>
          </article>
        </div>

        <article className="surface-card nested-card">
          <SectionHeader eyebrow={`Candidates (${state.candidates.length})`} title="Candidate ranking" />
          {state.candidates.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Score</th>
                    <th>Recommendation</th>
                    <th>Uploaded</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {state.candidates.map((candidate, index) => (
                    <tr key={candidate.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="table-primary">
                          <strong>{candidate.name ?? "Unnamed Candidate"}</strong>
                          <span>{candidate.email ?? candidate.original_filename}</span>
                        </div>
                      </td>
                      <td>{candidate.overall_score?.toFixed(1) ?? "--"}</td>
                      <td>
                        {candidate.recommendation ? (
                          <Badge tone={recommendationMap[candidate.recommendation].tone}>
                            {recommendationMap[candidate.recommendation].label}
                          </Badge>
                        ) : (
                          <Badge tone="neutral">Pending</Badge>
                        )}
                      </td>
                      <td>{formatDate(candidate.created_at)}</td>
                      <td>
                        <button type="button" className="table-link" onClick={() => state.openCandidate(job.id, candidate.id, "/candidates")}>
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyMini text="No candidates uploaded for this role yet." />
          )}
        </article>
      </article>
    </div>
  );
}

function CandidateDetailPanel({ state, mode }: { state: AppState; mode: "jobs" | "candidates" }) {
  if (state.loadingDetail && !state.candidateDetail) {
    return (
      <div className="detail-loading">
        <LoaderCircle className="spinner large" size={28} />
        <p>Loading candidate detail...</p>
      </div>
    );
  }

  if (!state.candidateDetail) {
    return (
      <EmptyPanel
        title={mode === "candidates" ? "No candidate selected" : "Choose a candidate"}
        description={
          mode === "candidates"
            ? "Upload a CV or select a candidate to review."
            : "Select a candidate to review score, parsed CV, risks, and interview questions."
        }
      />
    );
  }

  const detail = state.candidateDetail;
  const evaluation = detail.evaluation;
  const totalBreakdown = evaluation?.score_breakdown.total;
  const liveParsed = Boolean(
    detail.parsed_cv.summary ||
    detail.parsed_cv.skills?.length ||
    detail.parsed_cv.current_title,
  );

  return (
    <motion.div
      key={detail.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="detail-surface"
    >
      <section className="hero-panel">
        <div className="hero-profile">
          <div className="avatar large">{initials(detail.name ?? detail.email ?? "CV")}</div>
          <div className="hero-copy">
            <div className="candidate-name-row">
              <h3>{detail.name ?? "Unnamed Candidate"}</h3>
              {evaluation?.recommendation ? (
                <Badge tone={recommendationMap[evaluation.recommendation].tone}>
                  {recommendationMap[evaluation.recommendation].label}
                </Badge>
              ) : (
                <Badge tone="neutral">Pending</Badge>
              )}
              {liveParsed ? <Badge tone="accent">Live parsed</Badge> : null}
            </div>

            <div className="contact-grid">
              <span><Mail size={14} /> {detail.email ?? "No email"}</span>
              <span><Phone size={14} /> {detail.phone ?? "No phone"}</span>
              <span><MapPin size={14} /> {detail.parsed_cv.location ?? "No location"}</span>
            </div>

            <div className="contact-grid muted">
              <span><UserRound size={14} /> {detail.parsed_cv.current_title ?? "Current title unavailable"}</span>
              <span><BriefcaseBusiness size={14} /> {formatYears(detail.parsed_cv.experience_years)}</span>
              <span><Clock3 size={14} /> Uploaded {formatDateTime(detail.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="hero-actions">
          <a href={getCandidateFileUrl(detail.id)} className="ghost-button" target="_blank" rel="noreferrer">
            <FileSearch size={16} />
            <span>Download CV</span>
          </a>
        </div>
      </section>

      <section className="score-grid">
        <article className="surface-card compact-score">
          <p className="eyebrow">Overall score</p>
          <ScoreRing score={evaluation?.overall_score ?? 0} />
        </article>

        <article className="surface-card compact-score">
          <p className="eyebrow">Score breakdown</p>
          <ScoreSummaryRow
            label="Skills"
            value={evaluation?.score_breakdown.skills?.score ?? 0}
            max={evaluation?.score_breakdown.skills?.max ?? 0}
            emptyLabel="No skill weight configured"
          />
          <ScoreSummaryRow
            label="Experience"
            value={evaluation?.score_breakdown.experience?.score ?? 0}
            max={evaluation?.score_breakdown.experience?.max ?? 0}
            emptyLabel="No experience weight configured"
          />
          <ScoreSummaryRow
            label="Domain"
            value={evaluation?.score_breakdown.domain?.score ?? 0}
            max={evaluation?.score_breakdown.domain?.max ?? 0}
            emptyLabel="No domain weight configured"
          />
          <div className="score-total">
            <span>Normalized score</span>
            <strong>{totalBreakdown?.normalized_score?.toFixed(1) ?? evaluation?.overall_score?.toFixed(1) ?? "--"} / 100</strong>
          </div>
        </article>

        <article className="surface-card compact-score">
          <p className="eyebrow">Recommendation</p>
          {evaluation ? (
            <>
              <div className={`recommendation-banner tone-${recommendationMap[evaluation.recommendation].tone}`}>
                <strong>{recommendationMap[evaluation.recommendation].label}</strong>
                <p>AI supports screening only. Final hiring decisions remain with HR.</p>
              </div>
              <div className="mini-facts">
                <div>
                  <span>Matched</span>
                  <strong>{evaluation.matched_skills.length}</strong>
                </div>
                <div>
                  <span>Missing</span>
                  <strong>{evaluation.missing_skills.length}</strong>
                </div>
              </div>
            </>
          ) : (
            <EmptyMini text="No evaluation available yet." />
          )}
        </article>
      </section>

      <div className="tab-strip">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`tab-button ${tab.key === state.activeTab ? "active" : ""}`}
            onClick={() => state.setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="tab-panel-grid">
        {renderTab(state.activeTab, detail)}
      </section>
    </motion.div>
  );
}

function PageHeader({
  eyebrow,
  title,
  meta,
  actions,
}: {
  eyebrow: string;
  title: string;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="workspace-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        {meta ? <div className="meta-row">{meta}</div> : null}
      </div>
      {actions ? <div className="header-actions">{actions}</div> : null}
    </header>
  );
}

function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h3>{title}</h3>
      </div>
      {action}
    </div>
  );
}

function renderTab(tab: TabKey, candidate: CandidateDetail) {
  const evaluation = candidate.evaluation;
  const skillItems = evaluation?.score_breakdown.skills?.items ?? [];
  const weightedSkillItems = skillItems.filter((item) => item.weight > 0);
  const zeroWeightCount = skillItems.length - weightedSkillItems.length;

  switch (tab) {
    case "overview":
      return (
        <>
          <InfoPanel title="Summary" icon={<Sparkles size={16} />} wide>
            <p>{candidate.parsed_cv.summary ?? "No summary was extracted from the CV."}</p>
          </InfoPanel>

          <InfoPanel title="Key information" icon={<UserRound size={16} />}>
            <dl className="key-value-list">
              <div><dt>Current title</dt><dd>{candidate.parsed_cv.current_title ?? "N/A"}</dd></div>
              <div><dt>Experience</dt><dd>{formatYears(candidate.parsed_cv.experience_years)}</dd></div>
              <div><dt>Education</dt><dd>{candidate.parsed_cv.education?.[0] ?? "N/A"}</dd></div>
              <div><dt>Location</dt><dd>{candidate.parsed_cv.location ?? "N/A"}</dd></div>
            </dl>
          </InfoPanel>

          <InfoPanel title="Skill coverage" icon={<ShieldAlert size={16} />}>
            <div className="skill-columns">
              <div>
                <p className="subtle-label">Matched skills</p>
                {evaluation?.matched_skills.length ? (
                  <div className="tag-list">
                    {evaluation.matched_skills.map((skill) => (
                      <span className="tag success" key={`${skill.name}-${skill.type}`}>
                        {skill.name}
                        {skill.candidate_evidence?.years ? ` · ${skill.candidate_evidence.years}y` : ""}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyMini text="No matched skills found." />
                )}
              </div>

              <div>
                <p className="subtle-label">Missing skills</p>
                {evaluation?.missing_skills.length ? (
                  <div className="tag-list">
                    {evaluation.missing_skills.map((skill) => (
                      <span
                        className={`tag ${skill.type === "required" ? "warning" : "neutral"}`}
                        key={`${skill.name}-${skill.type}`}
                      >
                        {skill.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyMini text="No missing skills noted." />
                )}
              </div>
            </div>
          </InfoPanel>
        </>
      );

    case "parsed":
      return (
        <InfoPanel title="Parsed CV JSON" icon={<FileSearch size={16} />} wide>
          <pre className="code-block">{JSON.stringify(candidate.parsed_cv, null, 2)}</pre>
        </InfoPanel>
      );

    case "score":
      return (
        <>
          <InfoPanel title="Skill scoring" icon={<BriefcaseBusiness size={16} />} wide>
            {weightedSkillItems.length ? (
              <div className="skill-score-table">
                <div className="skill-score-header">
                  <span>Skill</span>
                  <span>Type</span>
                  <span>Status</span>
                  <span>Score</span>
                </div>
                {weightedSkillItems.map((item) => (
                  <div className="skill-score-row" key={`${item.name}-${item.type}`}>
                    <strong>{item.name}</strong>
                    <span>{item.type === "required" ? "Required" : "Nice to have"}</span>
                    <span className={item.matched ? "tone-strong" : "tone-weak"}>
                      {item.matched ? "Matched" : "Missing"}
                    </span>
                    <span>{item.score} / {item.weight}</span>
                  </div>
                ))}
                {zeroWeightCount > 0 ? (
                  <div className="inline-note">
                    {zeroWeightCount} skill item{zeroWeightCount > 1 ? "s" : ""} skipped because no weight is configured.
                  </div>
                ) : null}
              </div>
            ) : (
              <EmptyMini text="No skill weight configured." />
            )}
          </InfoPanel>

          <InfoPanel title="Experience reasoning" icon={<Sparkles size={16} />}>
            <p>{evaluation?.score_breakdown.experience?.reason ?? "No experience reasoning available."}</p>
          </InfoPanel>

          <InfoPanel title="Domain reasoning" icon={<Database size={16} />}>
            <p>{evaluation?.score_breakdown.domain?.reason ?? "No domain reasoning available."}</p>
          </InfoPanel>
        </>
      );

    case "feedback":
      return (
        <InfoPanel title="Hiring feedback" icon={<Sparkles size={16} />} wide>
          <p className="feedback-copy">{evaluation?.feedback ?? "No feedback generated yet."}</p>
        </InfoPanel>
      );

    case "risks":
      return (
        <InfoPanel title="Risks to review" icon={<ShieldAlert size={16} />} wide>
          {evaluation?.risks.length ? (
            <div className="stack-list">
              {evaluation.risks.map((risk) => (
                <div key={risk} className="stack-item danger">{risk}</div>
              ))}
            </div>
          ) : (
            <EmptyMini text="No risks listed." />
          )}
        </InfoPanel>
      );

    case "questions":
      return (
        <InfoPanel title="Interview questions" icon={<FileSearch size={16} />} wide>
          {evaluation?.interview_questions.length ? (
            <ol className="number-list">
              {evaluation.interview_questions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          ) : (
            <EmptyMini text="No interview questions generated." />
          )}
        </InfoPanel>
      );
  }
}

function ScoreRing({ score }: { score: number }) {
  const safeScore = Math.max(0, Math.min(100, score));
  return (
    <div
      className="score-ring"
      style={{
        background: `conic-gradient(#4f62d8 ${safeScore}%, rgba(79, 98, 216, 0.12) ${safeScore}% 100%)`,
      }}
    >
      <div className="score-ring-inner">
        <strong>{safeScore.toFixed(1)}</strong>
        <span>/100</span>
      </div>
    </div>
  );
}

function ScoreSummaryRow({
  label,
  value,
  max,
  emptyLabel,
}: {
  label: string;
  value: number;
  max: number;
  emptyLabel: string;
}) {
  if (max <= 0) {
    return (
      <div className="score-row empty">
        <div className="score-row-label">
          <span>{label}</span>
          <em>{emptyLabel}</em>
        </div>
      </div>
    );
  }

  const percent = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="score-row">
      <div className="score-row-label">
        <span>{label}</span>
        <strong>{value.toFixed(1)} / {max.toFixed(1)}</strong>
      </div>
      <div className="score-bar">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function UploadButton({
  disabled,
  loading,
  label,
  onChange,
}: {
  disabled: boolean;
  loading: boolean;
  label: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}) {
  return (
    <label className={`primary-button ${disabled ? "disabled" : ""}`}>
      {loading ? <LoaderCircle className="spinner" size={16} /> : <Upload size={16} />}
      <span>{loading ? "Uploading..." : label}</span>
      <input type="file" accept=".pdf,.docx" disabled={disabled} onChange={(event) => void onChange(event)} />
    </label>
  );
}

function StatusPill({ online }: { online: boolean }) {
  return <span className={`mini-pill ${online ? "online" : "offline"}`}>{online ? "API online" : "API offline"}</span>;
}

function Badge({
  tone,
  children,
}: {
  tone: BadgeTone;
  children: ReactNode;
}) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{hint}</p>
    </article>
  );
}

function InfoPanel({
  title,
  icon,
  wide = false,
  children,
}: {
  title: string;
  icon: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article className={`surface-card info-panel ${wide ? "wide" : ""}`}>
      <div className="panel-title">
        {icon}
        <h4>{title}</h4>
      </div>
      {children}
    </article>
  );
}

function EmptyPanel({
  title,
  description,
  actionLabel,
  onAction,
  compact = false,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={`empty-panel ${compact ? "compact" : ""}`}>
      <div className="empty-icon"><Sparkles size={18} /></div>
      <h3>{title}</h3>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button className="primary-button solid" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

function EmptyMini({ text }: { text: string }) {
  return <p className="empty-mini">{text}</p>;
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="status-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "danger" | "accent" | "neutral";
}) {
  return (
    <div className={`status-tile tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusOverviewItem({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  tone: "success" | "danger" | "accent" | "neutral";
}) {
  return (
    <div className={`status-overview-item tone-${tone}`}>
      <div className="status-overview-head">
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}

function BulletCopy({ text }: { text: string }) {
  return (
    <div className="bullet-copy">
      <CheckCircle2 size={14} />
      <span>{text}</span>
    </div>
  );
}

function formatGeminiStatus(status: GeminiStatus) {
  switch (status) {
    case "configured":
      return "Configured";
    case "not_configured":
      return "Not configured";
    default:
      return "Ready to test";
  }
}

function summarizeSkills(skills?: Array<{ name: string; weight: number }>) {
  if (!skills?.length) {
    return "No required skills parsed yet";
  }

  const names = skills.slice(0, 4).map((skill) => skill.name);
  return names.join(" · ");
}

function calculateSkillWeight(job: Job) {
  const required = (job.requirements.required_skills ?? []).reduce((sum, skill) => sum + (skill.weight ?? 0), 0);
  const niceToHave = (job.requirements.nice_to_have_skills ?? []).reduce((sum, skill) => sum + (skill.weight ?? 0), 0);
  return required + niceToHave;
}

function formatWeight(value: number) {
  return `${Number(value || 0).toFixed(0)}%`;
}

function formatYears(value?: number | null) {
  if (value === null || value === undefined) {
    return "Experience unavailable";
  }
  return `${value.toFixed(1)} years`;
}

function getTabFromHash(hash: string): TabKey | null {
  const normalizedHash = hash.replace(/^#/, "");
  if (tabs.some((tab) => tab.key === normalizedHash)) {
    return normalizedHash as TabKey;
  }
  return null;
}

function getInitialTab(): TabKey {
  if (typeof window === "undefined") {
    return "overview";
  }
  return getTabFromHash(window.location.hash) ?? "overview";
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength).trim()}...`;
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatRelative(value: string) {
  const deltaHours = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / (1000 * 60 * 60)));
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}
