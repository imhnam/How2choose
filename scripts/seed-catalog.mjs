import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'apps/api/.env' });
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const categories = [
  ['seed_cat_gifts', 'gifts', 'Quà tặng', 'Gợi ý quà theo dịp và ngân sách.', null, 1],
  ['seed_cat_personal', 'personal-care', 'Chăm sóc cá nhân', 'Những món quà giúp người nhận chăm sóc bản thân.', 'seed_cat_gifts', 1],
  ['seed_cat_home', 'home-living', 'Nhà cửa & đời sống', 'Đồ dùng đẹp và hữu ích cho không gian sống.', 'seed_cat_gifts', 2],
  ['seed_cat_tech', 'technology', 'Công nghệ', 'Phụ kiện và thiết bị công nghệ.', 'seed_cat_gifts', 3],
  ['seed_cat_books', 'books', 'Sách & học tập', 'Sách và công cụ học tập.', 'seed_cat_gifts', 4],
  ['seed_cat_experience', 'experiences', 'Trải nghiệm', 'Voucher và trải nghiệm đáng nhớ.', 'seed_cat_gifts', 5],
];

const products = [
  { id: 'seed_prod_candle', slug: 'nen-thom-go-am', name: 'Nến thơm Gỗ ấm', description: 'Nến thơm thủ công với hương gỗ tuyết tùng và vani nhẹ.', price: 249000, brand: 'Mộc Studio', supplier: 'Mộc Studio', tags: ['thư giãn', 'nhà cửa'], cats: ['seed_cat_home', 'seed_cat_personal'], rating: 4.8, count: 42, discountPercent: 10, discountAmount: null, variants: [['seed_var_candle_amber', 'HTC-CAN-AMBER', 'Hổ phách', null, 'Sáp đậu nành', 249000, 18], ['seed_var_candle_white', 'HTC-CAN-WHITE', 'Trắng', null, 'Sáp đậu nành', 269000, 12]] },
  { id: 'seed_prod_mug', slug: 'binh-giu-nhiet-to-go', name: 'Bình giữ nhiệt Togo', description: 'Bình giữ nhiệt 500ml, thiết kế tối giản cho ngày làm việc.', price: 399000, brand: 'Togo', supplier: 'Công ty Togo Việt Nam', tags: ['tiện dụng', 'văn phòng'], cats: ['seed_cat_home', 'seed_cat_tech'], rating: 4.7, count: 36, discountPercent: null, discountAmount: 30000, variants: [['seed_var_mug_green', 'HTC-MUG-GREEN', 'Xanh rêu', null, 'Thép không gỉ', 399000, 25], ['seed_var_mug_cream', 'HTC-MUG-CREAM', 'Kem', null, 'Thép không gỉ', 399000, 20]] },
  { id: 'seed_prod_headphones', slug: 'tai-nghe-bluetooth-soundgo', name: 'Tai nghe Bluetooth SoundGo', description: 'Tai nghe không dây nhỏ gọn, pin dùng cả ngày và hộp sạc tiện lợi.', price: 790000, brand: 'SoundGo', supplier: 'SoundGo Official', tags: ['công nghệ', 'âm nhạc'], cats: ['seed_cat_tech'], rating: 4.6, count: 28, discountPercent: 15, discountAmount: null, variants: [['seed_var_headphones_black', 'HTC-SG-BLACK', 'Đen', null, 'Nhựa ABS', 790000, 16], ['seed_var_headphones_blue', 'HTC-SG-BLUE', 'Xanh navy', null, 'Nhựa ABS', 820000, 9]] },
  { id: 'seed_prod_journal', slug: 'so-tay-da-lam-viec', name: 'Sổ tay da làm việc', description: 'Sổ tay bìa da tối giản, giấy dày phù hợp ghi chú hằng ngày.', price: 189000, brand: 'Paper & Co.', supplier: 'Paper & Co.', tags: ['học tập', 'văn phòng'], cats: ['seed_cat_books', 'seed_cat_home'], rating: 4.9, count: 51, discountPercent: null, discountAmount: null, variants: [['seed_var_journal_brown', 'HTC-JOU-BROWN', 'Nâu', 'A5', 'Da PU', 189000, 30], ['seed_var_journal_black', 'HTC-JOU-BLACK', 'Đen', 'A5', 'Da PU', 189000, 24]] },
  { id: 'seed_prod_skincare', slug: 'set-cham-soc-da-co-ban', name: 'Set chăm sóc da cơ bản', description: 'Bộ sản phẩm làm sạch và dưỡng ẩm cho thói quen chăm sóc da.', price: 549000, brand: 'Lumi Lab', supplier: 'Lumi Lab Official', tags: ['làm đẹp', 'chăm sóc'], cats: ['seed_cat_personal'], rating: 4.5, count: 23, discountPercent: 5, discountAmount: null, variants: [['seed_var_skin_default', 'HTC-SKIN-01', 'Tiêu chuẩn', null, null, 549000, 14]] },
  { id: 'seed_prod_backpack', slug: 'balo-laptop-daily', name: 'Balo laptop Daily', description: 'Balo chống nước, ngăn laptop 15 inch và nhiều ngăn phụ.', price: 699000, brand: 'Daily Carry', supplier: 'Daily Carry Vietnam', tags: ['đi học', 'đi làm'], cats: ['seed_cat_tech', 'seed_cat_home'], rating: 4.4, count: 19, discountPercent: null, discountAmount: 50000, variants: [['seed_var_bag_black', 'HTC-BAG-BLACK', 'Đen', '15 inch', 'Polyester', 699000, 13], ['seed_var_bag_beige', 'HTC-BAG-BEIGE', 'Be', '15 inch', 'Polyester', 699000, 8]] },
  { id: 'seed_prod_coffee', slug: 'bo-ca-phe-thu-cong', name: 'Bộ cà phê thủ công', description: 'Bộ cà phê rang xay và phin nhỏ cho những buổi sáng chậm rãi.', price: 329000, brand: 'Nâu Roastery', supplier: 'Nâu Roastery', tags: ['ẩm thực', 'thư giãn'], cats: ['seed_cat_home'], rating: 4.8, count: 31, discountPercent: 10, discountAmount: 20000, variants: [['seed_var_coffee_robusta', 'HTC-COF-ROB', 'Robusta', null, 'Cà phê rang xay', 329000, 17], ['seed_var_coffee_arabica', 'HTC-COF-ARA', 'Arabica', null, 'Cà phê rang xay', 359000, 11]] },
  { id: 'seed_prod_book', slug: 'sach-tu-duy-thiet-ke', name: 'Sách Tư duy thiết kế', description: 'Cuốn sách nhập môn tư duy thiết kế cho người mới bắt đầu.', price: 179000, brand: 'Nhã Nam', supplier: 'Nhã Nam', tags: ['sách', 'phát triển bản thân'], cats: ['seed_cat_books'], rating: 4.6, count: 17, discountPercent: null, discountAmount: null, variants: [['seed_var_book_default', 'HTC-BOOK-DESIGN', null, null, 'Bìa mềm', 179000, 22]] },
  { id: 'seed_prod_tea', slug: 'hop-tra-thao-moc-an-nhien', name: 'Hộp trà thảo mộc An Nhiên', description: 'Hộp trà thảo mộc phối trộn dịu nhẹ, thích hợp làm quà thăm hỏi và thư giãn.', price: 289000, brand: 'Lá Việt', supplier: 'Lá Việt', tags: ['trà', 'thư giãn', 'quà thăm hỏi'], cats: ['seed_cat_home'], rating: 4.8, count: 26, discountPercent: 10, discountAmount: null, variants: [['seed_var_tea_lotus', 'HTC-TEA-LOTUS', 'Sen', null, 'Trà thảo mộc', 289000, 20], ['seed_var_tea_chrysanthemum', 'HTC-TEA-CHRYS', 'Cúc', null, 'Trà thảo mộc', 289000, 16]] },
  { id: 'seed_prod_flower', slug: 'hoa-sap-luu-huong', name: 'Hộp hoa sáp lưu hương', description: 'Hộp hoa sáp trang trí bền màu, phù hợp tặng sinh nhật hoặc ngày kỷ niệm.', price: 349000, brand: 'Nhà Hoa Nhỏ', supplier: 'Nhà Hoa Nhỏ', tags: ['hoa', 'sinh nhật', 'kỷ niệm'], cats: ['seed_cat_home', 'seed_cat_experience'], rating: 4.7, count: 33, discountPercent: null, discountAmount: 20000, variants: [['seed_var_flower_pink', 'HTC-FLR-PINK', 'Hồng pastel', null, 'Sáp thơm', 349000, 14], ['seed_var_flower_cream', 'HTC-FLR-CREAM', 'Kem', null, 'Sáp thơm', 349000, 12]] },
  { id: 'seed_prod_lamp', slug: 'den-ban-led-go-tre', name: 'Đèn bàn LED gỗ tre', description: 'Đèn bàn ánh sáng dịu với chân gỗ tre, phù hợp góc học tập và làm việc.', price: 459000, brand: 'Sáng Nhà', supplier: 'Sáng Nhà', tags: ['đèn bàn', 'góc làm việc', 'nhà cửa'], cats: ['seed_cat_home', 'seed_cat_tech'], rating: 4.6, count: 21, discountPercent: 8, discountAmount: null, variants: [['seed_var_lamp_natural', 'HTC-LAMP-NAT', 'Gỗ tự nhiên', null, 'Gỗ tre', 459000, 15]] },
  { id: 'seed_prod_speaker', slug: 'loa-bluetooth-mini-go', name: 'Loa Bluetooth Mini Go', description: 'Loa Bluetooth nhỏ gọn, kết nối tiện lợi cho bàn làm việc hoặc những chuyến đi.', price: 590000, brand: 'SoundGo', supplier: 'SoundGo Official', tags: ['công nghệ', 'âm nhạc', 'du lịch'], cats: ['seed_cat_tech'], rating: 4.5, count: 18, discountPercent: null, discountAmount: 40000, variants: [['seed_var_speaker_black', 'HTC-SPK-BLACK', 'Đen', null, 'Nhựa ABS', 590000, 13], ['seed_var_speaker_green', 'HTC-SPK-GREEN', 'Xanh rêu', null, 'Nhựa ABS', 590000, 10]] },
  { id: 'seed_prod_scarf', slug: 'khan-lua-to-tam-nhe', name: 'Khăn lụa tơ tằm nhẹ', description: 'Khăn lụa mềm nhẹ với họa tiết thanh lịch, dễ phối đồ trong nhiều dịp.', price: 520000, brand: 'Lụa An', supplier: 'Lụa An', tags: ['thời trang', 'lụa', 'quà tặng'], cats: ['seed_cat_personal'], rating: 4.9, count: 29, discountPercent: 12, discountAmount: null, variants: [['seed_var_scarf_blue', 'HTC-SCF-BLUE', 'Xanh hoa văn', null, 'Lụa tơ tằm', 520000, 11], ['seed_var_scarf_red', 'HTC-SCF-RED', 'Đỏ hoa văn', null, 'Lụa tơ tằm', 520000, 9]] },
  { id: 'seed_prod_wallet', slug: 'vi-cardholder-da-toi-gian', name: 'Ví cardholder da tối giản', description: 'Ví đựng thẻ nhỏ gọn, thiết kế tối giản phù hợp sử dụng hằng ngày.', price: 320000, brand: 'Da Mộc', supplier: 'Da Mộc', tags: ['phụ kiện', 'đi làm', 'tối giản'], cats: ['seed_cat_personal'], rating: 4.6, count: 24, discountPercent: null, discountAmount: null, variants: [['seed_var_wallet_brown', 'HTC-WAL-BROWN', 'Nâu', null, 'Da PU', 320000, 17], ['seed_var_wallet_black', 'HTC-WAL-BLACK', 'Đen', null, 'Da PU', 320000, 15]] },
  { id: 'seed_prod_plant', slug: 'bo-trong-cay-mini-de-ban', name: 'Bộ trồng cây mini để bàn', description: 'Bộ chậu nhỏ kèm hạt giống và hướng dẫn chăm sóc, tạo điểm xanh cho bàn làm việc.', price: 199000, brand: 'Mầm Xanh', supplier: 'Mầm Xanh', tags: ['cây xanh', 'nhà cửa', 'thư giãn'], cats: ['seed_cat_home'], rating: 4.7, count: 32, discountPercent: null, discountAmount: 15000, variants: [['seed_var_plant_terracotta', 'HTC-PLT-TERRA', 'Đất nung', null, 'Gốm', 199000, 20], ['seed_var_plant_white', 'HTC-PLT-WHITE', 'Trắng', null, 'Gốm', 199000, 18]] },
  { id: 'seed_prod_boardgame', slug: 'tro-choi-ban-co-gia-dinh', name: 'Trò chơi bàn cờ gia đình', description: 'Trò chơi chiến thuật dễ học, dành cho những buổi tụ họp cùng gia đình và bạn bè.', price: 275000, brand: 'Vui Cùng Nhau', supplier: 'Vui Cùng Nhau', tags: ['trò chơi', 'gia đình', 'bạn bè'], cats: ['seed_cat_experience', 'seed_cat_books'], rating: 4.8, count: 27, discountPercent: 5, discountAmount: null, variants: [['seed_var_boardgame_standard', 'HTC-BRD-STD', 'Bản tiêu chuẩn', null, 'Giấy và gỗ', 275000, 19]] },
  { id: 'seed_prod_spa', slug: 'voucher-spa-thu-gian', name: 'Voucher trải nghiệm spa thư giãn', description: 'Voucher trải nghiệm chăm sóc và thư giãn tại spa đối tác ở Hà Nội, TP. Hồ Chí Minh hoặc Đà Nẵng.', price: 650000, brand: 'An Nhiên Spa', supplier: 'An Nhiên Spa', tags: ['trải nghiệm', 'chăm sóc', 'thư giãn'], cats: ['seed_cat_experience', 'seed_cat_personal'], rating: 4.7, count: 16, discountPercent: null, discountAmount: null, variants: [['seed_var_spa_60', 'HTC-SPA-60', 'Liệu trình 60 phút', null, null, 650000, 10]] },
  { id: 'seed_prod_chocolate', slug: 'hop-socola-thu-cong', name: 'Hộp sô-cô-la thủ công', description: 'Hộp sô-cô-la thủ công với nhiều vị, phù hợp làm quà cảm ơn hoặc chúc mừng.', price: 239000, brand: 'Ca Cao Nhà Làm', supplier: 'Ca Cao Nhà Làm', tags: ['ẩm thực', 'chúc mừng', 'quà cảm ơn'], cats: ['seed_cat_home'], rating: 4.8, count: 35, discountPercent: 7, discountAmount: null, variants: [['seed_var_chocolate_dark', 'HTC-CHO-DARK', 'Socola đen', null, 'Ca cao', 239000, 16], ['seed_var_chocolate_milk', 'HTC-CHO-MILK', 'Socola sữa', null, 'Ca cao', 239000, 18]] },
];

const shippingRegions = {
  seed_prod_candle: ['HN', 'HCM'],
  seed_prod_mug: ['ALL'],
  seed_prod_headphones: ['ALL'],
  seed_prod_journal: ['ALL'],
  seed_prod_skincare: ['HN', 'HCM', 'DN'],
  seed_prod_backpack: ['ALL'],
  seed_prod_coffee: ['HN', 'DN'],
  seed_prod_book: ['ALL'],
  seed_prod_tea: ['ALL'],
  seed_prod_flower: ['HN', 'HCM', 'DN'],
  seed_prod_lamp: ['ALL'],
  seed_prod_speaker: ['ALL'],
  seed_prod_scarf: ['ALL'],
  seed_prod_wallet: ['ALL'],
  seed_prod_plant: ['HN', 'HCM', 'DN'],
  seed_prod_boardgame: ['ALL'],
  seed_prod_spa: ['HN', 'HCM', 'DN'],
  seed_prod_chocolate: ['HN', 'HCM', 'DN'],
};

const packageProfiles = {
  seed_prod_candle: [500, 10, 10, 15],
  seed_prod_mug: [500, 9, 9, 26],
  seed_prod_headphones: [300, 22, 20, 8],
  seed_prod_journal: [350, 22, 16, 4],
  seed_prod_skincare: [700, 24, 18, 10],
  seed_prod_backpack: [900, 35, 26, 15],
  seed_prod_coffee: [1000, 25, 20, 15],
  seed_prod_book: [500, 23, 16, 5],
  seed_prod_tea: [700, 20, 15, 10],
  seed_prod_flower: [800, 24, 20, 15],
  seed_prod_lamp: [1100, 30, 18, 18],
  seed_prod_speaker: [450, 16, 12, 10],
  seed_prod_scarf: [250, 20, 15, 5],
  seed_prod_wallet: [220, 14, 11, 5],
  seed_prod_plant: [650, 18, 18, 16],
  seed_prod_boardgame: [700, 25, 20, 6],
  seed_prod_spa: [100, 15, 10, 2],
  seed_prod_chocolate: [500, 20, 15, 8],
};

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [id, slug, name, description, parentId, sortOrder] of categories) {
      await client.query(`INSERT INTO "Category" ("id","slug","name","description","parentId","sortOrder","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "parentId"=EXCLUDED."parentId", "sortOrder"=EXCLUDED."sortOrder", "updatedAt"=NOW()`, [id, slug, name, description, parentId, sortOrder]);
    }
    for (const product of products) {
      await client.query(`INSERT INTO "Product" ("id","slug","name","description","priceVnd","stock","tags","brand","supplier","shippingRegions","purchaseCount","ratingAverage","ratingCount","discountPercent","discountAmountVnd","active","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,true,NOW()) ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "priceVnd"=EXCLUDED."priceVnd", "stock"=EXCLUDED."stock", "tags"=EXCLUDED."tags", "brand"=EXCLUDED."brand", "supplier"=EXCLUDED."supplier", "shippingRegions"=EXCLUDED."shippingRegions", "purchaseCount"=EXCLUDED."purchaseCount", "ratingAverage"=EXCLUDED."ratingAverage", "ratingCount"=EXCLUDED."ratingCount", "discountPercent"=EXCLUDED."discountPercent", "discountAmountVnd"=EXCLUDED."discountAmountVnd", "updatedAt"=NOW()`, [product.id, product.slug, product.name, product.description, product.price, product.variants.reduce((sum, variant) => sum + variant[6], 0), product.tags, product.brand, product.supplier, shippingRegions[product.id] ?? ['ALL'], product.count, product.rating, product.count, product.discountPercent, product.discountAmount]);
      for (const categoryId of product.cats) await client.query(`INSERT INTO "ProductCategory" ("productId","categoryId") VALUES ($1,$2) ON CONFLICT DO NOTHING`, [product.id, categoryId]);
      for (const [id, sku, color, size, material, price, stock] of product.variants) {
        const [packageWeightGram, packageLengthCm, packageWidthCm, packageHeightCm] = packageProfiles[product.id];
        await client.query(`INSERT INTO "ProductVariant" ("id","productId","sku","name","color","size","material","priceVnd","stock","packageWeightGram","packageLengthCm","packageWidthCm","packageHeightCm","active","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,NOW()) ON CONFLICT ("sku") DO UPDATE SET "productId"=EXCLUDED."productId", "name"=EXCLUDED."name", "color"=EXCLUDED."color", "size"=EXCLUDED."size", "material"=EXCLUDED."material", "priceVnd"=EXCLUDED."priceVnd", "stock"=EXCLUDED."stock", "packageWeightGram"=COALESCE("ProductVariant"."packageWeightGram", EXCLUDED."packageWeightGram"), "packageLengthCm"=COALESCE("ProductVariant"."packageLengthCm", EXCLUDED."packageLengthCm"), "packageWidthCm"=COALESCE("ProductVariant"."packageWidthCm", EXCLUDED."packageWidthCm"), "packageHeightCm"=COALESCE("ProductVariant"."packageHeightCm", EXCLUDED."packageHeightCm"), "active"=true, "updatedAt"=NOW()`, [id, product.id, sku, color ?? null, color ?? null, size ?? null, material ?? null, price, stock, packageWeightGram, packageLengthCm, packageWidthCm, packageHeightCm]);
      }
    }
    await client.query('COMMIT');
    console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); await pool.end(); }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
