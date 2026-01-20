# Scraper TODOs

- [ ] **Standardize Country Codes**: The `country` field currently contains both ISO-3 codes (e.g., "SWE") and full English names ("France"). Update the scraper to standardize all country values to valid ISO 3166-1 alpha-3 codes or consistent 2-letter codes to simplify frontend flag rendering.
- [ ] **Strict Typed Sub-objects**: The `races` array currently contains inconsistent usage of optional fields, forcing the validation schema to be loose (`any`). Ensure all race objects strictly adhere to a consistent interface (e.g. always include `race_id`, `name`, `date`).
- [ ] **Normalize Contact Info**: The `contact` field currently returns complex nested objects (e.g. for course setters) instead of flat key-value pairs. Flatten or standardize this structure to ensure it can be easily typed and displayed.
