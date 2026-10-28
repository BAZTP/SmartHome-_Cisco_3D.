CREATE TABLE packet_trace (
 event_id BIGINT PRIMARY KEY REFERENCES simulation_event(id) ON DELETE CASCADE,
 result JSONB NOT NULL
);
