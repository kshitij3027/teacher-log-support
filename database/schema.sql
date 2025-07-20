-- Teacher Support Platform Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable Row Level Security on auth.users (if not already enabled)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  bio TEXT,
  phone TEXT,
  school_district TEXT,
  school_name TEXT,
  grade_level TEXT,
  subject_area TEXT,
  years_experience INTEGER,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT display_name_length CHECK (char_length(display_name) >= 2 AND char_length(display_name) <= 50),
  CONSTRAINT full_name_length CHECK (full_name IS NULL OR char_length(full_name) <= 100),
  CONSTRAINT bio_length CHECK (bio IS NULL OR char_length(bio) <= 500)
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create incidents table
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('classroom_management', 'student_behavior', 'parent_communication', 'academic_performance', 'bullying', 'attendance', 'technology_issues', 'administrative', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'resolved', 'archived')),
  incident_date DATE NOT NULL,
  time_of_incident TIME,
  location TEXT,
  students_involved TEXT[], -- Array of student names/IDs
  witnesses TEXT[], -- Array of witness names
  action_taken TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_notes TEXT,
  attachments JSONB DEFAULT '[]'::jsonb, -- Store file metadata
  anonymous_sharing_allowed BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false, -- For soft delete
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT title_length CHECK (char_length(title) >= 5 AND char_length(title) <= 200),
  CONSTRAINT description_length CHECK (char_length(description) >= 10 AND char_length(description) <= 5000)
);

-- Add indexes for incidents
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_incident_date ON incidents(incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at);
CREATE INDEX IF NOT EXISTS idx_incidents_is_deleted ON incidents(is_deleted);

-- Create trigger for incidents
CREATE TRIGGER update_incidents_updated_at 
  BEFORE UPDATE ON incidents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile" ON user_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Row Level Security Policies for incidents
CREATE POLICY "Users can view their own incidents" ON incidents
  FOR SELECT USING (auth.uid() = user_id AND is_deleted = false);

CREATE POLICY "Users can insert their own incidents" ON incidents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own incidents" ON incidents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own incidents" ON incidents
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function for soft delete of incidents
CREATE OR REPLACE FUNCTION soft_delete_incident(incident_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE incidents 
  SET is_deleted = true, updated_at = NOW()
  WHERE id = incident_id AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check display name uniqueness
CREATE OR REPLACE FUNCTION is_display_name_available(name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS(
    SELECT 1 FROM user_profiles 
    WHERE display_name = name 
    AND user_id != COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;