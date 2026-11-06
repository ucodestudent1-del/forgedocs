-- Storage buckets setup
-- Run this in the Supabase SQL editor after creating the schema

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/csv']),
  ('templates', 'templates', false, 10485760, ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf']),
  ('converted', 'converted', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv', 'text/plain']);

-- Storage policies
CREATE POLICY "Users can upload to their own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id IN ('documents', 'templates', 'converted')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own objects" ON storage.objects
FOR SELECT USING (
  bucket_id IN ('documents', 'templates', 'converted')
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own objects" ON storage.objects
FOR DELETE USING (
  bucket_id IN ('documents', 'templates', 'converted')
  AND (storage.foldername(name))[1] = auth.uid()::text
);
