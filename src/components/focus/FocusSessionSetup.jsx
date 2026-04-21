'use client';
import { useState, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Button from '@/components/shared/Button';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/lib/styles';

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
  if (days < 30) return `${Math.floor(days / 7)} week${Math.floor(days / 7) > 1 ? 's' : ''} ago`;
  return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`;
}

export default function FocusSessionSetup({ activePdf, documents, onSelectPDF, error, userId }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showAllDocs, setShowAllDocs] = useState(false);
  const fileInputRef = useRef(null);

  const sortedDocuments = useMemo(() => {
    return [...(documents || [])].sort((a, b) => {
      if (a.id === activePdf?.id) return -1;
      if (b.id === activePdf?.id) return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [documents, activePdf]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', session?.user?.id || userId || '');
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || !data.document) throw new Error(data.error || 'Upload failed');
      onSelectPDF(data.document.id, data.document.name);
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
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
    background: isActive ? 'rgba(139,92,246,0.06)' : 'transparent',
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

  // ── Path A: active PDF ────────────────────────────────────────────
  if (activePdf) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>📚 Ready to focus?</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Continue with your active study material:
          </div>

          <div
            style={docRowStyle(true)}
            onClick={() => onSelectPDF(activePdf.id, activePdf.name)}
          >
            <div>
              <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                📄 {activePdf.name.length > 32 ? activePdf.name.slice(0, 32) + '…' : activePdf.name}
              </div>
            </div>
            <span style={{
              fontSize: TYPOGRAPHY.sizes.small,
              background: 'rgba(139,92,246,0.15)',
              color: COLORS.text.accent,
              padding: `2px ${SPACING.sm}`,
              borderRadius: RADIUS.sm,
              fontWeight: 700,
            }}>Active</span>
          </div>

          <div style={{ display: 'flex', gap: SPACING.md }}>
            <Button
              label="▶ Start Focus Session"
              variant="primary"
              onClick={() => onSelectPDF(activePdf.id, activePdf.name)}
              style={{ flex: 1 }}
            />
            <Button
              label="Choose Another"
              variant="secondary"
              onClick={() => setShowAllDocs(true)}
            />
          </div>

          {showAllDocs && sortedDocuments.filter(d => d.id !== activePdf.id).map((doc) => (
            <div key={doc.id} style={docRowStyle(false)} onClick={() => onSelectPDF(doc.id, doc.name)}>
              <div>
                <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                  📄 {doc.name.length > 32 ? doc.name.slice(0, 32) + '…' : doc.name}
                </div>
                <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                  {relativeDate(doc.created_at)}
                </div>
              </div>
            </div>
          ))}

          {error && <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>{error}</div>}
        </div>
      </div>
    );
  }

  // ── Path B: no active PDF, previous PDFs exist ────────────────────
  if (sortedDocuments.length > 0) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>📚 Choose your study material</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            Select a PDF to begin your focus session
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.sm }}>
            {sortedDocuments.map((doc) => (
              <div key={doc.id} style={docRowStyle(false)} onClick={() => onSelectPDF(doc.id, doc.name)}>
                <div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.primary }}>
                    📄 {doc.name.length > 32 ? doc.name.slice(0, 32) + '…' : doc.name}
                  </div>
                  <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.text.secondary }}>
                    {relativeDate(doc.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={uploadZoneStyle}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
              {uploading ? '⏳ Uploading…' : '+ Upload New PDF'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {(error || uploadError) && (
            <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>
              {error || uploadError}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Path C: no PDFs at all ────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ fontSize: TYPOGRAPHY.sizes.heading, fontWeight: 600 }}>📚 Start your first focus session</div>
        <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
          Upload your study material to begin
        </div>

        <div
          style={uploadZoneStyle}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <div style={{ fontSize: '28px', marginBottom: SPACING.sm }}>📁</div>
          <div style={{ fontSize: TYPOGRAPHY.sizes.body, color: COLORS.text.secondary }}>
            {uploading ? '⏳ Uploading…' : 'Drop your PDF here or click to browse'}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        {uploadError && (
          <div style={{ fontSize: TYPOGRAPHY.sizes.caption, color: '#f87171' }}>{uploadError}</div>
        )}
      </div>
    </div>
  );
}
