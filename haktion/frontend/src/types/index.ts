export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'technician' | 'auditor';
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

export interface TemperatureLogger {
  id: number;
  logger_id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  logger_type: string;
  measurement_range: string;
  resolution: number;
  accuracy_spec: string;
  location: string;
  owner: string;
  commissioning_date: string;
  calibration_interval_months: number;
  last_calibration_date: string | null;
  next_due_date: string | null;
  status: 'active' | 'inactive' | 'retired';
  calibration_status: 'valid' | 'due_soon' | 'overdue' | 'failed' | 'not_calibrated';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReferenceInstrument {
  id: number;
  instrument_id: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  measurement_range: string;
  certificate_number: string;
  calibration_provider: string;
  calibration_date: string;
  expiry_date: string;
  stated_uncertainty: string;
  traceability_details: string;
  certificate_file_ref: string | null;
  is_active: boolean;
  is_expired: boolean;
  created_at: string;
}

export interface MeasurementPoint {
  id?: number;
  sequence: number;
  nominal_temperature: number;
  reference_reading: number;
  logger_reading: number;
  unit: string;
  ref_uncertainty?: number;
  allowed_tolerance: number;
  error?: number;
  abs_error?: number;
  outcome?: 'pass' | 'fail';
  repeated_readings?: string | null;
  timestamp?: string;
}

export interface CalibrationRecord {
  id: number;
  record_number: string;
  logger_id: number;
  reference_instrument_id: number;
  technician_id: number;
  calibration_date: string;
  location: string;
  ambient_temperature: number;
  ambient_humidity: number;
  procedure_code: string;
  equipment_used: string;
  configured_tolerance: number;
  tolerance_source: string;
  calibration_interval_months: number;
  overall_outcome: 'pass' | 'fail' | 'conditional';
  max_error: number;
  state: 'draft' | 'finalized' | 'amended';
  version: number;
  notes: string | null;
  provenance_hash: string | null;
  is_demo: boolean;
  created_at: string;
  finalized_at: string | null;
  finalized_by_id: number | null;
  logger?: TemperatureLogger;
  reference_instrument?: ReferenceInstrument;
  technician?: User;
  measurement_points: MeasurementPoint[];
}

export interface CalibrationAmendment {
  id: number;
  record_id: number;
  user_id: number;
  version: number;
  reason: string;
  previous_data: string;
  new_data: string;
  timestamp: string;
  user_name?: string;
}

export interface AuditEvent {
  id: number;
  user_id: number | null;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string | null;
  ip_address: string | null;
  timestamp: string;
  previous_hash: string | null;
  current_hash: string;
  user_name?: string;
}

export interface SystemNotification {
  id: number;
  logger_id: number | null;
  title: string;
  message: string;
  type: 'due_30_days' | 'due_7_days' | 'overdue' | 'expired_reference' | 'failed_calibration' | 'missing_provenance' | 'system';
  is_read: boolean;
  created_at: string;
  logger_identifier?: string;
}

export interface DashboardMetrics {
  total_loggers: int_count;
  valid_calibrations: number;
  due_soon_calibrations: number;
  overdue_calibrations: number;
  failed_calibrations: number;
  status_distribution: Record<string, number>;
  activity_timeline: Array<{ month: string; Passed: number; Failed: number; Total: number }>;
  upcoming_calibrations: Array<{
    id: number;
    logger_id: string;
    model: string;
    location: string;
    owner: string;
    next_due_date: string;
    days_remaining: number;
    status: string;
  }>;
  recent_calibrations: Array<{
    id: number;
    record_number: string;
    logger_id: string;
    model: string;
    technician: string;
    date: string;
    max_error: number;
    outcome: string;
    state: string;
  }>;
  reference_instruments_count: number;
  expired_reference_count: number;
}
type int_count = number;
