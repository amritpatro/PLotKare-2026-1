ALTER TABLE public.property_documents
  ADD COLUMN IF NOT EXISTS property_request_id uuid REFERENCES public.customer_property_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_property_documents_property_request_id
  ON public.property_documents(property_request_id);
