-- Add processing status columns to documents table
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS processing_progress INT DEFAULT 100,
  ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Enable realtime for documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;
ALTER TABLE documents REPLICA IDENTITY FULL;
