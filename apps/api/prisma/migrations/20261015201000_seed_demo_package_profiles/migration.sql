UPDATE "ProductVariant" AS variant
SET "packageWeightGram" = profile.weight,
    "packageLengthCm" = profile.length,
    "packageWidthCm" = profile.width,
    "packageHeightCm" = profile.height
FROM "Product" AS product
JOIN (VALUES
  ('nen-thom-go-am', 500, 10, 10, 15),
  ('binh-giu-nhiet-to-go', 500, 9, 9, 26),
  ('tai-nghe-bluetooth-soundgo', 300, 22, 20, 8),
  ('so-tay-da-lam-viec', 350, 22, 16, 4),
  ('set-cham-soc-da-co-ban', 700, 24, 18, 10),
  ('balo-laptop-daily', 900, 35, 26, 15),
  ('bo-ca-phe-thu-cong', 1000, 25, 20, 15),
  ('sach-tu-duy-thiet-ke', 500, 23, 16, 5)
) AS profile(slug, weight, length, width, height) ON profile.slug = product."slug"
WHERE variant."productId" = product."id"
  AND variant."packageWeightGram" IS NULL
  AND variant."packageLengthCm" IS NULL
  AND variant."packageWidthCm" IS NULL
  AND variant."packageHeightCm" IS NULL;