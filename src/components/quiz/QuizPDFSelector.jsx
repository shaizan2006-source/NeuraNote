// src/components/quiz/QuizPDFSelector.jsx
'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Button from '@/components/shared/Button';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';
import { clientFetch } from '@/lib/clientFetch';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function relativeDate(isoStr) {
  if (!isoStr) return '';
  const days = Math.floor((Date.now() - new Date(isoStr).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// Props:
//   activePdf   — { id, name } | null
//   documents   — [{ id, name, created_at }]
//   onSelectPDF — (documentId, documentName) => void
//   userId      — string
//   error       — string | null
export default function QuizPDFSelector({ activePdf, documents, onSelectPDF, userId, error }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showOtherDocs, setShowOtherDocs] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { setShowOtherDocs(false); }, [activePdf?.id]);

  const sortedDocuments = useMemo(() =>
    [...(documents || [])].sort((a, b) => {
      if (a.id === activePdf?.id) return -1;
      if (b.id === activePdf?.id) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    }),
    [documents, activePdf]
  );

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await clientFetch('/api/upload', { method: 'POST', body: formData });
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Server error. Please try again.');
      }
      if (!res.ok || !data.document) throw new Error(data.error || 'Upload failed');
      onSelectPDF(data.document.id, data.document.name);
    } catch (err) {
      setUploadError(err.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pageStyle = {
    background: `linear-gradient(160deg, ${COLORS.bg.dark} 0%, ${COLORS.bg.darkGradient} 100%)`,
    minHeight: '100vh',
    color: COLORS.text.primary,
    fontFamily: TYPOGRAPHY.fontFamily,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  };

  const cardStyle = {
    width: '100%',
    maxWidth: 480,
    border: `1px solid ${COLORS.border.lighter}`,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    background: COLORS.bg.card,
    display: 'flex',
    flexDirection: 'column',
    gap: SPACING.lg,
  };

  const docRowStyle = (isActive) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: RADIUS.md,
    border: `1px solid ${isActive ? COLORS.border.accent : COLORS.border.light}`,
    background: isActive ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
    cursor: 'pointer',
    transition: 'background 0.15s',
  });

  const uploadZoneStyle = {
    border: `1px dashed ${COLORS.border.lighter}`,
    borderRadius: RADIUS.md,
    padding: `${SPACING.xl} ${SPACING.lg}`,
    textAlign: 'center',
    cursor: uploading ? 'wait' : 'pointer',
    opacity: uploading ? 0.6 : 1,
    transition: 'border-color 0.15s',
  };

  const errorText = error || uploadError;

  // ── State A: Active PDF ────────────────────────────────────────────────
  if (activePdf && !showOtherDocs) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>Start Quiz</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Generate questions from your active study material:
          </div>

          <div style={docRowStyle(true)} onClick={() => onSelectPDF(activePdf.id, activePdf.name)}>
            <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
              {activePdf.name.length > 36 ? activePdf.name.slice(0, 36) + '…' : activePdf.name}
            </div>
            <span style={{
              fontSize: TYPOGRAPHY.sizes.small,
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: COLORS.text.accent,
              padding: `2px ${SPACING.sm}`,
              borderRadius: RADIUS.sm,
              fontWeight: 700,
            }}>Active</span>
          </div>

          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button
              label="▶ Start Quiz"
              variant="primary"
              onClick={() => onSelectPDF(activePdf.id, activePdf.name)}
              style={{ flex: 1 }}
            />
            <Button
              label="Change PDF"
              variant="secondary"
              onClick={() => setShowOtherDocs(true)}
            />
          </div>

          {errorText && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: 'var(--error)' }}>{errorText}</div>
          )}
        </div>
      </div>
    );
  }

  // ── State B: No Active, Previous PDFs Exist (or "Change PDF" was clicked) ──
  if (sortedDocuments.length > 0) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>Choose Study Material</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Select a PDF to generate quiz questions from:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
            {sortedDocuments.map((doc) => (
              <div key={doc.id} style={docRowStyle(doc.id === activePdf?.id)} onClick={() => onSelectPDF(doc.id, doc.name)}>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                    {doc.name.length > 36 ? doc.name.slice(0, 36) + '…' : doc.name}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                    {relativeDate(doc.created_at)}
                  </div>
                </div>
                {doc.id === activePdf?.id && (
                  <span style={{
                    fontSize: TYPOGRAPHY.sizes.small,
                    background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
                    color: COLORS.text.accent,
                    padding: `2px ${SPACING.sm}`,
                    borderRadius: RADIUS.sm,
                    fontWeight: 700,
                  }}>Active</span>
                )}
              </div>
            ))}
          </div>

          <div style={uploadZoneStyle} onClick={() => !uploading && fileInputRef.current?.click()}>
            <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
              {uploading ? 'Uploading…' : '+ Upload New PDF'}
            </div>
            <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
          </div>

          {errorText && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: 'var(--error)' }}>{errorText}</div>
          )}
        </div>
      </div>
    );
  }

  // ── State C: No PDFs at all ────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>Start Your First Quiz</div>
        <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
          Upload your study material to generate quiz questions from it.
        </div>

        <div style={uploadZoneStyle} onClick={() => !uploading && fileInputRef.current?.click()}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            {uploading ? 'Uploading…' : 'Drop your PDF here or click to browse'}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {errorText && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: 'var(--error)' }}>{errorText}</div>
        )}
      </div>
    </div>
  );
}
