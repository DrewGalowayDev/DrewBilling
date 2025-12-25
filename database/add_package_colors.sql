-- Add color_gradient column to packages table
-- Run this in Supabase SQL Editor

-- Add color_gradient column if it doesn't exist
ALTER TABLE packages ADD COLUMN IF NOT EXISTS color_gradient VARCHAR(100);
ALTER TABLE packages ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS duration_label VARCHAR(50);

-- Update existing packages with default color gradients based on order
-- These follow the exact pattern from the UserPortal design
UPDATE packages SET color_gradient = 'from-yellow-500 to-orange-600', display_order = 1, duration_label = 'Quick Access' WHERE amount = 1;
UPDATE packages SET color_gradient = 'from-yellow-500 to-orange-600', display_order = 2, duration_label = 'Quick Access' WHERE amount = 10;
UPDATE packages SET color_gradient = 'from-green-500 to-emerald-600', display_order = 3, duration_label = 'Short Session' WHERE amount = 15;
UPDATE packages SET color_gradient = 'from-blue-500 to-cyan-600', display_order = 4, duration_label = 'Half Day' WHERE amount = 20;
UPDATE packages SET color_gradient = 'from-pink-500 to-orange-600', display_order = 5, duration_label = 'Quick Access' WHERE amount = 25;
UPDATE packages SET color_gradient = 'from-purple-500 to-indigo-600', display_order = 6, duration_label = 'Full Day' WHERE amount = 30;
UPDATE packages SET color_gradient = 'from-gray-700 to-gray-900', display_order = 7, duration_label = 'Quick Access' WHERE amount = 50;
UPDATE packages SET color_gradient = 'from-purple-500 to-pink-600', display_order = 8, duration_label = 'Quick Access' WHERE amount = 80;
UPDATE packages SET color_gradient = 'from-yellow-500 to-green-600', display_order = 9, duration_label = 'Quick Access' WHERE amount = 200;
UPDATE packages SET color_gradient = 'from-red-500 to-purple-600', display_order = 10, duration_label = 'Quick Access' WHERE amount = 300;
UPDATE packages SET color_gradient = 'from-teal-500 to-cyan-600', display_order = 11, duration_label = 'Quick Access' WHERE amount = 500;

-- Set default color for any packages without a color
UPDATE packages SET color_gradient = 'from-blue-500 to-indigo-600' WHERE color_gradient IS NULL;
UPDATE packages SET duration_label = 'Standard' WHERE duration_label IS NULL;
UPDATE packages SET display_order = id WHERE display_order = 0;

-- Create index for display_order
CREATE INDEX IF NOT EXISTS idx_packages_display_order ON packages(display_order);
