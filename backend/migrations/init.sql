-- DrSync Database Initialization Script
-- This script creates the initial database structure for the DrSync application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_role AS ENUM ('admin', 'provider', 'staff');
CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show');
CREATE TYPE message_type AS ENUM ('appointment_confirmation', 'reminder', 'follow_up', 'custom');
CREATE TYPE provider_status AS ENUM ('active', 'inactive', 'on_leave');

-- Organizations table (for multi-tenancy)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    google_sheets_id VARCHAR(255),
    whatsapp_phone_number VARCHAR(20),
    whatsapp_api_token TEXT,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    subscription_tier VARCHAR(50) DEFAULT 'basic',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table (healthcare providers and staff)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    role user_role NOT NULL DEFAULT 'staff',
    specialization VARCHAR(255),
    license_number VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Patients table (cached from Google Sheets for faster access)
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- ID from Google Sheets
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    medical_history TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    language VARCHAR(10) DEFAULT 'en',
    whatsapp_opted_in BOOLEAN DEFAULT true,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, phone_number)
);

-- Providers table (doctors and healthcare providers)
CREATE TABLE providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    qualification VARCHAR(500),
    experience_years INTEGER,
    consultation_fee DECIMAL(10,2),
    phone_number VARCHAR(20),
    email VARCHAR(255),
    working_hours JSONB, -- Store schedule as JSON
    is_available BOOLEAN DEFAULT true,
    status provider_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Appointments table (synced with Google Sheets)
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- ID from Google Sheets
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status appointment_status DEFAULT 'scheduled',
    reason_for_visit TEXT,
    notes TEXT,
    consultation_fee DECIMAL(10,2),
    whatsapp_message_id VARCHAR(255),
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMP WITH TIME ZONE,
    confirmation_sent BOOLEAN DEFAULT false,
    confirmation_sent_at TIMESTAMP WITH TIME ZONE,
    follow_up_sent BOOLEAN DEFAULT false,
    follow_up_sent_at TIMESTAMP WITH TIME ZONE,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, external_id)
);

-- WhatsApp messages log
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    whatsapp_message_id VARCHAR(255),
    phone_number VARCHAR(20) NOT NULL,
    message_type message_type NOT NULL,
    message_content TEXT NOT NULL,
    template_name VARCHAR(255),
    is_incoming BOOLEAN DEFAULT false,
    delivery_status VARCHAR(50) DEFAULT 'pending',
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Message templates
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type message_type NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    subject VARCHAR(255),
    content TEXT NOT NULL,
    variables JSONB, -- Store template variables as JSON
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, name, language)
);

-- Audit log for tracking all data changes
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    table_name VARCHAR(255) NOT NULL,
    record_id UUID,
    action VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- System configuration
CREATE TABLE system_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    config_key VARCHAR(255) NOT NULL,
    config_value TEXT,
    config_type VARCHAR(50) DEFAULT 'string',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, config_key)
);

-- Create indexes for better performance
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_patients_organization_id ON patients(organization_id);
CREATE INDEX idx_patients_phone ON patients(organization_id, phone_number);
CREATE INDEX idx_providers_organization_id ON providers(organization_id);
CREATE INDEX idx_appointments_organization_id ON appointments(organization_id);
CREATE INDEX idx_appointments_date ON appointments(organization_id, appointment_date);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_provider ON appointments(provider_id);
CREATE INDEX idx_whatsapp_messages_organization_id ON whatsapp_messages(organization_id);
CREATE INDEX idx_whatsapp_messages_phone ON whatsapp_messages(phone_number);
CREATE INDEX idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_templates_updated_at BEFORE UPDATE ON message_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_config_updated_at BEFORE UPDATE ON system_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default system configuration
INSERT INTO system_config (config_key, config_value, description) VALUES
('system_version', '1.0.0', 'Current system version'),
('maintenance_mode', 'false', 'System maintenance mode flag'),
('max_appointments_per_day', '50', 'Maximum appointments per provider per day'),
('default_appointment_duration', '30', 'Default appointment duration in minutes'),
('reminder_hours_before', '24', 'Hours before appointment to send reminder'),
('follow_up_hours_after', '72', 'Hours after appointment to send follow-up');

-- Insert default message templates (English)
INSERT INTO message_templates (organization_id, name, type, language, subject, content, variables) VALUES
(NULL, 'appointment_confirmation', 'appointment_confirmation', 'en', 'Appointment Confirmed', 
'Hello {{patient_name}}! Your appointment with Dr. {{provider_name}} is confirmed for {{appointment_date}} at {{appointment_time}}. Please arrive 10 minutes early. For any changes, please call us.', 
'{"patient_name": "string", "provider_name": "string", "appointment_date": "date", "appointment_time": "time"}'),
(NULL, 'appointment_reminder', 'reminder', 'en', 'Appointment Reminder',
'Dear {{patient_name}}, this is a reminder that you have an appointment tomorrow with Dr. {{provider_name}} at {{appointment_time}}. Please confirm your attendance by replying "YES" or reschedule by replying "RESCHEDULE".', 
'{"patient_name": "string", "provider_name": "string", "appointment_time": "time"}'),
(NULL, 'follow_up_message', 'follow_up', 'en', 'Post-Appointment Follow-up',
'Hello {{patient_name}}! We hope you are feeling better after your visit with Dr. {{provider_name}}. Please take your medications as prescribed and follow the given instructions. If you have any concerns, please contact us.', 
'{"patient_name": "string", "provider_name": "string"}');

-- Create a sample organization for development
INSERT INTO organizations (name, slug, phone_number, email, timezone) VALUES
('Demo Clinic', 'demo-clinic', '+1234567890', 'demo@drsync.dev', 'America/New_York');

COMMENT ON DATABASE drsync_dev IS 'DrSync Healthcare Appointment Management System - Development Database';
