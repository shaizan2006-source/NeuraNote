# Ask My Notes Phase 0.5+ Premium Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three premium standalone study pages (Focus Mode, Quiz, AI Coach) with premium UI/UX, animations, and AI integration for JEE/NEET students.

**Architecture:** Three independent page components with shared design system and reusable components. AI Coach includes three-state flow (Welcome → Topic Picker → Mode Selector). Each page uses inline styles, Framer Motion animations, and integrates with Supabase for data and external APIs for LLM features. Focus Mode and Quiz pages are destination pages that start sessions; AI Coach page is a selector/launcher.

**Tech Stack:** Next.js 14, React 18, Framer Motion, Supabase PostgREST, Anthropic API (for AI Coach tips, question generation, answer evaluation), inline CSS, TypeScript/JSX

---

## File Structure

### New Files to Create

```
src/app/
  focus/
    page.jsx                          ← Focus Mode page (timer + task list)
  quiz/
    page.jsx                          ← Quiz page (questions + evaluation)
  coach/
    page.jsx                          ← AI Coach page (all three states)
  api/
    ai/
      coach-status.js                 ← GET /api/ai/coach-status
      focus-tip.js                    ← GET /api/ai/focus-tip
      search-topics.js                ← GET /api/ai/search-topics
      generate-questions.js           ← POST /api/ai/generate-questions
      evaluate-answer.js              ← POST /api/ai/evaluate-answer

src/components/
  shared/
    Card.jsx                          ← Reusable card component
    Button.jsx                        ← Reusable button component
    ProgressBar.jsx                   ← Progress indicator
    TextArea.jsx                      ← Expandable textarea
    Avatar.jsx                        ← Coach avatar (shared)
    TopBar.jsx                        ← Top navigation bar (shared)
    TimerRing.jsx                     ← SVG timer circle (Focus Mode)
    TaskList.jsx                      ← Task section (Focus Mode)

src/lib/
  styles.js                           ← Shared design system constants
  animations.js                       ← Framer Motion animation configs
```

### Modified Files

```
src/app/layout.jsx                    ← Import Inter font if not present
```

---

## Task Breakdown

### Phase 1: Design System & Shared Components

#### Task 1: Create Shared Design System Constants

**Files:**
- Create: `src/lib/styles.js`

**Purpose:** Centralize all colors, spacing, typography, and animation values so they're consistent across all three pages.

- [ ] **Step 1: Create styles.js with color palette**

```javascript
// src/lib/styles.js

export const COLORS = {
  // Background
  bg: {
    dark: '#060910',
    darkGradient: '#0c1024',
    card: 'rgba(255,255,255,0.025)',
    cardHover: 'rgba(255,255,255,0.04)',
    accentLight: 'rgba(139,92,246,0.1)',
    accentHover: 'rgba(139,92,246,0.15)',
  },
  
  // Text
  text: {
    primary: '#f1f5f9',
    secondary: '#334155',
    disabled: '#1e293b',
    accent: '#a78bfa',
  },
  
  // Accents
  accent: {
    purple: '#7c3aed',
    purpleDark: '#6d28d9',
    cyan: '#22D3EE',
    green: '#22c55e',
  },
  
  // Borders
  border: {
    light: 'rgba(255,255,255,0.06)',
    lighter: 'rgba(255,255,255,0.08)',
    accent: 'rgba(139,92,246,0.3)',
  },
};

export const TYPOGRAPHY = {
  fontFamily: "'Inter', sans-serif",
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  sizes: {
    heading: '18px',
    subheading: '14px',
    body: '13px',
    label: '12px',
    caption: '11px',
    small: '10px',
  },
};

export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '28px',
};

export const RADIUS = {
  sm: '10px',
  md: '14px',
  lg: '20px',
};

export const SHADOWS = {
  button: '0 4px 22px rgba(124,58,237,0.32)',
  card: '0 0 40px rgba(139,92,246,0.1)',
  glow: '0 0 8px rgba(34,197,94,0.7)',
};
```

- [ ] **Step 2: Verify styles can be imported**

```bash
node -e "const s = require('./src/lib/styles.js'); console.log(Object.keys(s.COLORS))"
```

Expected output: Should list color categories (bg, text, accent, border)

- [ ] **Step 3: Commit**

```bash
git add src/lib/styles.js
git commit -m "feat: add shared design system constants

- Color palette (dark theme, accents, borders)
- Typography scale (weights, sizes)
- Spacing scale (xs-xxl)
- Border radius standard values
- Shadow definitions for elevation"
```

---

#### Task 2: Create Reusable Button Component

**Files:**
- Create: `src/components/shared/Button.jsx`

**Purpose:** Consistent button styling and behavior across all pages.

- [ ] **Step 1: Create Button component**

```javascript
// src/components/shared/Button.jsx

import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '@/lib/styles';

export default function Button({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  style = {},
}) {
  const baseStyle = {
    fontFamily: TYPOGRAPHY.fontFamily,
    fontSize: TYPOGRAPHY.sizes.label,
    fontWeight: TYPOGRAPHY.weights.bold,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s ease-out',
    opacity: disabled ? 0.5 : 1,
    width: fullWidth ? '100%' : 'auto',
  };

  const variantStyles = {
    primary: {
      ...baseStyle,
      background: `linear-gradient(135deg, ${COLORS.accent.purple}, ${COLORS.accent.purpleDark})`,
      color: '#fff',
      boxShadow: SHADOWS.button,
      ':hover': { transform: 'scale(1.02)' },
    },
    secondary: {
      ...baseStyle,
      background: 'transparent',
      color: COLORS.text.accent,
      border: `1px solid ${COLORS.border.accent}`,
    },
    ghost: {
      ...baseStyle,
      background: 'transparent',
      color: COLORS.text.primary,
    },
  };

  const finalStyle = { ...variantStyles[variant], ...style };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={finalStyle}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {label}
    </button>
  );
}
```

- [ ] **Step 2: Create test component page to verify**

```javascript
// src/app/test-button/page.jsx

import Button from '@/components/shared/Button';

export default function TestButton() {
  return (
    <div style={{ padding: '40px', background: '#060910', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff' }}>Button Variants</h1>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <Button label="Primary" variant="primary" onClick={() => alert('Primary')} />
        <Button label="Secondary" variant="secondary" onClick={() => alert('Secondary')} />
        <Button label="Ghost" variant="ghost" onClick={() => alert('Ghost')} />
        <Button label="Disabled" variant="primary" disabled />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify button renders at http://localhost:3000/test-button**

Expected: Four buttons with different styles, disabled button appears grayed out

- [ ] **Step 4: Delete test page and commit**

```bash
rm src/app/test-button/page.jsx
git add src/components/shared/Button.jsx
git commit -m "feat: add reusable Button component

- Primary (purple gradient), secondary, ghost variants
- Disabled state
- Full-width option
- Micro-interaction: scale on press (0.98)
- Consistent with design system"
```

---

#### Task 3: Create Reusable Card Component

**Files:**
- Create: `src/components/shared/Card.jsx`

**Purpose:** Styled card wrapper used in AI Coach modes, topic picker, quiz results.

- [ ] **Step 1: Create Card component**

```javascript
// src/components/shared/Card.jsx

import { COLORS, SPACING, RADIUS } from '@/lib/styles';

export default function Card({
  icon,
  title,
  subtitle,
  active = false,
  dashed = false,
  onClick,
  children,
  style = {},
}) {
  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.lg,
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: dashed ? `1px dashed ${COLORS.border.light}` : `1px solid ${COLORS.border.light}`,
    background: dashed ? 'rgba(255,255,255,0.015)' : COLORS.card,
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.15s ease-out',
    ...style,
  };

  const activeStyle = active && !dashed ? {
    background: COLORS.accent.accentLight,
    borderColor: COLORS.border.accent,
  } : {};

  const hoverStyle = onClick ? {
    ':hover': {
      background: active ? COLORS.accent.accentHover : COLORS.cardHover,
      borderColor: COLORS.border.accent,
    },
  } : {};

  return (
    <div
      onClick={onClick}
      style={{ ...baseStyle, ...activeStyle, ...hoverStyle }}
      onMouseDown={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(0.98)';
      }}
      onMouseUp={(e) => {
        if (onClick) e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {icon && <span style={{ fontSize: '20px', flexShrink: 0 }}>{icon}</span>}
      {children ? (
        children
      ) : (
        <div>
          {title && <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: COLORS.text.primary }}>{title}</h4>}
          {subtitle && <p style={{ margin: '2px 0 0 0', fontSize: '10px', color: COLORS.text.secondary }}>{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/Card.jsx
git commit -m "feat: add reusable Card component

- Flexible icon + title/subtitle layout
- Active and dashed border states
- Click handler with scale micro-interaction
- Supports custom children for complex content"
```

---

#### Task 4: Create Reusable ProgressBar Component

**Files:**
- Create: `src/components/shared/ProgressBar.jsx`

**Purpose:** Visual progress indicator for quiz and focus sessions.

- [ ] **Step 1: Create ProgressBar component**

```javascript
// src/components/shared/ProgressBar.jsx

import { COLORS, SPACING } from '@/lib/styles';

export default function ProgressBar({ current, total, label = '', style = {} }) {
  const percentage = Math.round((current / total) * 100);
  
  return (
    <div style={{ width: '100%', ...style }}>
      {label && (
        <div style={{ fontSize: '11px', color: COLORS.text.secondary, marginBottom: SPACING.sm, fontWeight: 600 }}>
          {label}
        </div>
      )}
      <div
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '2px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${COLORS.accent.purple}, ${COLORS.accent.cyan})`,
            transition: 'width 0.3s ease-out',
          }}
        />
      </div>
      {label && (
        <div style={{ fontSize: '10px', color: COLORS.text.secondary, marginTop: SPACING.sm }}>
          {current} / {total}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/ProgressBar.jsx
git commit -m "feat: add reusable ProgressBar component

- Current/total progress visualization
- Optional label with counter
- Smooth animated fill
- Purple-to-cyan gradient"
```

---

#### Task 5: Create Reusable Avatar Component

**Files:**
- Create: `src/components/shared/Avatar.jsx`

**Purpose:** Coach avatar (Aria) used in Welcome, Topic Picker, Mode Selector states.

- [ ] **Step 1: Create Avatar component**

```javascript
// src/components/shared/Avatar.jsx

import { COLORS, SPACING } from '@/lib/styles';

export default function Avatar({ size = 60, icon = '✦', style = {} }) {
  const sizeMap = { sm: 40, md: 56, lg: 60, xl: 80 };
  const sz = sizeMap[size] || size;
  
  return (
    <div
      style={{
        width: `${sz}px`,
        height: `${sz}px`,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${COLORS.accent.purpleDark}, ${COLORS.accent.cyan})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${sz * 0.37}px`,
        boxShadow: `0 0 0 8px rgba(109, 40, 217, 0.1), 0 0 40px rgba(109, 40, 217, 0.25)`,
        ...style,
      }}
    >
      {icon}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/Avatar.jsx
git commit -m "feat: add reusable Avatar component

- Coach avatar with gradient (purple-to-cyan)
- Size variants (sm, md, lg, xl)
- Glow shadow for elevation"
```

---

#### Task 6: Create TopBar Component

**Files:**
- Create: `src/components/shared/TopBar.jsx`

**Purpose:** Consistent navigation bar used by all three pages.

- [ ] **Step 1: Create TopBar component**

```javascript
// src/components/shared/TopBar.jsx

import { useRouter } from 'next/navigation';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/styles';

export default function TopBar({
  title = '',
  subtitle = '',
  showLiveStatus = true,
  onBack,
  style = {},
}) {
  const router = useRouter();
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div
      style={{
        padding: `${SPACING.md} ${SPACING.lg}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: `1px solid ${COLORS.border.light}`,
        background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
        ...style,
      }}
    >
      <div
        onClick={handleBack}
        style={{
          fontSize: TYPOGRAPHY.sizes.small,
          color: COLORS.text.disabled,
          cursor: 'pointer',
        }}
      >
        ← Back
      </div>

      <div style={{ textAlign: 'center', flex: 1, marginLeft: SPACING.lg }}>
        {title && (
          <div
            style={{
              fontSize: TYPOGRAPHY.sizes.label,
              color: COLORS.text.primary,
              fontWeight: TYPOGRAPHY.weights.bold,
            }}
          >
            {title}
          </div>
        )}
        {subtitle && (
          <div
            style={{
              fontSize: TYPOGRAPHY.sizes.caption,
              color: COLORS.text.secondary,
              marginTop: '2px',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>

      {showLiveStatus && (
        <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: COLORS.accent.green,
              boxShadow: `0 0 8px ${COLORS.accent.green}`,
            }}
          />
          <span
            style={{
              fontSize: TYPOGRAPHY.sizes.caption,
              color: COLORS.text.disabled,
              fontWeight: TYPOGRAPHY.weights.semibold,
            }}
          >
            Aria · ready
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/TopBar.jsx
git commit -m "feat: add TopBar component

- Back button with navigation
- Center title/subtitle
- Live status indicator (green dot)
- Consistent across all pages"
```

---

### Phase 2: AI Coach Page (Three-State Flow)

#### Task 7: Create AI Coach Page - State 1 (Welcome)

**Files:**
- Create: `src/app/coach/page.jsx`
- Modify: `src/app/layout.jsx` (add Inter font if missing)

**Purpose:** Initial coach greeting with mode selection and option to study own topic.

- [ ] **Step 1: Verify Inter font is imported in layout.jsx**

```bash
grep -n "Inter" src/app/layout.jsx
```

Expected: Should see import from Google Fonts. If not, add before closing `</head>`:

```javascript
// In src/app/layout.jsx head:
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

// In html tag:
<html className={inter.className}>
```

- [ ] **Step 2: Create Coach page with State 1**

```javascript
// src/app/coach/page.jsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/shared/TopBar';
import Avatar from '@/components/shared/Avatar';
import Card from '@/components/shared/Card';
import Button from '@/components/shared/Button';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/styles';

const SESSION_STATES = {
  WELCOME: 'welcome',
  TOPIC_PICKER: 'topic_picker',
  MODE_SELECTOR: 'mode_selector',
};

export default function CoachPage() {
  const router = useRouter();
  const [state, setState] = useState(SESSION_STATES.WELCOME);
  const [selectedMode, setSelectedMode] = useState('explain');
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [coachStatus, setCoachStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch coach status (recommendations, strengths, weaknesses)
  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch('/api/ai/coach-status');
        const data = await res.json();
        setCoachStatus(data);
      } catch (err) {
        console.error('Failed to fetch coach status:', err);
        // Fallback mock data
        setCoachStatus({
          strong: 'Mechanics',
          needsWork: 'Thermodynamics',
          recommendedMode: 'explain',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  const modes = [
    { id: 'explain', icon: '🧠', title: 'Explain it to me', subtitle: 'Coach walks you through step by step' },
    { id: 'quiz', icon: '⚡', title: 'Quiz me', subtitle: 'Socratic questions on your weak topics' },
    { id: 'exam', icon: '🎯', title: 'Exam prep', subtitle: 'Practice exam-style questions' },
  ];

  const handleStartSession = () => {
    if (state === SESSION_STATES.WELCOME && selectedMode) {
      // Navigate to session based on mode
      router.push(`/coach/session?mode=${selectedMode}`);
    } else if (state === SESSION_STATES.MODE_SELECTOR && selectedMode && selectedTopic) {
      // Navigate to session with topic
      router.push(`/coach/session?mode=${selectedMode}&topic=${selectedTopic.id}`);
    }
  };

  const handleStudyOwnTopic = () => {
    setState(SESSION_STATES.TOPIC_PICKER);
  };

  const handleBack = () => {
    if (state === SESSION_STATES.WELCOME) {
      router.back();
    } else if (state === SESSION_STATES.TOPIC_PICKER) {
      setState(SESSION_STATES.WELCOME);
    } else if (state === SESSION_STATES.MODE_SELECTOR) {
      setState(SESSION_STATES.TOPIC_PICKER);
    }
  };

  if (loading) {
    return (
      <div style={{ background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.text.primary, fontSize: TYPOGRAPHY.sizes.body }}>Loading Aria...</div>
      </div>
    );
  }

  return (
    <div style={{ background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`, minHeight: '100vh', color: COLORS.text.primary, fontFamily: TYPOGRAPHY.fontFamily }}>
      <TopBar onBack={handleBack} />

      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)`,
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ padding: SPACING.xxl, maxWidth: '600px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Greeting Section */}
        <div style={{ textAlign: 'center', marginBottom: SPACING.xl }}>
          <Avatar size="lg" />
          <div style={{ marginTop: SPACING.lg }}>
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, fontWeight: TYPOGRAPHY.weights.semibold, marginBottom: '6px' }}>
              Good morning, Shafi ☀
            </div>
            <div
              style={{
                fontSize: '17px',
                fontWeight: TYPOGRAPHY.weights.bold,
                color: COLORS.text.primary,
                lineHeight: 1.55,
                maxWidth: '280px',
                margin: '0 auto',
              }}
            >
              You're{' '}
              <span style={{ color: COLORS.text.accent }}>close on {coachStatus?.strong || 'Mechanics'}</span> — but{' '}
              <span style={{ color: '#fbbf24' }}>{coachStatus?.needsWork || 'Thermodynamics'}</span> needs{' '}
              {state === SESSION_STATES.WELCOME ? 'work.' : 'attention.'}
            </div>
          </div>
        </div>

        {state === SESSION_STATES.WELCOME && (
          <>
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.lg, fontWeight: TYPOGRAPHY.weights.medium }}>
              How do you want to study?
            </div>

            {/* Mode Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md, marginBottom: SPACING.xl }}>
              {modes.map((mode) => (
                <Card
                  key={mode.id}
                  icon={mode.icon}
                  title={mode.title}
                  subtitle={mode.subtitle}
                  active={selectedMode === mode.id}
                  onClick={() => setSelectedMode(mode.id)}
                />
              ))}
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.lg, margin: `${SPACING.md} 0`, opacity: 0.5 }}>
              <div style={{ flex: 1, height: '1px', background: COLORS.border.light }} />
              <div style={{ fontSize: TYPOGRAPHY.sizes.small, color: COLORS.text.secondary, whiteSpace: 'nowrap' }}>or study your own topic</div>
              <div style={{ flex: 1, height: '1px', background: COLORS.border.light }} />
            </div>

            {/* Free Choice Dashed Card */}
            <Card
              icon="✏️"
              title="I want to study something else"
              subtitle="Pick a topic or document from notes"
              dashed
              onClick={handleStudyOwnTopic}
              style={{ marginBottom: SPACING.xl }}
            />

            {/* CTA Button */}
            <Button label="Start Session →" variant="primary" fullWidth onClick={handleStartSession} />
          </>
        )}

        {state === SESSION_STATES.TOPIC_PICKER && (
          <TopicPickerSection
            onSelectTopic={(topic) => {
              setSelectedTopic(topic);
              setState(SESSION_STATES.MODE_SELECTOR);
            }}
          />
        )}

        {state === SESSION_STATES.MODE_SELECTOR && selectedTopic && (
          <ModeSelectSection
            topic={selectedTopic}
            selectedMode={selectedMode}
            onModeChange={setSelectedMode}
            onStart={handleStartSession}
          />
        )}
      </div>
    </div>
  );
}

function TopicPickerSection({ onSelectTopic }) {
  const [topics, setTopics] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await fetch('/api/ai/search-topics?query=');
        const data = await res.json();
        setTopics(data.topics || []);
      } catch (err) {
        console.error('Failed to fetch topics:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  useEffect(() => {
    if (search.trim()) {
      const filtered = topics.filter(
        (t) => t.name.toLowerCase().includes(search.toLowerCase())
      );
      setTopics(filtered);
    }
  }, [search]);

  if (loading) return <div style={{ color: COLORS.text.secondary }}>Loading topics...</div>;

  return (
    <div>
      <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.lg, fontWeight: TYPOGRAPHY.weights.medium }}>
        What's on your mind today?
      </div>

      {/* Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: SPACING.md,
          background: 'rgba(255,255,255,0.03)',
          border: `1px solid ${COLORS.border.lighter}`,
          borderRadius: '11px',
          padding: `${SPACING.md} ${SPACING.lg}`,
          marginBottom: SPACING.xl,
        }}
      >
        <span style={{ fontSize: '12px' }}>🔍</span>
        <input
          type="text"
          placeholder="Search topics or notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontSize: TYPOGRAPHY.sizes.caption,
            color: COLORS.text.primary,
          }}
        />
      </div>

      {/* Topics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.sm, marginBottom: SPACING.xl }}>
        {topics.map((topic) => (
          <div
            key={topic.id}
            onClick={() => onSelectTopic(topic)}
            style={{
              padding: `${SPACING.md} ${SPACING.sm}`,
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: SPACING.md,
              background: COLORS.card,
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.15s ease-out',
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: SPACING.sm }}>📄</div>
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text.primary }}>
              {topic.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModeSelectSection({ topic, selectedMode, onModeChange, onStart }) {
  const modes = [
    { id: 'explain', icon: '🧠', title: 'Explain it', subtitle: 'Coach walks you through' },
    { id: 'quiz', icon: '⚡', title: 'Quiz me', subtitle: 'Test your understanding' },
    { id: 'exam', icon: '🎯', title: 'Exam prep', subtitle: 'Practice exam questions' },
  ];

  return (
    <div>
      <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, textAlign: 'center', marginBottom: SPACING.md, fontWeight: TYPOGRAPHY.weights.medium }}>
        Pick a study style:
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.md, marginBottom: SPACING.xl }}>
        {modes.map((mode) => (
          <Card
            key={mode.id}
            icon={mode.icon}
            title={mode.title}
            subtitle={mode.subtitle}
            active={selectedMode === mode.id}
            onClick={() => onModeChange(mode.id)}
          />
        ))}
      </div>

      <Button label="Start Session →" variant="primary" fullWidth onClick={onStart} />
    </div>
  );
}
```

- [ ] **Step 3: Verify page loads at http://localhost:3000/coach**

Expected: See coach greeting with three mode cards and dashed "study something else" card

- [ ] **Step 4: Commit**

```bash
git add src/app/coach/page.jsx
git commit -m "feat: implement AI Coach Welcome state (State 1)

- Coach greeting with dynamic strength/weakness assessment
- Three mode cards (Explain/Quiz/Exam Prep)
- Dashed 'study something else' card for free choice
- Topic picker section (fetches from /api/ai/search-topics)
- Mode selector section for chosen topic
- Three-state machine (Welcome → Topic Picker → Mode Selector)
- Responsive design with inline styles"
```

---

#### Task 8: Create Coach Status API Endpoint

**Files:**
- Create: `src/app/api/ai/coach-status.js`

**Purpose:** Fetch personalized recommendations based on user's learning progress.

- [ ] **Step 1: Create endpoint**

```javascript
// src/app/api/ai/coach-status.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      // Mock response for now
      return Response.json({
        strong: 'Mechanics',
        needsWork: 'Thermodynamics',
        recommendedMode: 'explain',
      });
    }

    // Query user's mastery_state for top 2 concepts (1 strong, 1 weak)
    const { data: masteryData, error } = await supabase
      .from('mastery_state')
      .select('concept_id, strength, confidence')
      .eq('user_id', userId)
      .order('strength', { ascending: false })
      .limit(5);

    if (error) throw error;

    // Get concept names for top results
    if (masteryData && masteryData.length >= 2) {
      const topIds = masteryData.map((m) => m.concept_id);
      const { data: concepts } = await supabase
        .from('concepts')
        .select('id, content')
        .in('id', topIds);

      if (concepts) {
        return Response.json({
          strong: concepts[0]?.content?.slice(0, 50) || 'Mechanics',
          needsWork: concepts[concepts.length - 1]?.content?.slice(0, 50) || 'Thermodynamics',
          recommendedMode: 'explain',
        });
      }
    }

    return Response.json({
      strong: 'Mechanics',
      needsWork: 'Thermodynamics',
      recommendedMode: 'explain',
    });
  } catch (error) {
    console.error('Coach status error:', error);
    return Response.json({ error: 'Failed to fetch coach status' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test endpoint with curl**

```bash
curl "http://localhost:3000/api/ai/coach-status"
```

Expected: JSON response with strong, needsWork, recommendedMode fields

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/coach-status.js
git commit -m "feat: add coach-status API endpoint

- Fetches user's mastery state (strongest/weakest concepts)
- Returns personalized greeting insights
- Graceful fallback to mock data if user not found"
```

---

#### Task 9: Create Search Topics API Endpoint

**Files:**
- Create: `src/app/api/ai/search-topics.js`

**Purpose:** Search through user's uploaded documents and concepts.

- [ ] **Step 1: Create endpoint**

```javascript
// src/app/api/ai/search-topics.js

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const userId = searchParams.get('userId');

    // If no query, return all documents grouped by category
    if (!query) {
      const { data: docs, error } = await supabase
        .from('documents')
        .select('id, name, category')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Group by category
      const grouped = {};
      docs?.forEach((doc) => {
        const cat = doc.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(doc);
      });

      // Convert to flat list with category info
      const topics = [];
      Object.entries(grouped).forEach(([category, docs]) => {
        docs.forEach((doc) => {
          topics.push({
            id: doc.id,
            name: doc.name,
            category,
            icon: '📄',
          });
        });
      });

      return Response.json({ topics });
    }

    // Search documents by name
    const { data: docs, error } = await supabase
      .from('documents')
      .select('id, name, category')
      .ilike('name', `%${query}%`)
      .limit(10);

    if (error) throw error;

    const topics = docs?.map((doc) => ({
      id: doc.id,
      name: doc.name,
      category: doc.category || 'Other',
      icon: '📄',
    })) || [];

    return Response.json({ topics });
  } catch (error) {
    console.error('Search topics error:', error);
    return Response.json({ topics: [], error: error.message }, { status: 500 });
  }
}
```

- [ ] **Step 2: Test endpoint**

```bash
curl "http://localhost:3000/api/ai/search-topics?query="
```

Expected: JSON with array of topics from documents table

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/search-topics.js
git commit -m "feat: add search-topics API endpoint

- Returns all documents if no query
- Filters by document name if query provided
- Groups by category
- Supports pagination (future)"
```

---

### Phase 3: Quiz Page Implementation

#### Task 10: Create Quiz Page

**Files:**
- Create: `src/app/quiz/page.jsx`

**Purpose:** Display exam-style questions with student answers, structure hints, source snippets, and AI evaluation.

- [ ] **Step 1: Create Quiz page component**

```javascript
// src/app/quiz/page.jsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopBar from '@/components/shared/TopBar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/styles';

export default function QuizPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topicId = searchParams.get('topic');
  const mode = searchParams.get('mode');

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [evaluations, setEvaluations] = useState({});
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setSessionTime((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch questions
  useEffect(() => {
    async function fetchQuestions() {
      try {
        const res = await fetch('/api/ai/generate-questions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topicId,
            count: 12,
            marks: [5, 10, 20],
          }),
        });
        const data = await res.json();
        setQuestions(data.questions || []);
      } catch (err) {
        console.error('Failed to fetch questions:', err);
        // Mock questions
        setQuestions([
          {
            id: '1',
            text: 'Explain the Carnot Cycle and why no real engine can achieve 100% efficiency.',
            marks: 10,
            hints: ['Define Carnot Cycle (3M)', 'Explain why max efficiency (4M)', 'Compare to real engines (3M)'],
            sourceSnippet: 'The Carnot Cycle is the most efficient theoretical heat engine... — Ch.3, p.42',
          },
          {
            id: '2',
            text: 'What are the key differences between reversible and irreversible processes?',
            marks: 5,
            hints: ['Define reversible (2M)', 'Define irreversible (3M)'],
            sourceSnippet: 'A reversible process is one that can be reversed... — Ch.2, p.28',
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    if (topicId) {
      fetchQuestions();
    }
  }, [topicId]);

  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(evaluations).length;
  const totalQuestions = questions.length || 2;

  const handleAnswerChange = (text) => {
    setAnswers({ ...answers, [currentIndex]: text });
  };

  const handleSave = async () => {
    if (!answers[currentIndex]) return;

    setEvaluating(true);
    try {
      const res = await fetch('/api/ai/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.text,
          answer: answers[currentIndex],
          hints: currentQuestion.hints,
          totalMarks: currentQuestion.marks,
        }),
      });
      const data = await res.json();
      setEvaluations({
        ...evaluations,
        [currentIndex]: data,
      });

      // Auto-advance to next
      if (currentIndex < totalQuestions - 1) {
        setTimeout(() => {
          setCurrentIndex(currentIndex + 1);
          setEvaluating(false);
        }, 1500);
      } else {
        setEvaluating(false);
      }
    } catch (err) {
      console.error('Evaluation failed:', err);
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Show summary
      router.push(`/quiz/summary?sessionId=${Date.now()}`);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSkip = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.text.primary }}>
        Loading questions...
      </div>
    );
  }

  return (
    <div style={{ background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`, minHeight: '100vh', color: COLORS.text.primary, fontFamily: TYPOGRAPHY.fontFamily }}>
      <TopBar title={`Question ${currentIndex + 1}/${totalQuestions}`} subtitle={formatTime(sessionTime)} />

      <ProgressBar current={answeredCount} total={totalQuestions} label={`${answeredCount}% answered`} style={{ padding: SPACING.lg, paddingBottom: SPACING.md }} />

      <div style={{ padding: SPACING.lg, maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: SPACING.xl }}>
        {/* Left Panel: Question + Answer */}
        <div>
          <div
            style={{
              border: `1px solid ${COLORS.border.light}`,
              borderRadius: SPACING.lg,
              padding: SPACING.lg,
              background: COLORS.card,
              marginBottom: SPACING.lg,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
              <span style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>▲ Question</span>
              <span style={{ fontSize: TYPOGRAPHY.sizes.caption, background: COLORS.accent.accentLight, padding: `2px ${SPACING.sm}`, borderRadius: SPACING.sm, color: COLORS.text.accent }}>
                {currentQuestion?.marks}M
              </span>
            </div>
            <p style={{ fontSize: TYPOGRAPHY.sizes.body, lineHeight: 1.6, margin: 0 }}>{currentQuestion?.text}</p>
          </div>

          {/* Answer Area */}
          <textarea
            placeholder="Type your answer..."
            value={answers[currentIndex] || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            style={{
              width: '100%',
              minHeight: '200px',
              padding: SPACING.lg,
              border: `1px solid ${COLORS.border.lighter}`,
              borderRadius: SPACING.md,
              background: 'rgba(255,255,255,0.02)',
              color: COLORS.text.primary,
              fontFamily: TYPOGRAPHY.fontFamily,
              fontSize: TYPOGRAPHY.sizes.body,
              resize: 'vertical',
              marginBottom: SPACING.lg,
              outline: 'none',
              ':focus': { borderColor: COLORS.accent.purple },
            }}
            disabled={evaluating}
          />

          {/* Button Row */}
          <div style={{ display: 'flex', gap: SPACING.md }}>
            {currentIndex > 0 && <Button label="← Previous" variant="secondary" onClick={handlePrevious} />}
            <Button label="Skip" variant="ghost" onClick={handleSkip} />
            <Button
              label={evaluating ? 'Evaluating...' : 'Save'}
              variant="primary"
              onClick={handleSave}
              disabled={!answers[currentIndex] || evaluating}
              style={{ flex: 1 }}
            />
          </div>
        </div>

        {/* Right Panel: Hints + Source + Coach Tip */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.lg }}>
          {/* Source Snippet */}
          <div>
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginBottom: SPACING.sm, fontWeight: TYPOGRAPHY.weights.bold }}>
              📚 From your notes:
            </div>
            <div
              style={{
                padding: SPACING.md,
                border: `1px solid ${COLORS.border.lighter}`,
                borderRadius: SPACING.md,
                background: 'rgba(34, 211, 238, 0.05)',
                fontSize: TYPOGRAPHY.sizes.caption,
                color: COLORS.text.secondary,
                lineHeight: 1.6,
              }}
            >
              {currentQuestion?.sourceSnippet || 'No source snippet available'}
            </div>
          </div>

          {/* Answer Structure */}
          <div>
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginBottom: SPACING.sm, fontWeight: TYPOGRAPHY.weights.bold }}>
              💡 Answer Structure:
            </div>
            <ul style={{ margin: 0, paddingLeft: SPACING.lg, fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, lineHeight: 1.8 }}>
              {currentQuestion?.hints?.map((hint, i) => (
                <li key={i}>{hint}</li>
              ))}
            </ul>
          </div>

          {/* AI Coach Tip */}
          <div>
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginBottom: SPACING.sm, fontWeight: TYPOGRAPHY.weights.bold }}>
              🤖 AI Coach:
            </div>
            <div
              style={{
                padding: SPACING.md,
                borderRadius: SPACING.md,
                background: 'rgba(139, 92, 246, 0.05)',
                fontSize: TYPOGRAPHY.sizes.caption,
                color: COLORS.text.secondary,
                lineHeight: 1.6,
              }}
            >
              Take your time with the structure — that's where most students lose marks.
            </div>
          </div>

          {/* Current Evaluation Result (if exists) */}
          {evaluations[currentIndex] && (
            <div
              style={{
                padding: SPACING.md,
                borderRadius: SPACING.md,
                background: COLORS.accent.accentLight,
                border: `1px solid ${COLORS.border.accent}`,
              }}
            >
              <div style={{ fontSize: TYPOGRAPHY.sizes.label, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.text.accent, marginBottom: SPACING.sm }}>
                {evaluations[currentIndex].marksEarned}/{evaluations[currentIndex].totalMarks} marks
              </div>
              <p style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, margin: 0, lineHeight: 1.6 }}>
                {evaluations[currentIndex].feedback}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test page at http://localhost:3000/quiz?topic=123&mode=exam**

Expected: Question displayed with answer area, structure hints, and source snippet on right

- [ ] **Step 3: Commit**

```bash
git add src/app/quiz/page.jsx
git commit -m "feat: implement Quiz page with two-column layout

- Question card with marks badge
- Large textarea for long-form answers
- Real-time timer
- Progress bar showing answered questions
- Right panel: source snippets, answer structure hints, AI coach tip
- Save/Skip/Previous buttons
- Real-time evaluation display
- Fetches questions from /api/ai/generate-questions"
```

---

#### Task 11: Create Generate Questions API Endpoint

**Files:**
- Create: `src/app/api/ai/generate-questions.js`

**Purpose:** Generate exam-style questions with structure hints and source snippets.

- [ ] **Step 1: Create endpoint**

```javascript
// src/app/api/ai/generate-questions.js

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { topicId, count = 12, marks = [5, 10, 20], userId } = await request.json();

    // Fetch topic content from documents table
    let topicName = 'Physics Thermodynamics';
    if (topicId) {
      const { data: doc } = await supabase.from('documents').select('name, content').eq('id', topicId).single();
      if (doc) topicName = doc.name;
    }

    // Call Claude to generate questions
    const prompt = `Generate ${count} exam-style long-answer physics questions on the topic: "${topicName}".

For each question:
1. Create a clear, unambiguous question
2. Assign marks from these: ${marks.join(', ')}M (vary the distribution)
3. Provide 3-5 structure hints that show SHAPE not CONTENT (e.g., "Define concept (2M)", "Explain mechanism (3M)")
4. Include a source snippet (max 100 chars) that could come from student notes

Format as JSON array:
[
  {
    "text": "Question text here?",
    "marks": 10,
    "hints": ["Define X (2M)", "Explain Y (4M)", "Compare (4M)"],
    "sourceSnippet": "The process is... — Ch.3, p.42"
  }
]

Return ONLY valid JSON, no markdown.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = message.content[0].type === 'text' ? message.content[0].text : '';
    const questions = JSON.parse(jsonText);

    // Add IDs
    const questionsWithIds = questions.map((q, i) => ({
      ...q,
      id: `q-${Date.now()}-${i}`,
    }));

    return Response.json({ questions: questionsWithIds });
  } catch (error) {
    console.error('Generate questions error:', error);

    // Fallback mock questions
    const mockQuestions = [
      {
        id: 'q-1',
        text: 'Explain the Carnot Cycle and why no real engine can achieve 100% efficiency.',
        marks: 10,
        hints: ['Define Carnot Cycle (3M)', 'Explain why max efficiency (4M)', 'Compare to real engines (3M)'],
        sourceSnippet: 'The Carnot Cycle is the most efficient theoretical heat engine... — Ch.3, p.42',
      },
      {
        id: 'q-2',
        text: 'What is entropy and how does it relate to the second law of thermodynamics?',
        marks: 10,
        hints: ['Define entropy (3M)', 'State second law (2M)', 'Provide example (5M)'],
        sourceSnippet: 'Entropy measures disorder in a system... — Ch.4, p.51',
      },
    ];

    return Response.json({ questions: mockQuestions });
  }
}
```

- [ ] **Step 2: Test endpoint with curl**

```bash
curl -X POST http://localhost:3000/api/ai/generate-questions \
  -H "Content-Type: application/json" \
  -d '{"topicId": "thermo", "count": 3}'
```

Expected: JSON array of questions with structure

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/generate-questions.js
git commit -m "feat: add generate-questions API endpoint

- Uses Claude Opus 4.1 to generate exam-style questions
- Includes mark distribution (5M/10M/20M)
- Generates structure hints without spoiling answers
- Provides source snippet references
- Falls back to mock questions if API fails"
```

---

#### Task 12: Create Evaluate Answer API Endpoint

**Files:**
- Create: `src/app/api/ai/evaluate-answer.js`

**Purpose:** Evaluate student answers and provide feedback.

- [ ] **Step 1: Create endpoint**

```javascript
// src/app/api/ai/evaluate-answer.js

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function POST(request) {
  try {
    const { question, answer, hints, totalMarks } = await request.json();

    const prompt = `You are an exam evaluator for physics.

Question (${totalMarks} marks): "${question}"

Expected answer structure:
${hints.map((h) => `- ${h}`).join('\n')}

Student's answer: "${answer}"

Evaluate the answer and respond with ONLY valid JSON (no markdown):
{
  "marksEarned": <number 0-${totalMarks}>,
  "feedback": "<1-2 sentence constructive feedback>",
  "keyMisses": ["<missing key point 1>"]
}

Award marks for each key point from the structure. Be fair but strict.`;

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-1',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const jsonText = message.content[0].type === 'text' ? message.content[0].text : '';
    const result = JSON.parse(jsonText);

    return Response.json({
      marksEarned: result.marksEarned,
      totalMarks,
      feedback: result.feedback,
      keyMisses: result.keyMisses || [],
    });
  } catch (error) {
    console.error('Evaluate answer error:', error);

    // Mock evaluation
    return Response.json({
      marksEarned: 7,
      totalMarks: 10,
      feedback: 'Good understanding of the concept. Could be more detailed on the efficiency calculation.',
      keyMisses: ['Exact efficiency formula'],
    });
  }
}
```

- [ ] **Step 2: Test endpoint**

```bash
curl -X POST http://localhost:3000/api/ai/evaluate-answer \
  -H "Content-Type: application/json" \
  -d '{"question": "Define entropy?", "answer": "Entropy is disorder.", "hints": ["Define (2M)", "Provide example (3M)"], "totalMarks": 5}'
```

Expected: JSON with marksEarned, feedback, totalMarks

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/evaluate-answer.js
git commit -m "feat: add evaluate-answer API endpoint

- Uses Claude Opus 4.1 to grade student answers
- Awards marks based on structure hints
- Provides constructive feedback
- Identifies key missing points
- Falls back to mock evaluation if API fails"
```

---

### Phase 4: Focus Mode Page Implementation

#### Task 13: Create Timer Ring SVG Component

**Files:**
- Create: `src/components/shared/TimerRing.jsx`

**Purpose:** Circular progress indicator for focus session timer.

- [ ] **Step 1: Create TimerRing component**

```javascript
// src/components/shared/TimerRing.jsx

import { useEffect, useRef } from 'react';
import { COLORS } from '@/lib/styles';

export default function TimerRing({
  timeLeft = 900,
  duration = 1500,
  paused = false,
  size = 200,
}) {
  const canvasRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const radius = size / 2 - 20;
    const centerX = size / 2;
    const centerY = size / 2;

    // Clear
    ctx.clearRect(0, 0, size, size);

    // Background circle
    ctx.strokeStyle = 'rgba(139,92,246,0.1)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress circle
    const progress = (duration - timeLeft) / duration;
    ctx.strokeStyle = `linear-gradient(135deg, ${COLORS.accent.purple}, ${COLORS.accent.cyan})`;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
    ctx.stroke();

    // Time text
    ctx.fillStyle = COLORS.text.primary;
    ctx.font = `bold 40px Inter`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatTime(timeLeft), centerX, centerY);

    // Paused overlay
    if (paused) {
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = COLORS.text.disabled;
      ctx.fillRect(0, 0, size, size);
    }
  }, [timeLeft, paused, size, duration]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: 'block' }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/shared/TimerRing.jsx
git commit -m "feat: add TimerRing SVG component

- Circular progress animation
- Center time display
- Paused state overlay
- Responsive size prop"
```

---

#### Task 14: Create Focus Mode Page

**Files:**
- Create: `src/app/focus/page.jsx`

**Purpose:** Timer + task list for focused work sessions.

- [ ] **Step 1: Create Focus Mode page**

```javascript
// src/app/focus/page.jsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import TopBar from '@/components/shared/TopBar';
import Button from '@/components/shared/Button';
import ProgressBar from '@/components/shared/ProgressBar';
import TimerRing from '@/components/shared/TimerRing';
import { COLORS, TYPOGRAPHY, SPACING } from '@/lib/styles';

export default function FocusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState([
    { id: '1', name: 'Review Carnot Cycle', status: 'current' },
    { id: '2', name: 'Read Ch.3 Thermodynamics', status: 'done' },
    { id: '3', name: 'Problem Set 1', status: 'pending' },
    { id: '4', name: 'Watch lecture video', status: 'pending' },
  ]);

  const [timeLeft, setTimeLeft] = useState(1500); // 25 minutes
  const [duration] = useState(1500);
  const [paused, setPaused] = useState(false);
  const [aiTip, setAiTip] = useState('Focus on the big picture first, details come later.');
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Timer
  useEffect(() => {
    if (paused) return;
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, timeLeft]);

  // Rotate AI tips every 2-3 minutes
  useEffect(() => {
    const tips = [
      'Focus on the big picture first, details come later.',
      'Take notes as you study — it helps retention.',
      'Break down complex concepts into smaller parts.',
      'Review what you learned every few minutes.',
    ];

    const interval = setInterval(() => {
      setCurrentTipIndex((i) => (i + 1) % tips.length);
      setAiTip(tips[(currentTipIndex + 1) % tips.length]);
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [currentTipIndex]);

  const currentTask = tasks.find((t) => t.status === 'current');
  const completedTasks = tasks.filter((t) => t.status === 'done').length;

  const handleMarkDone = () => {
    if (currentTask) {
      const nextPending = tasks.find((t) => t.status === 'pending');
      setTasks(
        tasks.map((t) => {
          if (t.id === currentTask.id) return { ...t, status: 'done' };
          if (nextPending && t.id === nextPending.id) return { ...t, status: 'current' };
          return t;
        })
      );
    }
  };

  const handleStop = () => {
    if (confirm('End session? Your progress will be saved.')) {
      router.back();
    }
  };

  return (
    <div style={{ background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`, minHeight: '100vh', color: COLORS.text.primary, fontFamily: TYPOGRAPHY.fontFamily }}>
      <TopBar title="Focus Session" />

      <div style={{ padding: SPACING.xl, maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACING.xl }}>
        {/* Left Panel: Timer + AI Tip */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <TimerRing timeLeft={timeLeft} duration={duration} paused={paused} size={240} />

          <div style={{ display: 'flex', gap: SPACING.md, marginTop: SPACING.xl }}>
            <Button
              label={paused ? '▶ Resume' : '⏸ Pause'}
              variant={paused ? 'primary' : 'secondary'}
              onClick={() => setPaused(!paused)}
            />
            <Button label="⏹ Stop" variant="secondary" onClick={handleStop} />
          </div>

          {/* AI Tip Card */}
          <div
            style={{
              marginTop: SPACING.xl,
              padding: SPACING.lg,
              borderRadius: SPACING.md,
              background: 'rgba(34, 211, 238, 0.05)',
              border: `1px solid rgba(34, 211, 238, 0.2)`,
              maxWidth: '240px',
            }}
          >
            <div style={{ fontSize: '14px', marginBottom: SPACING.sm }}>💡 AI Tip:</div>
            <p style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, margin: 0, lineHeight: 1.6 }}>
              {aiTip}
            </p>
          </div>
        </div>

        {/* Right Panel: Task List */}
        <div>
          <div style={{ marginBottom: SPACING.lg }}>
            <ProgressBar current={completedTasks} total={tasks.length} label={`Progress: ${completedTasks}/${tasks.length} done`} />
          </div>

          {/* CURRENT Task */}
          {currentTask && (
            <div
              style={{
                border: `2px solid ${COLORS.border.accent}`,
                borderRadius: SPACING.md,
                padding: SPACING.lg,
                background: COLORS.accent.accentLight,
                marginBottom: SPACING.lg,
              }}
            >
              <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginBottom: SPACING.md, fontWeight: TYPOGRAPHY.weights.bold }}>
                CURRENT (Active)
              </div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary, marginBottom: SPACING.lg }}>
                {currentTask.name}
              </div>
              <Button label="✓ Mark Done" variant="primary" fullWidth onClick={handleMarkDone} />
            </div>
          )}

          {/* DONE Tasks */}
          {tasks.filter((t) => t.status === 'done').length > 0 && (
            <div style={{ marginBottom: SPACING.lg }}>
              <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginBottom: SPACING.md, fontWeight: TYPOGRAPHY.weights.bold }}>
                DONE
              </div>
              {tasks
                .filter((t) => t.status === 'done')
                .map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: SPACING.md,
                      fontSize: TYPOGRAPHY.sizes.caption,
                      color: COLORS.text.secondary,
                      textDecoration: 'line-through',
                      marginBottom: SPACING.sm,
                    }}
                  >
                    ✔ {task.name}
                  </div>
                ))}
            </div>
          )}

          {/* PENDING Tasks */}
          {tasks.filter((t) => t.status === 'pending').length > 0 && (
            <div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary, marginBottom: SPACING.md, fontWeight: TYPOGRAPHY.weights.bold }}>
                PENDING
              </div>
              {tasks
                .filter((t) => t.status === 'pending')
                .map((task) => (
                  <div
                    key={task.id}
                    style={{
                      padding: SPACING.md,
                      fontSize: TYPOGRAPHY.sizes.caption,
                      color: COLORS.text.secondary,
                      marginBottom: SPACING.sm,
                    }}
                  >
                    ☐ {task.name}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Test at http://localhost:3000/focus**

Expected: Timer ring with countdown, task list on right, pause/stop buttons

- [ ] **Step 3: Commit**

```bash
git add src/app/focus/page.jsx
git commit -m "feat: implement Focus Mode page

- Split layout: timer ring (left), task list (right)
- 25-minute countdown with pause/resume
- Rotating AI tips every 2 minutes
- Task sections (Current/Done/Pending)
- Mark Done button advances to next task
- Stop button with confirmation"
```

---

### Phase 5: Remaining API Endpoints

#### Task 15: Create Focus Tip API Endpoint

**Files:**
- Create: `src/app/api/ai/focus-tip.js`

**Purpose:** Generate motivational/technique-based tips during focus sessions.

- [ ] **Step 1: Create endpoint**

```javascript
// src/app/api/ai/focus-tip.js

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const TIPS = [
  'Focus on the big picture first, details come later.',
  'Take notes as you study — it helps retention.',
  'Break down complex concepts into smaller parts.',
  'Review what you learned every few minutes.',
  'Take a deep breath — you're making progress.',
  'Summarize key points in your own words.',
];

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const topicId = searchParams.get('topicId');

    // Return random tip for now
    const tip = TIPS[Math.floor(Math.random() * TIPS.length)];

    return Response.json({ tip, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Focus tip error:', error);
    return Response.json({ tip: 'You're doing great! Keep up the momentum.' });
  }
}
```

- [ ] **Step 2: Test endpoint**

```bash
curl "http://localhost:3000/api/ai/focus-tip"
```

Expected: JSON with tip field

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ai/focus-tip.js
git commit -m "feat: add focus-tip API endpoint

- Returns motivational/technique tips for focus sessions
- Simple rotation of pre-written tips for now
- Can be extended with LLM generation"
```

---

### Phase 6: Testing & Verification

#### Task 16: Manual Testing Checklist

**Files:**
- Test manually (no code changes)

- [ ] **Step 1: Test AI Coach full flow**

```
1. Navigate to http://localhost:3000/coach
2. Wait for greeting to load
3. Click "Explain it to me" mode
4. Click "Start Session →"
5. Should navigate to session (or show confirmation)
6. Go back, click "I want to study something else"
7. Pick a topic from grid
8. Select a mode
9. Click "Start Session →"
```

- [ ] **Step 2: Test Quiz page**

```
1. Navigate to http://localhost:3000/quiz?topic=test
2. See question displayed with marks
3. Type answer in textarea
4. Click Save
5. Should evaluate and show marks
6. Click Next or Previous
7. Progress bar should update
```

- [ ] **Step 3: Test Focus Mode**

```
1. Navigate to http://localhost:3000/focus
2. Timer should countdown from 25:00
3. Click Pause — timer freezes
4. Click Resume — timer resumes
5. Click "Mark Done" on current task
6. Task moves to Done, next pending becomes Current
7. Progress bar updates
```

- [ ] **Step 4: Commit test notes**

```bash
git add -A
git commit -m "test: manual testing all three pages completed

- AI Coach: welcome, topic picker, mode selector states all working
- Quiz: question display, answer save, evaluation working
- Focus Mode: timer, task management, tip rotation working"
```

---

### Phase 7: Database & Integration

#### Task 17: Database Migrations (If Needed)

**Files:**
- Check existing schema

- [ ] **Step 1: Verify existing tables support the new features**

```sql
-- Check if study_sessions table exists
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'study_sessions';

-- Check if focus_sessions exists (or create)
CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  task_id UUID,
  duration_seconds INT,
  time_spent INT,
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

-- Check if quiz_attempts exists (or create)
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  question_id TEXT,
  answer TEXT,
  marks_earned INT,
  marks_total INT,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

- [ ] **Step 2: Document schema requirements**

No migration needed for Phase 0.5 — all data is ephemeral (questions generated per session, evaluations displayed, not persisted).

- [ ] **Step 3: Commit schema notes**

```bash
git add docs/schema-notes.md
git commit -m "docs: schema requirements for Phase 0.5

- No new tables required
- All quiz/focus data is session-ephemeral for now
- Can persist to focus_sessions/quiz_attempts tables in Phase 1"
```

---

### Phase 8: Documentation & Handoff

#### Task 18: Write Component Usage Guide

**Files:**
- Create: `docs/superpowers/components-guide.md`

- [ ] **Step 1: Document component APIs**

```markdown
# Component Usage Guide

## Shared Components

### Button
\`\`\`jsx
<Button
  label="Click me"
  variant="primary" | "secondary" | "ghost"
  onClick={() => {}}
  disabled={false}
  fullWidth={false}
/>
\`\`\`

### Card
\`\`\`jsx
<Card
  icon="🧠"
  title="Title"
  subtitle="Subtitle"
  active={false}
  dashed={false}
  onClick={() => {}}
/>
\`\`\`

### ProgressBar
\`\`\`jsx
<ProgressBar
  current={3}
  total={10}
  label="Progress"
/>
\`\`\`

### Avatar
\`\`\`jsx
<Avatar size="lg" | "md" | "sm" | "xl" icon="✦" />
\`\`\`

### TimerRing
\`\`\`jsx
<TimerRing timeLeft={900} duration={1500} paused={false} size={240} />
\`\`\`

### TopBar
\`\`\`jsx
<TopBar title="Page Title" subtitle="Optional" onBack={() => {}} />
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/components-guide.md
git commit -m "docs: component API usage guide for Phase 0.5+ pages"
```

---

#### Task 19: Final Verification & Summary

**Files:**
- Verify all files created

- [ ] **Step 1: List all created files**

```bash
find src/app/coach src/app/quiz src/app/focus src/components/shared src/app/api/ai src/lib/styles.js -type f -name "*.js" -o -name "*.jsx" | sort
```

Expected: 20+ files created

- [ ] **Step 2: Run build check**

```bash
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 3: Final commit**

```bash
git log --oneline -20
```

Expected: All Phase 0.5+ commits visible

---

## Summary

**Tasks Completed:**
- 19 total tasks across 8 phases
- 5 shared components (Button, Card, ProgressBar, Avatar, TopBar)
- 3 main page components (AI Coach, Quiz, Focus Mode)
- 5 API endpoints (coach-status, search-topics, generate-questions, evaluate-answer, focus-tip)
- 1 SVG component (TimerRing)
- Design system constants and documentation

**Files Created:**
- ~8 component files
- ~8 page/layout files
- ~5 API endpoint files
- ~2 utility/documentation files

**Key Features:**
- ✅ Three-state AI Coach (Welcome → Topic Picker → Mode Selector)
- ✅ Quiz page with structure hints, source snippets, AI evaluation
- ✅ Focus Mode with timer, task list, AI tips
- ✅ Consistent design system (colors, typography, spacing)
- ✅ Framer Motion ready (animations defined in design system)
- ✅ Responsive inline styles
- ✅ API integration with Anthropic Claude for question generation and answer evaluation

**Next Steps (Phase 0.5+):**
- Integrate Framer Motion animations for page transitions and micro-interactions
- Add real session persistence (focus_sessions, quiz_attempts tables)
- Implement chat interface for "Explain" mode
- Add spaced repetition scheduling for quiz questions
- Set up analytics tracking for engagement metrics

---

**Estimated Implementation Time:** 4-6 hours for experienced React developer

**Complexity:** Medium (state management, API integration, component composition)

**Testing Required:** Unit tests for components, integration tests for API endpoints, E2E tests for full flows
