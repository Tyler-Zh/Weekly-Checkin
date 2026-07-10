-- =============================================================================
-- 00_dsr_mkc_mapping.sql — shared dimension map (include in other queries)
-- Validated: SecondLevelMap ≠ APS SuMkC; use MkcName + IsAPSSupplier
-- =============================================================================

CREATE TEMP TABLE dsr_mkc_mapping AS
SELECT * FROM UNNEST([
  STRUCT(
    'Decorative Accent - Home Accents' AS mkc_name,
    'APS Decor - Home Accents' AS wgs_entity_name,
    'Home Accents' AS vertical_entity_name,
    'Decor' AS sto
  ),
  STRUCT('Decorative Accent - Wall Accents', 'APS Decor - Wall Accents', 'Wall Accents', 'Decor'),
  STRUCT('Wall Art', 'APS Decor - Wall Art', 'Wall Art', 'Decor'),
  STRUCT('Seasonal Decor', 'APS Decor - Seasonal Decor', 'Seasonal Decor', 'Decor'),
  STRUCT('Outdoor Decor', 'APS Decor - Outdoor Decor', 'Outdoor Decor', 'Decor'),
  STRUCT('Bedding', 'APS Softhome - Bedding', 'Bedding', 'Softhome'),
  STRUCT('Window', 'APS Softhome - Window', 'Window', 'Softhome'),
  STRUCT('Bath', 'APS Softhome - Bath', 'Bath', 'Softhome'),
  STRUCT('Rugs', 'APS Rugs', 'Rugs', 'Rugs')
]);
