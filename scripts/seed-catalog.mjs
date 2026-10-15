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
];

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [id, slug, name, description, parentId, sortOrder] of categories) {
      await client.query(`INSERT INTO "Category" ("id","slug","name","description","parentId","sortOrder","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,NOW()) ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "parentId"=EXCLUDED."parentId", "sortOrder"=EXCLUDED."sortOrder", "updatedAt"=NOW()`, [id, slug, name, description, parentId, sortOrder]);
    }
    for (const product of products) {
      await client.query(`INSERT INTO "Product" ("id","slug","name","description","priceVnd","stock","tags","brand","supplier","purchaseCount","ratingAverage","ratingCount","discountPercent","discountAmountVnd","active","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,true,NOW()) ON CONFLICT ("slug") DO UPDATE SET "name"=EXCLUDED."name", "description"=EXCLUDED."description", "priceVnd"=EXCLUDED."priceVnd", "stock"=EXCLUDED."stock", "tags"=EXCLUDED."tags", "brand"=EXCLUDED."brand", "supplier"=EXCLUDED."supplier", "purchaseCount"=EXCLUDED."purchaseCount", "ratingAverage"=EXCLUDED."ratingAverage", "ratingCount"=EXCLUDED."ratingCount", "discountPercent"=EXCLUDED."discountPercent", "discountAmountVnd"=EXCLUDED."discountAmountVnd", "updatedAt"=NOW()`, [product.id, product.slug, product.name, product.description, product.price, product.variants.reduce((sum, variant) => sum + variant[6], 0), product.tags, product.brand, product.supplier, product.count, product.rating, product.count, product.discountPercent, product.discountAmount]);
      for (const categoryId of product.cats) await client.query(`INSERT INTO "ProductCategory" ("productId","categoryId") VALUES ($1,$2) ON CONFLICT DO NOTHING`, [product.id, categoryId]);
      for (const [id, sku, color, size, material, price, stock] of product.variants) {
        await client.query(`INSERT INTO "ProductVariant" ("id","productId","sku","name","color","size","material","priceVnd","stock","active","updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,NOW()) ON CONFLICT ("sku") DO UPDATE SET "productId"=EXCLUDED."productId", "name"=EXCLUDED."name", "color"=EXCLUDED."color", "size"=EXCLUDED."size", "material"=EXCLUDED."material", "priceVnd"=EXCLUDED."priceVnd", "stock"=EXCLUDED."stock", "active"=true, "updatedAt"=NOW()`, [id, product.id, sku, color ?? null, color ?? null, size ?? null, material ?? null, price, stock]);
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
