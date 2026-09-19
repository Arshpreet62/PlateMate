-- Names must be unique regardless of case (enforced in the DB, not just in code)
CREATE UNIQUE INDEX "Customer_name_lower_key" ON "Customer" (lower("name"));
