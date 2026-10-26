-- ==============================================================================
-- Clinical Trial Management System (CTMS) - Complete Supabase Database Schema
-- Standard: AYUSH GCP, CDSCO, ICSR E2B(R3), 21 CFR Part 11 compliant audit trails
-- ==============================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Custom Enumerated Types
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE user_role_type AS ENUM (
    'super_admin',
    'principal_investigator',
    'study_coordinator',
    'clinical_monitor',
    'ethics_committee',
    'pharmacovigilance',
    'data_manager',
    'dsmb_member',
    'admin_leadership',
    'regulator_auditor'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status_type AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE trial_status_type AS ENUM (
    'Draft',
    'Submitted',
    'Under Review',
    'Ethics Approved',
    'Active',
    'Suspended',
    'Completed',
    'Terminated'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE patient_lifecycle_status AS ENUM (
    'Registered',
    'Consent Pending',
    'Consent Obtained',
    'Screening Pending',
    'Eligible',
    'Not Eligible',
    'Enrolled',
    'Active Treatment',
    'Completed',
    'Withdrawn',
    'Discontinued'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE consent_status_type AS ENUM (
    'Obtained',
    'Not Obtained',
    'Refused',
    'Withdrawn'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE visit_status_type AS ENUM ('Scheduled', 'Completed', 'Missed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE severity_level AS ENUM ('Unknown', 'Mild', 'Moderate', 'Severe');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE seriousness_level AS ENUM ('Unknown', 'Non-serious', 'Serious');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE causality_level AS ENUM (
    'Unassessable/Unclassifiable',
    'Certain',
    'Probable/Likely',
    'Possible',
    'Unlikely'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expectedness_level AS ENUM ('Unknown', 'Expected', 'Unexpected', 'Not Applicable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status_level AS ENUM ('Ongoing', 'Resolved', 'Unknown');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE safety_review_status AS ENUM (
    'Submitted',
    'Under Review',
    'Escalated',
    'Closed',
    'Follow-up Required'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE safety_reporting_status AS ENUM (
    'Not Assessed',
    'Reportable',
    'Reported',
    'Exempt'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. Utility Function: Updated At Trigger
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 4. User Profiles & Role-Based Permissions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ctms_users (
  id TEXT PRIMARY KEY DEFAULT ('usr_' || substr(md5(random()::text), 1, 10)),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  user_type user_role_type NOT NULL DEFAULT 'study_coordinator',
  role TEXT DEFAULT 'user',
  department TEXT,
  phone TEXT,
  status user_status_type DEFAULT 'active',
  permissions TEXT[] DEFAULT '{}',
  assigned_trial_ids TEXT[] DEFAULT '{}',
  assigned_centre_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ctms_users_updated_at
  BEFORE UPDATE ON public.ctms_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. Clinical Trial Centres / Site Management
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.centres (
  id TEXT PRIMARY KEY DEFAULT ('ctr_' || substr(md5(random()::text), 1, 10)),
  centre_code TEXT UNIQUE NOT NULL,
  centre_name TEXT NOT NULL,
  centre_type TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  accreditation TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_centres_updated_at
  BEFORE UPDATE ON public.centres
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. Clinical Trial Master (Proposals & Protocols)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.trials (
  id TEXT PRIMARY KEY DEFAULT ('trial_' || substr(md5(random()::text), 1, 10)),
  trial_id TEXT UNIQUE NOT NULL, -- e.g. 'CT-001'
  trial_title TEXT NOT NULL,
  study_type TEXT NOT NULL DEFAULT 'Interventional',
  study_phase TEXT NOT NULL DEFAULT 'Phase II',
  study_objective TEXT NOT NULL,
  study_design TEXT NOT NULL,
  primary_endpoint TEXT,
  secondary_endpoint TEXT,
  ctri_number TEXT,
  sample_size INTEGER DEFAULT 0,
  planned_start_date DATE,
  planned_end_date DATE,
  primary_sponsor TEXT,
  principal_investigator TEXT,
  status trial_status_type NOT NULL DEFAULT 'Active',
  protocol_version TEXT DEFAULT 'V1.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trials_updated_at
  BEFORE UPDATE ON public.trials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Regulatory & Ethics Approvals per Trial
CREATE TABLE IF NOT EXISTS public.trial_regulatory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE UNIQUE NOT NULL,
  protocol_approval JSONB DEFAULT '{"approvalStatus": "Approved", "version": "V1.0", "submissionDate": null, "approvalDate": null, "validUntil": null, "referenceNumber": "", "remarks": ""}',
  ethics_approval JSONB DEFAULT '{"approvalStatus": "Approved", "committeeName": "Institutional Ethics Committee", "submissionDate": null, "approvalDate": null, "validUntil": null, "referenceNumber": "", "remarks": ""}',
  cdsco_permission JSONB DEFAULT '{"status": "Approved", "permissionType": "CT Permission", "permissionNumber": "", "approvalDate": null, "validUntil": null, "remarks": ""}',
  ctri_registration JSONB DEFAULT '{"registrationStatus": "Registered", "ctriNumber": "CTRI/2026/09/000001", "registrationDate": null, "trialUrl": "", "remarks": ""}',
  clinical_hold JSONB DEFAULT '{"onHold": false, "reason": "", "imposedDate": null, "liftedDate": null, "imposedBy": "", "holdScope": "Full"}',
  validation_rules JSONB DEFAULT '{"requireProtocolApprovedForPatientEntry": true, "requireEthicsApprovedForPatientEntry": true, "requireCdscoApprovedForPatientEntry": false, "requireCtriApprovedForPatientEntry": true, "allowEmergencySubjectRecruitment": false, "minimumCompletedVisitsForCertificate": 1, "requireRecordedTreatmentForCertificate": true}',
  audit_trail JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trial_regulatory_updated_at
  BEFORE UPDATE ON public.trial_regulatory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trial Safety Reporting Configuration
CREATE TABLE IF NOT EXISTS public.trial_safety_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE UNIQUE NOT NULL,
  reporting_authority TEXT DEFAULT 'CDSCO / Ethics Committee',
  reporting_criteria TEXT DEFAULT 'AYUSH GCP / ICH E2A Guidelines',
  fatal_sae_hours INTEGER DEFAULT 24,
  serious_ae_hours INTEGER DEFAULT 48,
  non_serious_ae_days INTEGER DEFAULT 14,
  notify_pi_immediately BOOLEAN DEFAULT true,
  notify_ethics_committee BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_trial_safety_configs_updated_at
  BEFORE UPDATE ON public.trial_safety_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. Trial Teams & Delegation of Authority
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.trial_teams (
  id TEXT PRIMARY KEY DEFAULT ('team_' || substr(md5(random()::text), 1, 10)),
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,
  centre_id TEXT REFERENCES public.centres(id) ON DELETE SET NULL,
  centre_name TEXT,
  principal_investigator TEXT NOT NULL,
  team_lead TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  assigned_trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE SET NULL,
  number_of_patients INTEGER DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  id TEXT PRIMARY KEY DEFAULT ('mem_' || substr(md5(random()::text), 1, 10)),
  team_id TEXT REFERENCES public.trial_teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  qualification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 8. Drug & Investigational Medicinal Product (IMP) Master
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.drugs (
  id TEXT PRIMARY KEY, -- e.g. 'DRUG001'
  drug_name TEXT NOT NULL,
  generic_name TEXT,
  drug_type TEXT DEFAULT 'Indian System of Medicine (AYUSH)',
  formulation_name TEXT NOT NULL,
  dosage_form TEXT,
  strength TEXT,
  manufacturer TEXT,
  batch_number TEXT NOT NULL,
  expiry_date DATE,
  route_of_administration TEXT NOT NULL,
  indication TEXT NOT NULL,
  trial_phase TEXT,
  ctri_registration_number TEXT,
  cdsco_permission_status TEXT,
  assigned_centre TEXT,
  principal_investigator TEXT,
  available_quantity TEXT,
  frequency TEXT,
  treatment_duration TEXT,
  drug_status TEXT DEFAULT 'Active',
  storage_conditions TEXT,
  total_dosage TEXT,
  component_count INTEGER DEFAULT 1,
  components JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_drugs_updated_at
  BEFORE UPDATE ON public.drugs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. Patient Records, Consent, Screening & Enrollment
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.patients (
  id TEXT PRIMARY KEY DEFAULT ('pat_' || substr(md5(random()::text), 1, 10)),
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE NOT NULL,
  centre TEXT,
  patient_code TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  age INTEGER,
  gender TEXT,
  contact_number TEXT,
  address TEXT,
  emergency_contact TEXT,
  blood_group TEXT,
  registration_date DATE NOT NULL,
  registered_by TEXT,
  remarks TEXT,
  status patient_lifecycle_status NOT NULL DEFAULT 'Registered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_patient_trial_code UNIQUE (trial_id, patient_code)
);

CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Patient Informed Consent
CREATE TABLE IF NOT EXISTS public.patient_consents (
  id TEXT PRIMARY KEY DEFAULT ('consent_' || substr(md5(random()::text), 1, 10)),
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE NOT NULL,
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE NOT NULL,
  status consent_status_type NOT NULL DEFAULT 'Not Obtained',
  consent_date DATE,
  consent_time TEXT,
  consent_version TEXT DEFAULT 'V1',
  obtained_by TEXT,
  witness_name TEXT,
  lar_confirmed BOOLEAN DEFAULT false,
  remarks TEXT,
  document_metadata JSONB,
  analysis_result JSONB,
  created_by TEXT DEFAULT 'System',
  updated_by TEXT DEFAULT 'System',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_consents_updated_at
  BEFORE UPDATE ON public.patient_consents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Patient Protocol Screening
CREATE TABLE IF NOT EXISTS public.patient_screenings (
  id TEXT PRIMARY KEY DEFAULT ('screen_' || substr(md5(random()::text), 1, 10)),
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE NOT NULL,
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE NOT NULL,
  screening_date DATE NOT NULL,
  inclusion_criteria TEXT,
  exclusion_criteria TEXT,
  eligibility_status TEXT DEFAULT 'Pending', -- 'Eligible', 'Not Eligible', 'Pending'
  screening_remarks TEXT,
  screened_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_screenings_updated_at
  BEFORE UPDATE ON public.patient_screenings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Patient Study Enrollment & Randomization
CREATE TABLE IF NOT EXISTS public.patient_enrollments (
  id TEXT PRIMARY KEY DEFAULT ('enroll_' || substr(md5(random()::text), 1, 10)),
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE UNIQUE NOT NULL,
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE NOT NULL,
  enrollment_number TEXT NOT NULL,
  enrollment_date DATE NOT NULL,
  centre TEXT,
  treatment_group TEXT,
  randomization_number TEXT,
  enrolled_by TEXT,
  enrollment_status TEXT DEFAULT 'Active', -- 'Active', 'Completed', 'Withdrawn', 'Discontinued'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_enrollments_updated_at
  BEFORE UPDATE ON public.patient_enrollments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 10. Patient Clinical Visits & Sub-Records
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.patient_visits (
  id TEXT PRIMARY KEY DEFAULT ('vis_' || substr(md5(random()::text), 1, 10)),
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE NOT NULL,
  visit_number TEXT NOT NULL, -- e.g. 'Visit 1', 'Visit 2'
  visit_date DATE,
  visit_type TEXT DEFAULT 'Follow-up', -- 'Baseline', 'Follow-up', 'Unscheduled / Safety'
  status visit_status_type NOT NULL DEFAULT 'Scheduled',
  doctor_investigator TEXT,
  visit_notes TEXT,
  treatment_response TEXT DEFAULT '', -- 'Improvement', 'No Change', 'Worsened'
  treatment_response_notes TEXT,
  next_visit_date DATE,
  follow_up_instructions TEXT,
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_patient_visits_updated_at
  BEFORE UPDATE ON public.patient_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prescribed Medicines per Visit
CREATE TABLE IF NOT EXISTS public.visit_medicines (
  id TEXT PRIMARY KEY DEFAULT ('med_' || substr(md5(random()::text), 1, 10)),
  visit_id TEXT REFERENCES public.patient_visits(id) ON DELETE CASCADE NOT NULL,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  medicine_name TEXT NOT NULL,
  formulation TEXT,
  batch_number TEXT,
  dose TEXT,
  unit TEXT,
  frequency TEXT,
  route TEXT,
  quantity_provided TEXT,
  date_provided DATE,
  start_date DATE,
  end_date DATE,
  purpose TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adverse Events recorded during Visit
CREATE TABLE IF NOT EXISTS public.visit_adverse_events (
  id TEXT PRIMARY KEY DEFAULT ('ae_' || substr(md5(random()::text), 1, 10)),
  visit_id TEXT REFERENCES public.patient_visits(id) ON DELETE CASCADE NOT NULL,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  side_effect TEXT NOT NULL,
  date TEXT,
  severity TEXT,
  seriousness TEXT DEFAULT '',
  suspected_medicine TEXT,
  action_taken TEXT,
  treatment_given TEXT,
  outcome TEXT,
  additional_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clinical & Ayurvedic Observations during Visit
CREATE TABLE IF NOT EXISTS public.visit_observations (
  id TEXT PRIMARY KEY DEFAULT ('obs_' || substr(md5(random()::text), 1, 10)),
  visit_id TEXT REFERENCES public.patient_visits(id) ON DELETE CASCADE NOT NULL,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  temperature TEXT,
  pulse TEXT,
  blood_pressure TEXT,
  weight TEXT,
  other_observations TEXT,
  ayurvedic_observations TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Problem List / Comorbidities
CREATE TABLE IF NOT EXISTS public.visit_problems (
  id TEXT PRIMARY KEY DEFAULT ('prob_' || substr(md5(random()::text), 1, 10)),
  visit_id TEXT REFERENCES public.patient_visits(id) ON DELETE CASCADE NOT NULL,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  problem TEXT NOT NULL,
  symptoms TEXT,
  severity TEXT,
  onsetDate DATE,
  duration TEXT,
  current_status TEXT,
  doctor_observation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Laboratory & Diagnostic Results
CREATE TABLE IF NOT EXISTS public.visit_lab_results (
  id TEXT PRIMARY KEY DEFAULT ('lab_' || substr(md5(random()::text), 1, 10)),
  visit_id TEXT REFERENCES public.patient_visits(id) ON DELETE CASCADE NOT NULL,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  test_name TEXT NOT NULL,
  test_date DATE,
  result TEXT NOT NULL,
  unit TEXT,
  reference_range TEXT,
  interpretation TEXT, -- 'Normal', 'Abnormal', ''
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 11. Pharmacovigilance & Safety Reports (ICSR / SAE / ADR)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.safety_reports (
  id TEXT PRIMARY KEY DEFAULT ('srep_' || substr(md5(random()::text), 1, 10)),
  report_id TEXT UNIQUE NOT NULL, -- e.g. 'SR-CT001-2026-001'
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE NOT NULL,
  centre TEXT NOT NULL,
  enrollment_number TEXT,
  visit_id TEXT REFERENCES public.patient_visits(id) ON DELETE SET NULL,
  visit_number TEXT NOT NULL,
  reported_by TEXT NOT NULL,
  reported_by_user_id TEXT,
  reported_by_role TEXT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_term TEXT NOT NULL,
  description TEXT NOT NULL,
  onset_date_time TEXT NOT NULL,
  end_date_time TEXT DEFAULT 'Unknown',
  symptoms_findings TEXT DEFAULT 'Not Available',
  event_treatment TEXT DEFAULT 'Not Available',
  relevant_laboratory_findings TEXT DEFAULT 'Not Available',
  medical_history TEXT DEFAULT 'Not Available',
  concomitant_medicines TEXT DEFAULT 'Not Available',
  event_status event_status_level NOT NULL DEFAULT 'Ongoing',
  suspected_medicine_id TEXT DEFAULT 'Unknown',
  suspected_medicine_name TEXT DEFAULT 'Unknown',
  formulation TEXT DEFAULT 'Not Available',
  batch_number TEXT DEFAULT 'Not Available',
  dose TEXT DEFAULT 'Not Available',
  frequency TEXT DEFAULT 'Not Available',
  route TEXT DEFAULT 'Not Available',
  treatment_start_date TEXT DEFAULT 'Unknown',
  last_dose_date TEXT DEFAULT 'Unknown',
  indication TEXT DEFAULT 'Not Available',
  other_suspected_medicines TEXT DEFAULT 'Not Available',
  medicine_action_taken TEXT DEFAULT 'Not Available',
  severity severity_level NOT NULL DEFAULT 'Unknown',
  seriousness seriousness_level NOT NULL DEFAULT 'Unknown',
  seriousness_criteria TEXT[] DEFAULT '{}',
  seriousness_other TEXT DEFAULT '',
  causality causality_level NOT NULL DEFAULT 'Unassessable/Unclassifiable',
  causality_method TEXT DEFAULT 'Not Available',
  expectedness expectedness_level NOT NULL DEFAULT 'Unknown',
  clinical_assessment TEXT DEFAULT 'Not Available',
  action_taken TEXT DEFAULT 'Not Available',
  patient_outcome TEXT DEFAULT 'Unknown',
  follow_up_required BOOLEAN DEFAULT true,
  assessed_by TEXT DEFAULT '',
  assessed_by_user_id TEXT DEFAULT '',
  assessment_date TEXT DEFAULT '',
  reviewer_remarks TEXT DEFAULT '',
  review_status safety_review_status NOT NULL DEFAULT 'Submitted',
  initial_medical_review TEXT DEFAULT '',
  pi_decision TEXT DEFAULT '',
  reporting_assessment TEXT DEFAULT '',
  reporting_status safety_reporting_status NOT NULL DEFAULT 'Not Assessed',
  reporting_authority TEXT DEFAULT '',
  reporting_criteria TEXT DEFAULT '',
  reporting_deadline TEXT DEFAULT '',
  reported_at_authority TEXT DEFAULT '',
  closure_reason TEXT DEFAULT '',
  closed_at TIMESTAMPTZ,
  closed_by TEXT DEFAULT '',
  reopened_reason TEXT DEFAULT '',
  consent_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_safety_reports_updated_at
  BEFORE UPDATE ON public.safety_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Safety Report Document Attachments
CREATE TABLE IF NOT EXISTS public.safety_report_documents (
  id TEXT PRIMARY KEY DEFAULT ('sdoc_' || substr(md5(random()::text), 1, 10)),
  report_id TEXT REFERENCES public.safety_reports(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT,
  data_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by TEXT NOT NULL
);

-- Follow-Up Records for Safety Reports
CREATE TABLE IF NOT EXISTS public.safety_report_follow_ups (
  id TEXT PRIMARY KEY DEFAULT ('sfup_' || substr(md5(random()::text), 1, 10)),
  report_id TEXT REFERENCES public.safety_reports(id) ON DELETE CASCADE NOT NULL,
  date TEXT NOT NULL,
  summary TEXT NOT NULL,
  recorded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Urgent Safety Escalation History
CREATE TABLE IF NOT EXISTS public.safety_report_escalations (
  id TEXT PRIMARY KEY DEFAULT ('sesc_' || substr(md5(random()::text), 1, 10)),
  report_id TEXT REFERENCES public.safety_reports(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  escalated_by TEXT NOT NULL
);

-- Pharmacovigilance Notification Deliveries
CREATE TABLE IF NOT EXISTS public.safety_report_notifications (
  id TEXT PRIMARY KEY DEFAULT ('snot_' || substr(md5(random()::text), 1, 10)),
  report_id TEXT REFERENCES public.safety_reports(id) ON DELETE CASCADE NOT NULL,
  recipient_name TEXT NOT NULL,
  role TEXT NOT NULL,
  delivery_status TEXT DEFAULT 'In-App Delivered',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pharmacovigilance Data Queries
CREATE TABLE IF NOT EXISTS public.safety_report_queries (
  id TEXT PRIMARY KEY DEFAULT ('sque_' || substr(md5(random()::text), 1, 10)),
  report_id TEXT REFERENCES public.safety_reports(id) ON DELETE CASCADE NOT NULL,
  query_text TEXT NOT NULL,
  raised_by TEXT NOT NULL,
  status TEXT DEFAULT 'Open',
  response TEXT,
  responded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Safety Audit Trail (21 CFR Part 11 Compliant)
CREATE TABLE IF NOT EXISTS public.safety_report_audits (
  id TEXT PRIMARY KEY DEFAULT ('saud_' || substr(md5(random()::text), 1, 10)),
  report_id TEXT REFERENCES public.safety_reports(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  role TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 12. Treatment Completion Certificates & Verifications
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.treatment_certificates (
  id TEXT PRIMARY KEY DEFAULT ('cert_' || substr(md5(random()::text), 1, 10)),
  certificate_number TEXT UNIQUE NOT NULL,
  trial_id TEXT REFERENCES public.trials(trial_id) ON DELETE CASCADE NOT NULL,
  patient_id TEXT REFERENCES public.patients(id) ON DELETE CASCADE NOT NULL,
  patient_code TEXT NOT NULL,
  patient_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  centre TEXT NOT NULL,
  enrollment_number TEXT NOT NULL,
  treatment_group TEXT NOT NULL,
  treatment_start_date DATE NOT NULL,
  treatment_end_date DATE NOT NULL,
  completed_visits INTEGER NOT NULL DEFAULT 1,
  actual_treatment_status TEXT NOT NULL,
  issue_date DATE NOT NULL,
  authorized_signatory TEXT NOT NULL,
  verification_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Valid', -- 'Valid', 'Revoked'
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  issued_by TEXT NOT NULL,
  issued_by_role TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revoke_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_treatment_certificates_updated_at
  BEFORE UPDATE ON public.treatment_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.treatment_certificate_audits (
  id TEXT PRIMARY KEY DEFAULT ('caud_' || substr(md5(random()::text), 1, 10)),
  certificate_id TEXT REFERENCES public.treatment_certificates(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  role TEXT NOT NULL,
  details TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 13. High-Performance Query Indexes
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_trials_trial_id ON public.trials (trial_id);
CREATE INDEX IF NOT EXISTS idx_trials_status ON public.trials (status);

CREATE INDEX IF NOT EXISTS idx_patients_trial_id ON public.patients (trial_id);
CREATE INDEX IF NOT EXISTS idx_patients_code ON public.patients (patient_code);
CREATE INDEX IF NOT EXISTS idx_patients_status ON public.patients (status);

CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON public.patient_visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_trial ON public.patient_visits (trial_id);
CREATE INDEX IF NOT EXISTS idx_patient_visits_number ON public.patient_visits (visit_number);

CREATE INDEX IF NOT EXISTS idx_safety_reports_trial ON public.safety_reports (trial_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_patient ON public.safety_reports (patient_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_report_id ON public.safety_reports (report_id);
CREATE INDEX IF NOT EXISTS idx_safety_reports_seriousness ON public.safety_reports (seriousness);
CREATE INDEX IF NOT EXISTS idx_safety_reports_review ON public.safety_reports (review_status);

CREATE INDEX IF NOT EXISTS idx_certificates_verification ON public.treatment_certificates (verification_code);
CREATE INDEX IF NOT EXISTS idx_certificates_number ON public.treatment_certificates (certificate_number);

-- ==============================================================================
-- 14. Row Level Security (RLS) Setup
-- ==============================================================================

ALTER TABLE public.ctms_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_regulatory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_safety_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_screenings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_adverse_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_report_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_report_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_report_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_report_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_report_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_report_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_certificate_audits ENABLE ROW LEVEL SECURITY;

-- Standard Public/Authenticated Permissive Policies for Web Application
-- (Can be refined with granular tenant-based conditions when auth is plugged in)

DO $$ BEGIN
  CREATE POLICY "Allow authenticated and service access to ctms_users"
    ON public.ctms_users FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow read access to centres"
    ON public.centres FOR SELECT USING (true);
  CREATE POLICY "Allow modification of centres to authorized users"
    ON public.centres FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow access to trials"
    ON public.trials FOR ALL USING (true);
  CREATE POLICY "Allow access to trial regulatory"
    ON public.trial_regulatory FOR ALL USING (true);
  CREATE POLICY "Allow access to trial safety configs"
    ON public.trial_safety_configs FOR ALL USING (true);
  CREATE POLICY "Allow access to trial teams"
    ON public.trial_teams FOR ALL USING (true);
  CREATE POLICY "Allow access to team members"
    ON public.team_members FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow access to drugs"
    ON public.drugs FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow access to patients"
    ON public.patients FOR ALL USING (true);
  CREATE POLICY "Allow access to patient consents"
    ON public.patient_consents FOR ALL USING (true);
  CREATE POLICY "Allow access to patient screenings"
    ON public.patient_screenings FOR ALL USING (true);
  CREATE POLICY "Allow access to patient enrollments"
    ON public.patient_enrollments FOR ALL USING (true);
  CREATE POLICY "Allow access to patient visits"
    ON public.patient_visits FOR ALL USING (true);
  CREATE POLICY "Allow access to visit medicines"
    ON public.visit_medicines FOR ALL USING (true);
  CREATE POLICY "Allow access to visit adverse events"
    ON public.visit_adverse_events FOR ALL USING (true);
  CREATE POLICY "Allow access to visit observations"
    ON public.visit_observations FOR ALL USING (true);
  CREATE POLICY "Allow access to visit problems"
    ON public.visit_problems FOR ALL USING (true);
  CREATE POLICY "Allow access to visit lab results"
    ON public.visit_lab_results FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow access to safety reports"
    ON public.safety_reports FOR ALL USING (true);
  CREATE POLICY "Allow access to safety report documents"
    ON public.safety_report_documents FOR ALL USING (true);
  CREATE POLICY "Allow access to safety report follow ups"
    ON public.safety_report_follow_ups FOR ALL USING (true);
  CREATE POLICY "Allow access to safety report escalations"
    ON public.safety_report_escalations FOR ALL USING (true);
  CREATE POLICY "Allow access to safety report notifications"
    ON public.safety_report_notifications FOR ALL USING (true);
  CREATE POLICY "Allow access to safety report queries"
    ON public.safety_report_queries FOR ALL USING (true);
  CREATE POLICY "Allow access to safety report audits"
    ON public.safety_report_audits FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Allow public verification of treatment certificates"
    ON public.treatment_certificates FOR SELECT USING (true);
  CREATE POLICY "Allow issuance of treatment certificates"
    ON public.treatment_certificates FOR ALL USING (true);
  CREATE POLICY "Allow access to certificate audits"
    ON public.treatment_certificate_audits FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ==============================================================================
-- 15. Supabase Storage Buckets Setup (Optional / If Storage Extension Enabled)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('ctms-safety-documents', 'ctms-safety-documents', true),
  ('ctms-consent-proofs', 'ctms-consent-proofs', true),
  ('ctms-tmf-documents', 'ctms-tmf-documents', false)
ON CONFLICT (id) DO NOTHING;
