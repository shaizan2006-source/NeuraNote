"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const DashboardContext = createContext(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardProvider");
  return ctx;
}

// ── Subject normalisation map ──────────────────────────────────
// RULE: no two distinct courses may share a canonical key.
// Generic umbrella names (e.g. "computer science") map to a broad key ("cs").
// Every specific sub-subject gets its own key so study plans never cross-contaminate.
// Aliases for the same concept (e.g. "os" / "operating systems") share one key.
// If a subject is not listed here, normalizeSubject() returns the lowercased name as-is.
const SUBJECT_MAP = {

  // ── Computer Science — generic ────────────────────────────
  "computer science": "cs", cse: "cs",

  // ── CS sub-subjects ───────────────────────────────────────
  "web technologies": "web", "web technology": "web", web: "web",

  daa: "daa", "design and analysis": "daa",
  "design and analysis of algorithms": "daa", algorithms: "daa",

  "data structures": "dsa", dsa: "dsa", "data structures and algorithms": "dsa",

  dbms: "dbms", database: "dbms", "database management": "dbms",
  "database management systems": "dbms",

  os: "os", "operating systems": "os", "operating system": "os",

  cn: "cn", "computer networks": "cn", networking: "cn",

  oops: "oop", oop: "oop", "object oriented programming": "oop",

  "software engineering": "se", se: "se",

  "compiler design": "cd",

  "theory of computation": "toc", toc: "toc",

  "cloud computing": "cloud",

  "cyber security": "cybersecurity", cybersecurity: "cybersecurity",

  // ── AI / ML ───────────────────────────────────────────────
  ai: "ai", "artificial intelligence": "ai",
  "machine learning": "ai", ml: "ai",
  "deep learning": "ai", dl: "ai", nlp: "ai",

  // ── Mathematics — generic ─────────────────────────────────
  mathematics: "math", maths: "math", math: "math",
  "engineering mathematics": "math",           // broad math course → umbrella key

  // ── Math sub-subjects ─────────────────────────────────────
  calculus: "calculus",
  "linear algebra": "linear algebra",
  "discrete mathematics": "discrete math", "discrete math": "discrete math",
  probability: "probability",
  statistics: "statistics",
  "differential equations": "differential equations",
  "numerical methods": "numerical methods",

  // ── Physics — generic ─────────────────────────────────────
  physics: "physics", "applied physics": "physics", "engineering physics": "physics",

  // ── Physics sub-subjects ──────────────────────────────────
  mechanics: "mechanics",
  thermodynamics: "thermodynamics",
  optics: "optics",
  electrostatics: "electrostatics",
  "modern physics": "modern physics",
  "nuclear physics": "nuclear physics",

  // ── Chemistry — generic ───────────────────────────────────
  chemistry: "chemistry", "engineering chemistry": "chemistry",

  // ── Chemistry sub-subjects ────────────────────────────────
  "organic chemistry": "organic chemistry",
  "inorganic chemistry": "inorganic chemistry",
  "physical chemistry": "physical chemistry",
  biochemistry: "biochemistry",

  // ── Biology — generic ─────────────────────────────────────
  biology: "biology",

  // ── Biology sub-subjects ──────────────────────────────────
  "cell biology": "cell biology",
  genetics: "genetics",
  ecology: "ecology",
  "human anatomy": "human anatomy",
  physiology: "physiology",
  botany: "botany",
  zoology: "zoology",
  microbiology: "microbiology",
  biotechnology: "biotechnology",

  // ── Law — generic ─────────────────────────────────────────
  law: "law",

  // ── Law sub-subjects ──────────────────────────────────────
  "constitutional law": "constitutional law",
  "criminal law": "criminal law",
  "civil law": "civil law",
  "contract law": "contract law",
  ipc: "ipc", crpc: "crpc", cpc: "cpc",
  "corporate law": "corporate law",
  "intellectual property": "intellectual property",
  jurisprudence: "jurisprudence",
  "family law": "family law",
  "labour law": "labour law",
  "company law": "company law",
  "evidence law": "evidence law",

  // ── Finance — generic ─────────────────────────────────────
  finance: "finance", commerce: "finance",

  // ── Finance sub-subjects ──────────────────────────────────
  accounting: "accounting", "financial accounting": "accounting",
  "cost accounting": "accounting",
  economics: "economics",
  "micro economics": "microeconomics", microeconomics: "microeconomics",
  "macro economics": "macroeconomics", macroeconomics: "macroeconomics",
  taxation: "taxation", "income tax": "taxation",
  gst: "gst",
  banking: "banking",
  auditing: "auditing",
  "financial management": "financial management",
  "business studies": "business studies",

  // ── Mechanical Engineering — generic ──────────────────────
  "mechanical engineering": "mechanical", mechanical: "mechanical",

  // ── Mechanical sub-subjects ───────────────────────────────
  "fluid mechanics": "fluid mechanics",
  "strength of materials": "strength of materials",
  "machine design": "machine design",
  manufacturing: "manufacturing",
  "heat transfer": "heat transfer",
  "engineering mechanics": "engineering mechanics",
  "theory of machines": "theory of machines",
  "industrial engineering": "industrial engineering",

  // ── Electrical Engineering — generic ──────────────────────
  "electrical engineering": "electrical", electrical: "electrical",

  // ── Electrical sub-subjects ───────────────────────────────
  electronics: "electronics",
  "electronic devices": "electronic devices",
  "control systems": "control systems",
  "power systems": "power systems",
  "digital electronics": "digital electronics",
  microprocessors: "microprocessors",
  "signals and systems": "signals and systems",
  "circuit theory": "circuit theory",
  electromagnetic: "electromagnetic",
  vlsi: "vlsi",

  // ── Medical — generic ─────────────────────────────────────
  medical: "medical", medicine: "medical", mbbs: "medical",
  "clinical medicine": "medical",

  // ── Medical sub-subjects ──────────────────────────────────
  anatomy: "anatomy", "gross anatomy": "anatomy", neuroanatomy: "anatomy",
  physiology: "physiology",
  biochemistry: "biochemistry",
  pathology: "pathology", "general pathology": "pathology",
  pharmacology: "pharmacology",
  microbiology: "microbiology",
  "community medicine": "community medicine", "preventive medicine": "community medicine",
  "forensic medicine": "forensic medicine", "forensic": "forensic medicine",
  surgery: "surgery", "general surgery": "surgery",
  "pediatrics": "pediatrics", paediatrics: "pediatrics",
  "obstetrics": "obstetrics and gynaecology", "gynaecology": "obstetrics and gynaecology",
  "obs and gynae": "obstetrics and gynaecology",
  psychiatry: "psychiatry",
  ophthalmology: "ophthalmology",
  ent: "ent", "ear nose throat": "ent",
  dermatology: "dermatology",
  orthopaedics: "orthopaedics", orthopedics: "orthopaedics",

  // ── Business / BBA / MBA — generic ───────────────────────
  business: "business", bba: "business", mba: "business",
  "business administration": "business", management: "business",

  // ── Business sub-subjects ─────────────────────────────────
  "principles of management": "principles of management",
  "human resource management": "hrm", hrm: "hrm",
  "marketing management": "marketing", marketing: "marketing",
  "operations management": "operations management",
  "organizational behavior": "organizational behavior",
  "organisational behaviour": "organizational behavior",
  "strategic management": "strategic management",
  entrepreneurship: "entrepreneurship",
  "business ethics": "business ethics",
  "international business": "international business",
  "business communication": "business communication",
  "research methodology": "research methodology",
};

const TIME_SLOTS = [
  "10:00 - 12:00", "12:00 - 1:00", "2:00 - 4:00",
  "5:00 - 7:00", "7:00 - 8:00", "8:00 - 9:00",
];

export function DashboardProvider({ children }) {
  const router = useRouter();
  // ── Documents ──────────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [documentId, setDocumentId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [savedPDFs, setSavedPDFs] = useState([]);

  // ── Q&A ────────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [asking, setAsking] = useState(false);
  const queueRef = useRef([]);
  const [queue, setQueue] = useState([]);
  const isProcessingRef = useRef(false);
  const [usedContext, setUsedContext] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [downloadUrl, setDownloadUrl] = useState(null);

  // ── Active Tab ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("study");

  // ── Upload ─────────────────────────────────────────────────────
  const [uploadStage, setUploadStage] = useState("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const [uploadedFileSize, setUploadedFileSize] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const uploadAbortRef = useRef(null);
  const uploadIntervalRef = useRef(null);
  const uploadDoneTimerRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // ── Auth ───────────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ── Exams ──────────────────────────────────────────────────────
  const [examName, setExamName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [exams, setExams] = useState([]);
  const [activeExams, setActiveExams] = useState([]);
  const [historyExams, setHistoryExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isExamExpanded, setIsExamExpanded] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [isExamSelectorOpen, setIsExamSelectorOpen] = useState(false);

  // ── Weak topics & progress ────────────────────────────────────
  const [weakTopics, setWeakTopics] = useState([]);
  const [progressQuestions, setProgressQuestions] = useState(0);
  const [progressScore, setProgressScore] = useState(0);
  const [streak, setStreak] = useState(1);
  const [lastActiveDate, setLastActiveDate] = useState(null);
  const [syllabusTopics, setSyllabusTopics] = useState([]);

  // ── Quiz ───────────────────────────────────────────────────────
  const [quiz, setQuiz] = useState(null);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [answers, setAnswers] = useState({});
  const [showResult, setShowResult] = useState(false);
  const [plan, setPlan] = useState([]);

  // ── Mastery / Brain ───────────────────────────────────────────
  const [masteryTopics, setMasteryTopics] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isBrainExpanded, setIsBrainExpanded] = useState(false);
  const [brainInsight, setBrainInsight] = useState("");

  // ── Plans ─────────────────────────────────────────────────────
  const [adaptivePlan, setAdaptivePlan] = useState([]);
  const [smartPlan, setSmartPlan] = useState([]);
  const [dailyPlan, setDailyPlan] = useState([]);
  const [isSmartExpanded, setIsSmartExpanded] = useState(false);
  const [isDailyExpanded, setIsDailyExpanded] = useState(false);
  const [showAllTasks, setShowAllTasks] = useState(false);

  // ── Focus Mode ────────────────────────────────────────────────
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1500);
  const [isBreak, setIsBreak] = useState(false);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [completedTasks, setCompletedTasks] = useState([]);
  const [taskStartTime, setTaskStartTime] = useState(null);
  const [focusProgress, setFocusProgress] = useState([]);
  const [isFocusExpanded, setIsFocusExpanded] = useState(false);

  // ── Analytics ─────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState({ totalCompleted: 0, easy: 0, medium: 0, hard: 0 });
  const [insights, setInsights] = useState([]);
  const [readiness, setReadiness] = useState({ score: 0, status: "", message: "" });
  const [isAnalyticsExpanded, setIsAnalyticsExpanded] = useState(false);
  const [isInsightsExpanded, setIsInsightsExpanded] = useState(false);
  const [chartType, setChartType] = useState("bar");

  // ── AI Coach ──────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  // ── showHistory ───────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);

  // ================================================================
  // PURE UTILITIES
  // ================================================================
  const normalizeSubject = (s) => {
    if (!s) return "";
    const key = s.toLowerCase().trim().replace(/\s+/g, " ");
    return SUBJECT_MAP[key] || key;
  };

  const normalizeTopic = (str) =>
    str?.toLowerCase().trim().replace(/\s+/g, " ") || "";

  const getDaysLeft = (date) => {
    const today = new Date();
    const exam = new Date(date + "T00:00:00");
    return Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const getDifficultyEmoji = (level) => {
    if (level === "hard") return "🔥";
    if (level === "medium") return "⚡";
    return "✅";
  };

  const getActionLabel = (daysLeft) => {
    if (daysLeft > 7) return "Learn";
    if (daysLeft > 3) return "Practice";
    if (daysLeft > 1) return "Revise";
    return "Final Revision";
  };

  const getActionPrefix = (daysLeft) => {
    if (daysLeft > 7) return "📘 Learn:";
    if (daysLeft > 3) return "📝 Practice:";
    if (daysLeft > 1) return "⚡ Revise:";
    return "🔥 Final Revision:";
  };

  const extractTopicFromTask = (taskStr) => {
    if (!taskStr) return "";
    let s = taskStr.replace(/^\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*(→|->)?\s*/i, "");
    s = s.replace(/^(learn|practice|revise|final revision)\s*:\s*/i, "");
    s = s.replace(/^[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\s]+/u, "");
    s = s.replace(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}🔥⚡✅📘📝]+$/u, "");
    return normalizeTopic(s);
  };

  const scoreTopic = (topicName, weakSet, importantSet) => {
    const t = normalizeTopic(topicName);
    let score = 1;
    if (weakSet.has(t)) score += 3;
    if (importantSet.has(t)) score += 2;
    return score;
  };

  // ================================================================
  // EXAM FUNCTIONS
  // ================================================================
  const getActiveExam = () => {
    if (selectedExam && selectedExam.id) return selectedExam;
    if (!Array.isArray(exams) || exams.length === 0) return null;
    const today = new Date();
    const validExams = exams
      .filter((e) => new Date(e.exam_date + "T00:00:00") >= today)
      .sort((a, b) => new Date(a.exam_date + "T00:00:00") - new Date(b.exam_date + "T00:00:00"));
    return validExams[0] || null;
  };

  const getStudySuggestion = () => {
    const exam = getActiveExam();
    if (!exam) return "No upcoming exams";
    const days = getDaysLeft(exam.exam_date);
    if (days > 7) return `📘 Focus on concepts for ${exam.name}`;
    if (days > 3) return `📝 Start practicing questions for ${exam.name}`;
    if (days > 1) return `⚡ Revise weak topics for ${exam.name}`;
    return `🔥 Final revision for ${exam.name}`;
  };

  const getReminder = () => {
    const exam = getActiveExam();
    if (!exam) return null;
    const days = getDaysLeft(exam.exam_date);
    if (days === 3) return "⏰ 3 days left! Time to speed up!";
    if (days === 1) return "🚨 Tomorrow is your exam!";
    if (days === 0) return "🔥 Exam is TODAY!";
    return null;
  };

  const addExam = async () => {
    if (!examName || !examDate) { alert("Please enter subject and date"); return; }
    try {
      const res = await fetch("/api/exam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: examName, exam_date: examDate }),
      });
      if (!res.ok) throw new Error("Failed to save exam");
      const newExam = await res.json();
      setActiveExams((prev) => [...prev, newExam]);
      setExams((prev) => [...prev, newExam]);
      setSelectedExam(newExam);
      setExamName("");
      setExamDate("");
    } catch (err) {
      console.error("addExam error:", err);
      alert("Failed to save exam. Please try again.");
    }
  };

  // ================================================================
  // BRAIN TOPICS
  // ================================================================
  const getFilteredBrainTopics = () => {
    const subject = selectedSubject || normalizeSubject(getActiveExam()?.name);
    const filtered = subject
      ? masteryTopics.filter((t) => normalizeSubject(t.subject) === subject)
      : masteryTopics;

    return [...filtered].sort((a, b) => {
      const scoreA = 100 - (a.mastery_score || 0) + (weakTopics.some((w) => normalizeTopic(w.topic) === normalizeTopic(a.topic)) ? 30 : 0);
      const scoreB = 100 - (b.mastery_score || 0) + (weakTopics.some((w) => normalizeTopic(w.topic) === normalizeTopic(b.topic)) ? 30 : 0);
      return scoreB - scoreA;
    });
  };

  const getBrainInsight = (topics) => {
    if (!topics.length) return "";
    const weakest = topics[0];
    if (!weakest) return "";
    if (weakest.mastery_score < 40) return `⚠️ You're struggling with "${weakest.topic}" — revise today`;
    if (weakest.mastery_score < 70) return `⚡ "${weakest.topic}" needs more practice before your exam`;
    return `✅ Good progress! Keep revising "${weakest.topic}"`;
  };

  // ================================================================
  // PLAN GENERATION
  // ================================================================
  const generateSmartPlan = () => {
    const exam = getActiveExam();
    const subject = normalizeSubject(exam?.name);
    if (!subject) return ["Select a subject to generate your plan"];
    const dLeft = exam ? getDaysLeft(exam.exam_date) : 7;
    const subjectSyllabus = syllabusTopics.filter((s) => normalizeSubject(s.subject) === subject);
    if (subjectSyllabus.length === 0) return [`No syllabus found for ${exam?.name}. Please upload your PDF.`];
    const validTopicSet = new Set(subjectSyllabus.map((s) => normalizeTopic(s.topic)));
    const subjectWeak = weakTopics.filter((t) => normalizeSubject(t.subject) === subject && validTopicSet.has(normalizeTopic(t.topic)));
    const weakSet = new Set(subjectWeak.map((t) => normalizeTopic(t.topic)));
    const importantSet = new Set(subjectSyllabus.filter((s) => s.importance === "high" || s.weight >= 2).map((s) => normalizeTopic(s.topic)));
    const scoredTopics = Array.from(validTopicSet).map((topic) => {
      const weakEntry = subjectWeak.find((t) => normalizeTopic(t.topic) === topic);
      const level = weakEntry?.level || "easy";
      return { topic, level, score: scoreTopic(topic, weakSet, importantSet) };
    });
    scoredTopics.sort((a, b) => b.score - a.score);
    return scoredTopics.map(({ topic, level }) => `${getActionPrefix(dLeft)} ${topic} ${getDifficultyEmoji(level)}`);
  };

  const generateAdaptivePlan = () => {
    const exam = getActiveExam();
    const subject = normalizeSubject(exam?.name);
    if (!subject) return ["Start with a subject"];
    const dLeft = exam ? getDaysLeft(exam.exam_date) : 7;
    const subjectSyllabus = syllabusTopics.filter((s) => normalizeSubject(s.subject) === subject);
    if (subjectSyllabus.length === 0) return [`No syllabus found for ${exam?.name}. Please upload your PDF.`];
    const validTopicSet = new Set(subjectSyllabus.map((s) => normalizeTopic(s.topic)));
    const subjectWeak = weakTopics.filter((t) => normalizeSubject(t.subject) === subject && validTopicSet.has(normalizeTopic(t.topic)));
    const weakSet = new Set(subjectWeak.map((t) => normalizeTopic(t.topic)));
    const importantSet = new Set(subjectSyllabus.filter((s) => s.importance === "high" || s.weight >= 2).map((s) => normalizeTopic(s.topic)));
    const topicDifficultyMap = {};
    focusProgress.forEach((item) => {
      const cleanTopic = extractTopicFromTask(item.task);
      if (cleanTopic && validTopicSet.has(cleanTopic) && !topicDifficultyMap[cleanTopic]) {
        topicDifficultyMap[cleanTopic] = item.difficulty || "medium";
      }
    });
    const scoredTopics = Array.from(validTopicSet).map((topic) => {
      const weakEntry = subjectWeak.find((t) => normalizeTopic(t.topic) === topic);
      const level = topicDifficultyMap[topic] || weakEntry?.level || "medium";
      return { topic, level, score: scoreTopic(topic, weakSet, importantSet) };
    });
    scoredTopics.sort((a, b) => b.score - a.score);
    const action = getActionLabel(dLeft);
    return scoredTopics.map(({ topic, level }, i) => `${TIME_SLOTS[i % TIME_SLOTS.length]} → ${action}: ${topic} ${getDifficultyEmoji(level)}`);
  };

  // ================================================================
  // ANALYTICS
  // ================================================================
  const generateAnalytics = () => {
    if (!focusProgress || focusProgress.length === 0) return;
    let easy = 0, medium = 0, hard = 0;
    focusProgress.forEach((item) => {
      if (item.difficulty === "easy") easy++;
      else if (item.difficulty === "medium") medium++;
      else if (item.difficulty === "hard") hard++;
    });
    setAnalytics({ totalCompleted: focusProgress.length, easy, medium, hard });
  };

  const generateInsights = () => {
    if (!focusProgress || focusProgress.length === 0) {
      setInsights(["Start completing tasks to get insights"]);
      return;
    }
    const total = focusProgress.length;
    let easy = 0, medium = 0, hard = 0;
    focusProgress.forEach((item) => {
      if (item.difficulty === "easy") easy++;
      else if (item.difficulty === "medium") medium++;
      else if (item.difficulty === "hard") hard++;
    });
    const msgs = [];
    if (easy > hard) msgs.push("📈 Your performance is improving — keep it up!");
    else if (hard > easy) msgs.push("⚠️ You are struggling with difficult topics — revise more.");
    if (total < 5) msgs.push("⏳ Try completing more tasks to build consistency.");
    else if (total > 10) msgs.push("🔥 Great consistency! You're building a strong habit.");
    if (medium > easy && medium > hard) msgs.push("⚡ You are in a balanced learning zone.");
    if (hard >= 5) msgs.push("🧠 Focus more on weak areas — they need attention.");
    setInsights(msgs);
  };

  const generateReadiness = () => {
    if (!focusProgress || focusProgress.length === 0) {
      setReadiness({ score: 0, status: "Not Ready", message: "Start solving tasks to measure readiness" });
      return;
    }
    const exam = getActiveExam();
    if (!exam) return;
    const dLeft = getDaysLeft(exam.exam_date);
    let easy = 0, medium = 0, hard = 0;
    focusProgress.forEach((item) => {
      if (item.difficulty === "easy") easy++;
      else if (item.difficulty === "medium") medium++;
      else if (item.difficulty === "hard") hard++;
    });
    const total = focusProgress.length;
    let score = (easy * 1.0 + medium * 0.7 + hard * 0.4) / total;
    if (dLeft <= 2) score *= 0.8;
    if (dLeft <= 1) score *= 0.6;
    score = Math.min(1, score);
    const percentage = Math.round(score * 100);
    let status = "", message = "";
    if (percentage >= 80) { status = "Ready ✅"; message = "You are well prepared. Do final revision."; }
    else if (percentage >= 50) { status = "Almost Ready ⚡"; message = "Focus on weak areas to improve."; }
    else { status = "Not Ready ❌"; message = "You need more practice and revision."; }
    setReadiness({ score: percentage, status, message });
  };

  // ================================================================
  // FOCUS MODE
  // ================================================================
  const startFocus = (duration = 1500, breakMode = false) => {
    setIsFocusMode(true);
    setTimeLeft(duration);
    setIsBreak(breakMode);
    setCurrentTaskIndex(0);
    setTaskStartTime(Date.now());
  };

  const stopFocus = () => setIsFocusMode(false);

  const markTaskDone = async () => {
    const task = dailyPlan[currentTaskIndex];
    const endTime = Date.now();
    const duration = taskStartTime ? (endTime - taskStartTime) / 1000 : 0;
    let difficulty = "medium";
    if (duration > 1500) difficulty = "hard";
    else if (duration < 600) difficulty = "easy";
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    await fetch("/api/focus-progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: session.user.id, task, task_index: currentTaskIndex, difficulty }),
    });
    setCompletedTasks((prev) => [...prev, currentTaskIndex]);
    setCurrentTaskIndex((prev) => (prev + 1 >= dailyPlan.length ? prev : prev + 1));
    setTaskStartTime(Date.now());
  };

  // ================================================================
  // AI COACH
  // ================================================================
  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, context: { exams, weakTopics, readiness, analytics } }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (err) {
      console.error(err);
    }
  };

  // ================================================================
  // AUTH
  // ================================================================
  const handleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { alert("Invalid credentials."); return; }
      window.location.href = "/dashboard";
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };

  // ================================================================
  // DATA FETCHING
  // ================================================================
  const fetchDocuments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/documents", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      // API returns a plain array, not { documents: [...] }
      setDocuments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  };

  const fetchSavedPDFs = async () => {
    try {
      const res = await fetch("/api/get-pdfs");
      const data = await res.json();
      setSavedPDFs(Array.isArray(data) ? data : []);
    } catch (err) {
      setSavedPDFs([]);
    }
  };

  const handleSavePDF = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/save-pdf", { method: "POST", body: formData });
    const data = await res.json();
    setSavedPDFs((prev) => [...prev, data]);
  };

  const deletePDF = async (id) => {
    await fetch(`/api/delete-pdf?id=${id}`, { method: "DELETE" });
    setSavedPDFs((prev) => prev.filter((pdf) => pdf.id !== id));
  };

  const detectMultiplePDFs = () =>
    savedPDFs.filter((pdf) => question.toLowerCase().includes(pdf.name.toLowerCase()));

  const fetchStreak = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/streak", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      setStreak(data.streak || 1);
      if (data.lastActiveDate) setLastActiveDate(data.lastActiveDate);
    } catch (err) {
      console.error("Failed to load streak", err);
    }
  };

  const fetchExam = async () => {
    try {
      const res = await fetch("/api/exam");
      const data = await res.json();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const rawActive = Array.isArray(data.active) ? data.active : [];
      const rawHistory = Array.isArray(data.history) ? data.history : [];
      const trueActive = rawActive.filter((e) => new Date(e.exam_date + "T00:00:00") >= today);
      const expiredFromActive = rawActive.filter((e) => new Date(e.exam_date + "T00:00:00") < today);
      const trueHistory = [...rawHistory, ...expiredFromActive].sort((a, b) => a.name.localeCompare(b.name));
      expiredFromActive.forEach((e) => {
        fetch("/api/exam", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: e.id, status: "completed" }) }).catch(console.error);
      });
      setExams(trueActive);
      setActiveExams(trueActive);
      setHistoryExams(trueHistory);
      if (trueActive.length === 1 && !selectedExam) setSelectedExam(trueActive[0]);
      else if (trueActive.length > 1 && !selectedExam) {
        const nearest = [...trueActive].sort((a, b) => new Date(a.exam_date + "T00:00:00") - new Date(b.exam_date + "T00:00:00"))[0];
        setSelectedExam(nearest);
      }
    } catch (err) {
      setExams([]); setActiveExams([]); setHistoryExams([]);
    }
  };

  const fetchWeakTopics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/weak-topics", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      setWeakTopics(data.topics || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSyllabus = async () => {
    try {
      const res = await fetch("/api/syllabus");
      const data = await res.json();
      setSyllabusTopics(data.topics || []);
    } catch (err) {
      console.error("Syllabus fetch error:", err);
    }
  };

  const fetchDailyPlan = async (attempt = 0) => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) return;
      const res = await fetch("/api/daily-plan", { headers: { Authorization: `Bearer ${session.access_token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setPlan(data.plan || []);
    } catch (err) {
      if (attempt < 2) {
        setTimeout(() => fetchDailyPlan(attempt + 1), 1500);
      } else {
        console.warn("fetchDailyPlan failed after retries:", err);
      }
    }
  };

  const fetchProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const res = await fetch("/api/progress", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const data = await res.json();
      setProgressQuestions(data.questions || 0);
      setProgressScore(data.score || 0);
    } catch (err) {
      console.error("Failed to load progress", err);
    }
  };

  const fetchFocusProgress = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const res = await fetch(`/api/focus-progress?user_id=${session.user.id}`);
    const data = await res.json();
    setFocusProgress(data);
    setCompletedTasks(data.map((item) => item.task));
  };

  // ================================================================
  // QUIZ
  // ================================================================
  const generateQuiz = async () => {
    setLoadingQuiz(true);
    setShowResult(false);
    setAnswers({});
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { alert("User not logged in"); return; }
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");
      setQuiz(data.questions || []);
      setUsedContext(data.usedContext);
    } catch (err) {
      console.error(err);
      alert("Error generating quiz");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleNewQuiz = async () => {
    setLoadingQuiz(true);
    setShowResult(false);
    setAnswers({});
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { alert("User not logged in"); return; }
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: session.user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");
      setQuiz(data.questions || []);
      setUsedContext(data.usedContext);
    } catch (err) {
      console.error(err);
      alert("Error generating new quiz");
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleReattemptQuiz = () => { setAnswers({}); setShowResult(false); };

  // ================================================================
  // UPLOAD
  // ================================================================
  const handleUpload = async (fileToUpload) => {
    const targetFile = fileToUpload || file;
    if (!targetFile) { alert("Please select a PDF file"); return; }
    if (targetFile.type !== "application/pdf") { setUploadStage("error"); return; }
    if (targetFile.size > 20 * 1024 * 1024) { alert("File too large. Max 20MB."); return; }

    // ── Kill any stale timers / aborts from a previous upload ──
    if (uploadIntervalRef.current) { clearInterval(uploadIntervalRef.current); uploadIntervalRef.current = null; }
    if (uploadDoneTimerRef.current) { clearTimeout(uploadDoneTimerRef.current); uploadDoneTimerRef.current = null; }
    if (uploadAbortRef.current) { uploadAbortRef.current = null; }

    // ── Hard-reset all upload state so UI starts fresh ──
    setUploadStage("uploading");
    setUploadProgress(0);
    setUploadedFileName(targetFile.name);
    setUploadedFileSize((targetFile.size / 1024).toFixed(1) + " KB");

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    // Smooth non-linear progress: fast 0→60%, medium 60→80%, slow 80→85%
    let simElapsed = 0;
    const SIM_DURATION = 10000; // 10 s to reach 85 %
    const TICK_MS = 50;         // 20 fps — visually smooth, low overhead

    const progressInterval = setInterval(() => {
      simElapsed += TICK_MS;
      const t = Math.min(simElapsed / SIM_DURATION, 1);
      let pct;
      if (t < 0.35)      pct = (t / 0.35) * 60;                         // 0 → 60 % fast
      else if (t < 0.75) pct = 60 + ((t - 0.35) / 0.40) * 20;          // 60 → 80 % medium
      else               pct = 80 + ((t - 0.75) / 0.25) * 5;            // 80 → 85 % slow

      setUploadProgress(Math.round(pct));
      if (t >= 1) clearInterval(progressInterval);
    }, TICK_MS);
    uploadIntervalRef.current = progressInterval;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append("file", targetFile);
      formData.append("subject", examName || "general");
      setUploadStage("processing");
      setUploadProgress(90);
      const res = await fetch("/api/process-pdf", {
        method: "POST",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: formData,
        signal: controller.signal,
      });
      clearInterval(progressInterval);
      uploadIntervalRef.current = null;
      setUploadProgress(100);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setDocumentId(data.documentId);
      setUploadStage("done");
      fetchDocuments();

      // Auto-reset to idle after a brief "done" flash (tracked so next upload can cancel it)
      uploadDoneTimerRef.current = setTimeout(() => {
        setUploadStage("idle");
        setUploadProgress(0);
        uploadDoneTimerRef.current = null;
      }, 1200);
    } catch (err) {
      clearInterval(progressInterval);
      uploadIntervalRef.current = null;
      if (err.name === "AbortError") {
        setUploadStage("idle");
        setUploadProgress(0);
        setFile(null);
        const input = typeof document !== "undefined" ? document.getElementById("pdf-file-input") : null;
        if (input) input.value = "";
      } else {
        console.error(err);
        setUploadStage("error");
        setUploadProgress(0);
        // Auto-reset error state so stale UI doesn't persist
        uploadDoneTimerRef.current = setTimeout(() => {
          setUploadStage("idle");
          uploadDoneTimerRef.current = null;
        }, 3000);
      }
    } finally {
      uploadAbortRef.current = null;
    }
  };

  const cancelUpload = () => {
    if (uploadIntervalRef.current) { clearInterval(uploadIntervalRef.current); uploadIntervalRef.current = null; }
    if (uploadDoneTimerRef.current) { clearTimeout(uploadDoneTimerRef.current); uploadDoneTimerRef.current = null; }
    if (uploadAbortRef.current) uploadAbortRef.current.abort();
  };

  // ================================================================
  // handleAsk
  // ================================================================
  const handleAsk = async (questionText) => {
    if (!questionText.trim()) return;

    const matchedPDFs = detectMultiplePDFs();
    const documentIds = matchedPDFs.length > 0
      ? matchedPDFs.map((pdf) => pdf.document_id)
      : documentId ? [documentId] : [];
    // Bug #1 fix: allow questions without a PDF (general knowledge mode)
    // documentIds may be empty — the API handles this gracefully

    setAsking(true);
    setAnswer("");
    setSources([]);
    setFromCache(false);
    setDownloadUrl(null);

    // Get session once — reused for /api/ask auth header and post-stream tracking
    const { data: { session: askSession } } = await supabase.auth.getSession();
    const askAuthHeader = askSession?.access_token
      ? { Authorization: `Bearer ${askSession.access_token}` }
      : {};

    // Helper: fire-and-forget tracking calls (streak + progress + weak topics)
    const fireTracking = () => {
      // Capture streak POST separately so we can update state immediately from its response,
      // before the full Promise.all settles — ensures SessionCallout sees the new streak
      // at sessionCount===1 (the milestone window).
      const streakFetch = fetch("/api/streak", { method: "POST", headers: askAuthHeader })
        .then((r) => r.json())
        .then((d) => { if (d.streak) setStreak(d.streak); });

      Promise.all([
        streakFetch,
        fetch("/api/progress", { method: "POST", headers: askAuthHeader }),
        askSession?.access_token
          ? fetch("/api/weak-topics", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...askAuthHeader },
              body: JSON.stringify({ question: questionText, subject: getActiveExam()?.name || "general" }),
            })
          : Promise.resolve(),
      ])
        .then(() => { fetchStreak(); fetchProgress(); fetchWeakTopics(); })
        .catch((err) => console.error("Tracking error:", err));
    };

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...askAuthHeader },
        body: JSON.stringify({
          question: questionText,
          documentId:  documentIds[0] || null,
          documentIds: documentIds.length > 0 ? documentIds : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "AI request failed");
      }

      const contentType = res.headers.get("Content-Type") || "";
      const isStreaming = contentType.includes("text/plain");

      if (!isStreaming) {
        const data = await res.json();
        setAnswer(data.answer || "");
        setSources(data.sources || []);
        if (data.downloadUrl) setDownloadUrl(data.downloadUrl);
        setAsking(false);
        fireTracking();
        return;
      }

      const sourcesHeader = res.headers.get("X-Sources");
      const usedCtx = res.headers.get("X-Used-Context");
      if (sourcesHeader) { try { setSources(JSON.parse(sourcesHeader)); } catch {} }
      setUsedContext(usedCtx === "true");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let metaHandled = false;
      // Bug #2 fix: keep asking=true during streaming so cursor renders

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const rawChunk = decoder.decode(value, { stream: true });

        if (!metaHandled && rawChunk.startsWith("__META__")) {
          try {
            const metaLine = rawChunk.replace("__META__", "").split("\n")[0];
            const meta = JSON.parse(metaLine);
            if (meta.sources) setSources(meta.sources);
            if (typeof meta.usedContext !== "undefined") setUsedContext(meta.usedContext);
            if (meta.fromCache) setFromCache(true);
            // Dispatch classification to AskAISection via custom event
            if (meta.classification) {
              window.dispatchEvent(new CustomEvent("askmynotes:classification", { detail: meta.classification }));
            }
            const rest = rawChunk.replace(`__META__${metaLine}\n`, "");
            if (rest) { accumulated += rest; setAnswer(accumulated); }
            metaHandled = true;
          } catch {
            accumulated += rawChunk;
            setAnswer(accumulated);
            metaHandled = true;
          }
          continue;
        }
        accumulated += rawChunk;
        setAnswer(accumulated);
      }

      fireTracking();
    } catch (err) {
      console.error("Stream error:", err);
      setAnswer("");
      alert(err.message || "Connection lost. Please try again.");
    } finally {
      setAsking(false);
    }
  };

  const processQueue = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    while (queueRef.current.length > 0) {
      const next = queueRef.current[0];
      queueRef.current = queueRef.current.slice(1);
      setQueue([...queueRef.current]);
      await handleAsk(next);
    }
    isProcessingRef.current = false;
  };

  const enqueue = (q) => {
    if (!q.trim()) return;
    queueRef.current = [...queueRef.current, q];
    setQueue([...queueRef.current]);
    processQueue();
  };

  const handleInputChange = (value) => {
    setQuestion(value);
    if (!value) { setSuggestions([]); return; }
    const matches = savedPDFs.filter((pdf) => pdf.name.toLowerCase().includes(value.toLowerCase()));
    setSuggestions(matches.slice(0, 5));
  };

  const score = quiz ? quiz.reduce((acc, q, i) => acc + (answers[i] === q.answer ? 1 : 0), 0) : 0;

  const difficultyData = [
    { name: "Easy", value: analytics.easy },
    { name: "Medium", value: analytics.medium },
    { name: "Hard", value: analytics.hard },
  ];

  // ================================================================
  // useEffect HOOKS
  // ================================================================
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      return session;
    };

    getUser().then(async (session) => {
      const userId = session?.user?.id;

      // Redirect new users to onboarding if not completed
      const onboardingDone = session?.user?.user_metadata?.onboarding_completed;
      if (userId && !onboardingDone) {
        router.push("/onboarding");
        return;
      }

      const fetchAdaptivePlan = async () => {
        if (!userId) return;
        const res = await fetch(`/api/study-plan/adaptive?user_id=${userId}`);
        const data = await res.json();
        setAdaptivePlan(data.plan || []);
      };

      const fetchMastery = async () => {
        if (!userId) return;
        const res = await fetch(`/api/mastery/get?user_id=${userId}`);
        const data = await res.json();
        setMasteryTopics(data.topics || []);
      };

      // Update streak on every login / session restore (idempotent — same-day calls are no-ops)
      if (session?.access_token) {
        fetch("/api/streak", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }).then(() => fetchStreak()).catch(console.error);
      }

      Promise.all([
        fetchDocuments(),
        fetchSavedPDFs(),
        fetchStreak(),
        fetchExam(),
        fetchWeakTopics(),
        fetchProgress(),
        fetchFocusProgress(),
        fetchSyllabus(),
        fetchAdaptivePlan(),
        fetchDailyPlan(),
        fetchMastery(),
        fetch("/api/activity", { method: "POST" }),
      ]);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    if ("Notification" in window) Notification.requestPermission();

    return () => { authListener?.subscription?.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchDailyPlan();
  }, [user]);

  useEffect(() => {
    if (!isFocusMode) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === 0) {
          if (isBreak) { setIsBreak(false); setTimeLeft(1500); setCurrentTaskIndex((p) => p + 1); }
          else { setIsBreak(true); setTimeLeft(300); }
          return prev;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isFocusMode, isBreak]);

  useEffect(() => { generateAnalytics(); generateReadiness(); }, [focusProgress]);
  useEffect(() => { generateInsights(); }, [focusProgress]);

  useEffect(() => {
    if (!selectedExam) return;
    setSmartPlan(generateSmartPlan());
    setDailyPlan(generateAdaptivePlan());
  }, [selectedExam]);

  useEffect(() => {
    if (!syllabusTopics?.length) return;
    setSmartPlan(generateSmartPlan());
  }, [selectedExam?.id, exams.length, weakTopics.length, syllabusTopics.length]);

  useEffect(() => {
    if (!syllabusTopics?.length) return;
    setDailyPlan(generateAdaptivePlan());
  }, [selectedExam?.id, exams.length, weakTopics.length, syllabusTopics.length, completedTasks.length]);

  useEffect(() => {
    const filtered = getFilteredBrainTopics();
    setBrainInsight(getBrainInsight(filtered));
  }, [masteryTopics, selectedSubject, weakTopics]);

  // ================================================================
  // CONTEXT VALUE
  // ================================================================
  return (
    <DashboardContext.Provider value={{
      // Tab navigation
      activeTab, setActiveTab,
      // State
      file, setFile,
      documentId, setDocumentId,
      documents, savedPDFs,
      question, setQuestion,
      answer, setAnswer,
      sources, asking, setAsking,
      usedContext, fromCache, suggestions, setSuggestions,
      downloadUrl, setDownloadUrl,
      uploadStage, setUploadStage,
      uploadProgress, uploadedFileName, uploadedFileSize,
      isDragging, setIsDragging, uploading,
      user, email, setEmail, password, setPassword,
      examName, setExamName, examDate, setExamDate,
      exams, activeExams, historyExams, selectedExam, setSelectedExam,
      isExamExpanded, setIsExamExpanded,
      isHistoryExpanded, setIsHistoryExpanded,
      isExamSelectorOpen, setIsExamSelectorOpen,
      weakTopics, progressQuestions, progressScore, streak, lastActiveDate,
      syllabusTopics, quiz, loadingQuiz,
      answers, setAnswers, showResult, setShowResult,
      plan, masteryTopics,
      selectedSubject, setSelectedSubject,
      isBrainExpanded, setIsBrainExpanded, brainInsight,
      adaptivePlan, smartPlan, dailyPlan,
      isSmartExpanded, setIsSmartExpanded,
      isDailyExpanded, setIsDailyExpanded,
      showAllTasks, setShowAllTasks,
      isFocusMode, timeLeft, isBreak, currentTaskIndex, completedTasks,
      focusProgress, isFocusExpanded, setIsFocusExpanded,
      analytics, insights, readiness,
      isAnalyticsExpanded, setIsAnalyticsExpanded,
      isInsightsExpanded, setIsInsightsExpanded,
      chartType, setChartType,
      messages, input, setInput,
      showHistory, setShowHistory,
      difficultyData, score,
      // Functions
      normalizeSubject, normalizeTopic, getDaysLeft, formatTime,
      getActiveExam, getStudySuggestion, addExam,
      getFilteredBrainTopics, getBrainInsight,
      generateSmartPlan, generateAdaptivePlan,
      generateAnalytics, generateInsights, generateReadiness,
      startFocus, stopFocus, markTaskDone,
      sendMessage, handleLogin,
      fetchDocuments, fetchSavedPDFs, handleSavePDF, deletePDF,
      fetchStreak, fetchExam, fetchWeakTopics, fetchSyllabus,
      fetchDailyPlan, fetchProgress, fetchFocusProgress,
      generateQuiz, handleNewQuiz, handleReattemptQuiz,
      handleUpload, cancelUpload,
      handleAsk, handleInputChange, queue, enqueue,
    }}>
      {children}
    </DashboardContext.Provider>
  );
}
