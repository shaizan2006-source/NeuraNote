'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/shared/TopBar';
import Avatar from '@/components/shared/Avatar';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

// ─────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────
export default function CoachPage() {
  const router = useRouter();
  const [uiState, setUiState] = useState('welcome'); // 'welcome' | 'topic_picker' | 'mode_selector'
  const [selectedMode, setSelectedMode] = useState('explain');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [coachStatus, setCoachStatus] = useState({ strong: 'Mechanics', needsWork: 'Thermodynamics', recommendedMode: 'explain' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/coach-status')
      .then((r) => r.json())
      .then((d) => setCoachStatus(d))
      .catch(() => {}) // keep fallback values
      .finally(() => setLoading(false));
  }, []);

  const handleBack = () => {
    if (uiState === 'welcome') router.back();
    else if (uiState === 'topic_picker') setUiState('welcome');
    else if (uiState === 'mode_selector') setUiState('topic_picker');
  };

  const handleStartSession = () => {
    if (uiState === 'welcome') {
      router.push(`/coach/session?mode=${selectedMode}`);
    } else if (uiState === 'mode_selector' && selectedTopic) {
      router.push(`/coach/session?mode=${selectedMode}&topicId=${selectedTopic.id}`);
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    position: 'relative',
    overflow: 'hidden',
  };

  const glowStyle = {
    position: 'absolute',
    width: '320px',
    height: '280px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
    top: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    zIndex: 0,
  };

  const contentStyle = {
    position: 'relative',
    zIndex: 1,
    maxWidth: '480px',
    margin: '0 auto',
    padding: `${SPACING.xl} ${SPACING.xxl}`,
  };

  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.text.secondary, fontSize: TYPOGRAPHY.sizes.body }}>Loading Aria...</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={glowStyle} />
      <TopBar onBack={handleBack} />
      <div style={contentStyle}>
        <CoachGreeting coachStatus={coachStatus} uiState={uiState} selectedTopic={selectedTopic} />

        {uiState === 'welcome' && (
          <WelcomeState
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            onStudyOwn={() => setUiState('topic_picker')}
            onStart={handleStartSession}
          />
        )}

        {uiState === 'topic_picker' && (
          <TopicPickerState
            onSelectTopic={(topic) => {
              setSelectedTopic(topic);
              setUiState('mode_selector');
            }}
          />
        )}

        {uiState === 'mode_selector' && (
          <ModeSelectorState
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            onStart={handleStartSession}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Greeting (shared across all states)
// ─────────────────────────────────────────────────────────
function CoachGreeting({ coachStatus, uiState, selectedTopic }) {
  const greetingMap = {
    welcome: (
      <>
        You&apos;re{' '}
        <span style={{ color: COLORS.text.accent }}>close on {coachStatus.strong}</span> — but{' '}
        <span style={{ color: '#fbbf24' }}>{coachStatus.needsWork}</span> needs work.
      </>
    ),
    topic_picker: "Pick a topic from your documents.",
    mode_selector: selectedTopic ? `How would you like to study ${selectedTopic.name}?` : 'Choose a study style.',
  };

  const labelMap = {
    welcome: "Good morning, Shafi ☀",
    topic_picker: "What's on your mind today?",
    mode_selector: selectedTopic ? `Starting: ${selectedTopic.name}` : 'Starting session',
  };

  return (
    <div style={{ textAlign: 'center', marginBottom: SPACING.xl, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.lg }}>
      <Avatar size="lg" />
      <div>
        <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: TYPOGRAPHY.weights.semibold, marginBottom: '6px' }}>
          {labelMap[uiState]}
        </div>
        <div style={{ fontSize: '17px', fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text.primary, lineHeight: 1.55, maxWidth: '280px' }}>
          {greetingMap[uiState]}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// State: Welcome
// ─────────────────────────────────────────────────────────
const MODES = [
  { id: 'explain', icon: '🧠', title: 'Explain it to me', subtitle: 'Coach walks you through step by step' },
  { id: 'quiz',    icon: '⚡', title: 'Quiz me',           subtitle: 'Socratic questions on your weak topics' },
  { id: 'exam',    icon: '🎯', title: 'Exam prep',         subtitle: 'Practice exam-style questions' },
];

function WelcomeState({ selectedMode, onModeChange, onStudyOwn, onStart }) {
  return (
    <>
      <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.lg, fontWeight: TYPOGRAPHY.weights.medium }}>
        How do you want to study?
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, marginBottom: SPACING.xl }}>
        {MODES.map((m) => (
          <Card key={m.id} icon={m.icon} title={m.title} subtitle={m.subtitle} active={selectedMode === m.id} onClick={() => onModeChange(m.id)} />
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg, margin: `${SPACING.sm} 0 ${SPACING.md}` }}>
        <div style={{ flex: 1, height: '1px', background: COLORS.border.light }} />
        <span style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, whiteSpace: 'nowrap' }}>or study your own topic</span>
        <div style={{ flex: 1, height: '1px', background: COLORS.border.light }} />
      </div>

      {/* Dashed free-choice card */}
      <div style={{ marginBottom: SPACING.xl }}>
        <Card icon="✏️" title="I want to study something else" subtitle="Pick a topic or document from notes" dashed onClick={onStudyOwn} />
      </div>

      <Button label="Start Session →" variant="primary" fullWidth onClick={onStart} />
    </>
  );
}

// ─────────────────────────────────────────────────────────
// State: Topic Picker
// ─────────────────────────────────────────────────────────
function TopicPickerState({ onSelectTopic }) {
  const [allTopics, setAllTopics] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/ai/search-topics?query=')
      .then((r) => r.json())
      .then((d) => {
        const topics = d.topics || [];
        setAllTopics(topics);
        setFiltered(topics);
      })
      .catch(() => {
        // Mock fallback
        const mock = [
          { id: '1', name: 'Mechanics Notes', category: 'Mechanics' },
          { id: '2', name: 'Thermodynamics Ch.3', category: 'Thermodynamics' },
          { id: '3', name: 'Optics', category: 'Optics' },
          { id: '4', name: 'Waves', category: 'Waves' },
          { id: '5', name: 'Modern Physics', category: 'Modern Physics' },
        ];
        setAllTopics(mock);
        setFiltered(mock);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = search.toLowerCase().trim();
    setFiltered(q ? allTopics.filter((t) => t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q)) : allTopics);
  }, [search, allTopics]);

  const searchBarStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.md,
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${COLORS.border.lighter}`,
    borderRadius: '11px',
    padding: `${SPACING.md} ${SPACING.lg}`,
    marginBottom: SPACING.xl,
  };

  // Group by category
  const grouped = filtered.reduce((acc, t) => {
    const cat = t.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  // Get recent (first 4 overall) separately
  const recent = filtered.slice(0, 4);

  if (loading) return <div style={{ color: COLORS.text.secondary, textAlign: 'center' }}>Loading topics...</div>;

  return (
    <div>
      {/* Search */}
      <div style={searchBarStyle}>
        <span style={{ fontSize: '13px' }}>🔍</span>
        <input
          type="text"
          placeholder="Search topics or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.primary, fontFamily: TYPOGRAPHY.fontFamily }}
        />
        {search && (
          <span
            onClick={() => setSearch('')}
            style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, cursor: 'pointer' }}
          >
            ✕
          </span>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: COLORS.text.secondary, fontSize: TYPOGRAPHY.sizes.caption }}>
          No topics found. Try a different search.
        </div>
      )}

      {/* Recent section (only if no search query) */}
      {!search && recent.length > 0 && (
        <Section label="⏱ RECENTLY STUDIED" topics={recent} onSelect={onSelectTopic} />
      )}

      {/* Category sections */}
      {search
        ? <Section label={`${filtered.length} result${filtered.length !== 1 ? 's' : ''}`} topics={filtered} onSelect={onSelectTopic} />
        : Object.entries(grouped).map(([cat, topics]) => (
            <Section key={cat} label={`📚 ${cat.toUpperCase()} (${topics.length})`} topics={topics} onSelect={onSelectTopic} />
          ))
      }
    </div>
  );
}

function Section({ label, topics, onSelect }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ marginBottom: SPACING.xl }}>
      <div
        onClick={() => setExpanded((e) => !e)}
        style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, fontWeight: TYPOGRAPHY.weights.bold, marginBottom: SPACING.sm, cursor: 'pointer', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: SPACING.sm }}
      >
        {label}
        <span style={{ fontSize: '9px', transition: 'transform 0.15s', transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
      </div>
      {expanded && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm }}>
          {topics.map((t) => (
            <TopicCard key={t.id} topic={t} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function TopicCard({ topic, onSelect }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect(topic)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: `${SPACING.md} ${SPACING.sm}`,
        border: `1px solid ${hovered ? COLORS.border.accent : COLORS.border.light}`,
        borderRadius: RADIUS.md,
        background: hovered ? COLORS.bg.accentLight : COLORS.bg.card,
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.15s ease-out',
      }}
    >
      <div style={{ fontSize: '20px', marginBottom: SPACING.sm }}>📄</div>
      <div style={{ fontSize: TYPOGRAPHY.sizes.caption, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text.primary, lineHeight: 1.3 }}>
        {topic.name}
      </div>
      {topic.category && (
        <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, marginTop: '2px' }}>
          {topic.category}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// State: Mode Selector (for chosen topic)
// ─────────────────────────────────────────────────────────
const TOPIC_MODES = [
  { id: 'explain', icon: '🧠', title: 'Explain it',  subtitle: 'Coach walks you through' },
  { id: 'quiz',    icon: '⚡', title: 'Quiz me',      subtitle: 'Test your understanding' },
  { id: 'exam',    icon: '🎯', title: 'Exam prep',    subtitle: 'Practice exam questions' },
];

function ModeSelectorState({ selectedMode, onModeChange, onStart }) {
  return (
    <>
      <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.lg, fontWeight: TYPOGRAPHY.weights.medium }}>
        Pick a study style:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm, marginBottom: SPACING.xl }}>
        {TOPIC_MODES.map((m) => (
          <Card key={m.id} icon={m.icon} title={m.title} subtitle={m.subtitle} active={selectedMode === m.id} onClick={() => onModeChange(m.id)} />
        ))}
      </div>
      <Button label="Start Session →" variant="primary" fullWidth onClick={onStart} />
    </>
  );
}
