ALTER TABLE simulation_event
 ADD COLUMN project_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000001'
 REFERENCES network_project(id) ON DELETE CASCADE;
CREATE INDEX simulation_event_project_history ON simulation_event(project_id, id DESC);
