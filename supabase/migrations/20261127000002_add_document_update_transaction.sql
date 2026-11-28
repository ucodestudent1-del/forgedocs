-- up ---
-- Transactional document update with version history
-- Migration: 20261127000002_add_document_update_transaction

-- Function to atomically update document content and insert version record
-- Returns the updated document row or NULL if optimistic lock fails (version mismatch)
CREATE OR REPLACE FUNCTION update_document_with_version(
    p_document_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_expected_version INTEGER,
    p_encrypted BOOLEAN DEFAULT FALSE,
    p_encryption_key_wrapped TEXT DEFAULT NULL,
    p_encryption_iv TEXT DEFAULT NULL,
    p_encryption_algorithm TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    account_id UUID,
    title TEXT,
    content TEXT,
    format TEXT,
    file_size BIGINT,
    file_path TEXT,
    version INTEGER,
    status TEXT,
    is_template BOOLEAN,
    template_id UUID,
    tags TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    encryption_key_wrapped TEXT,
    encryption_iv TEXT,
    encryption_algorithm TEXT
) AS $$
DECLARE
    v_current_doc RECORD;
    v_new_version INTEGER;
    v_update_data JSONB;
BEGIN
    -- Lock the document row for update and verify ownership/access
    SELECT * INTO v_current_doc
    FROM documents
    WHERE id = p_document_id
    FOR UPDATE;

    IF v_current_doc IS NULL THEN
        RAISE EXCEPTION 'DOCUMENT_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    -- Verify access: owner or account member
    IF v_current_doc.user_id <> p_user_id AND v_current_doc.account_id IS NOT NULL THEN
        IF NOT is_account_member(v_current_doc.account_id, p_user_id) THEN
            RAISE EXCEPTION 'DOCUMENT_NOT_FOUND' USING ERRCODE = 'P0001';
        END IF;
    ELSIF v_current_doc.user_id <> p_user_id THEN
        RAISE EXCEPTION 'DOCUMENT_NOT_FOUND' USING ERRCODE = 'P0001';
    END IF;

    -- Optimistic locking check
    IF p_expected_version IS NOT NULL AND v_current_doc.version <> p_expected_version THEN
        RETURN QUERY SELECT NULL::documents;
        RETURN;
    END IF;

    v_new_version := v_current_doc.version + 1;

    -- Build update data
    v_update_data := jsonb_build_object(
        'content', p_content,
        'version', v_new_version
    );

    -- Preserve or update encryption fields
    IF p_encrypted THEN
        v_update_data := v_update_data || jsonb_build_object(
            'encryption_key_wrapped', COALESCE(p_encryption_key_wrapped, v_current_doc.encryption_key_wrapped),
            'encryption_iv', COALESCE(p_encryption_iv, v_current_doc.encryption_iv),
            'encryption_algorithm', COALESCE(p_encryption_algorithm, v_current_doc.encryption_algorithm, 'AES-256-GCM')
        );
    END IF;

    -- Update document with optimistic locking
    UPDATE documents
    SET
        content = p_content,
        version = v_new_version,
        encryption_key_wrapped = CASE WHEN p_encrypted THEN COALESCE(p_encryption_key_wrapped, encryption_key_wrapped) ELSE encryption_key_wrapped END,
        encryption_iv = CASE WHEN p_encrypted THEN COALESCE(p_encryption_iv, encryption_iv) ELSE encryption_iv END,
        encryption_algorithm = CASE WHEN p_encrypted THEN COALESCE(p_encryption_algorithm, encryption_algorithm, 'AES-256-GCM') ELSE encryption_algorithm END,
        updated_at = NOW()
    WHERE id = p_document_id AND version = v_current_doc.version;

    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::documents;
        RETURN;
    END IF;

    -- Insert version record
    INSERT INTO document_versions (document_id, version, content, title, format, file_size, file_path, changed_by, created_at)
    VALUES (p_document_id, v_current_doc.version, v_current_doc.content, v_current_doc.title, v_current_doc.format, v_current_doc.file_size, v_current_doc.file_path, p_user_id, NOW());

    -- Return updated document
    RETURN QUERY
    SELECT * FROM documents WHERE id = p_document_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_document_with_version(UUID, UUID, TEXT, INTEGER, BOOLEAN, TEXT, TEXT, TEXT) TO authenticated;

-- --- down ---
DROP FUNCTION IF EXISTS update_document_with_version(UUID, UUID, TEXT, INTEGER, BOOLEAN, TEXT, TEXT, TEXT);