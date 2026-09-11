-- Additive upgrade from the initial schema. No data rewrite or destructive migration.
CREATE INDEX "Event_projectId_kind_clientAt_idx" ON "Event"("projectId", "kind", "clientAt");
