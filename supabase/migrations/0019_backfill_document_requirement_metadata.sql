UPDATE public.property_documents
SET
  category = CASE document_type
    WHEN 'aadhaar' THEN 'Identity & Personal Documents'
    WHEN 'pan' THEN 'Identity & Personal Documents'
    WHEN 'ownership_proof' THEN 'Core Ownership & Title Documents'
    WHEN 'agreement' THEN 'Core Ownership & Title Documents'
    WHEN 'registration_copy' THEN 'Core Ownership & Title Documents'
    WHEN 'survey_copy' THEN 'Core Ownership & Title Documents'
    WHEN 'survey_document' THEN 'Core Ownership & Title Documents'
    WHEN 'layout_image' THEN 'Building & Construction Approvals'
    WHEN 'tax_receipt' THEN 'Financial & NOC Documents'
    WHEN 'ec' THEN 'Core Ownership & Title Documents'
    WHEN 'noc' THEN 'Financial & NOC Documents'
    WHEN 'building_approval' THEN 'Building & Construction Approvals'
    WHEN 'property_photo' THEN 'Property Evidence'
    ELSE COALESCE(category, 'Supporting Documents')
  END,
  requirement_level = CASE
    WHEN document_type IN (
      'aadhaar',
      'pan',
      'ownership_proof',
      'agreement',
      'registration_copy',
      'survey_copy',
      'survey_document',
      'layout_image',
      'tax_receipt'
    ) THEN 'mandatory'
    ELSE COALESCE(requirement_level, 'optional')
  END
WHERE category IS NULL
   OR requirement_level IS NULL;
