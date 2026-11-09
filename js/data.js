/* =========================================================
   Dữ liệu mẫu cho Tổ Ấm (sinh ngẫu nhiên có seed cố định)
   ========================================================= */
(function () {
  // RNG có seed để dữ liệu giống nhau mỗi lần tải trang
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20261108);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const between = (min, max) => min + rand() * (max - min);
  const intBetween = (min, max) => Math.floor(between(min, max + 1));

  const IMG = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

  const PHOTOS = {
    apartment: ['1502672260266-1c1ef2d93688', '1522708323590-d24dbb6b0267', '1493809842364-78817add7ffb', '1560448204-e02f11c3d0e2', '1484154218962-a197022b5858', '1505691938895-1758d7feb511'],
    house: ['1564013799919-ab600027ffc6', '1570129477492-45c003edd2be', '1568605114967-8130f3a36994', '1580587771525-78b9dba3b914', '1512917774080-9991f1c4c750'],
    villa: ['1613490493576-7fde63acd811', '1600596542815-ffad4c1539a9', '1600585154340-be6161a56a0c', '1600607687939-ce8a6c25118c'],
    land: ['1500382017468-9049fed747ef', '1501785888041-af3ef285b470', '1464822759023-fed622ff2c3b'],
    office: ['1497366216548-37526070297c', '1497366811353-6870744d04b2', '1486406146926-c627a92ad1ab', '1545324418-cc1a3fa10c00'],
    shop: ['1441986300917-64674bd600d8', '1555396273-367ea4eb4db5', '1604719312566-8912e9227c6a'],
    room: ['1555854877-bab0e564b8d5', '1586023492125-27b2c045efd7', '1631049307264-da0ec9d70304'],
  };

  const CITIES = [
    { id: 'hn', name: 'Hà Nội', factor: 1.0, cover: IMG('1509030450996-dd1a26dda07a'),
      districts: ['Cầu Giấy', 'Đống Đa', 'Tây Hồ', 'Hoàng Mai', 'Nam Từ Liêm', 'Thanh Xuân', 'Long Biên', 'Hà Đông', 'Ba Đình'],
      streets: ['Trần Duy Hưng', 'Nguyễn Chí Thanh', 'Lạc Long Quân', 'Kim Mã', 'Xuân Thủy', 'Giải Phóng', 'Láng Hạ', 'Nguyễn Trãi'] },
    { id: 'hcm', name: 'TP. Hồ Chí Minh', factor: 1.05, cover: IMG('1583417319070-4a69db38a482'),
      districts: ['Quận 1', 'Quận 3', 'Quận 7', 'Bình Thạnh', 'Thủ Đức', 'Gò Vấp', 'Phú Nhuận', 'Tân Bình', 'Bình Tân'],
      streets: ['Nguyễn Văn Linh', 'Điện Biên Phủ', 'Võ Văn Tần', 'Phan Xích Long', 'Cộng Hòa', 'Lê Văn Việt', 'Nguyễn Thị Minh Khai', 'Quang Trung'] },
    { id: 'dn', name: 'Đà Nẵng', factor: 0.65, cover: IMG('1559592413-7cec4d0cae2b'),
      districts: ['Hải Châu', 'Sơn Trà', 'Ngũ Hành Sơn', 'Thanh Khê', 'Liên Chiểu', 'Cẩm Lệ'],
      streets: ['Võ Nguyên Giáp', 'Bạch Đằng', 'Nguyễn Văn Linh', 'Hoàng Sa', 'Lê Duẩn', 'Trần Phú'] },
    { id: 'hp', name: 'Hải Phòng', factor: 0.5, cover: IMG('1528127269322-539801943592'),
      districts: ['Lê Chân', 'Ngô Quyền', 'Hồng Bàng', 'Hải An', 'Kiến An'],
      streets: ['Lạch Tray', 'Văn Cao', 'Lê Hồng Phong', 'Trần Nguyên Hãn', 'Tô Hiệu'] },
    { id: 'kh', name: 'Khánh Hòa', factor: 0.55, cover: IMG('1540541338287-41700207dee6'),
      districts: ['Nha Trang', 'Cam Ranh', 'Ninh Hòa', 'Diên Khánh'],
      streets: ['Trần Phú', 'Phạm Văn Đồng', 'Lê Thánh Tôn', 'Nguyễn Thiện Thuật', '23 Tháng 10'] },
    { id: 'ct', name: 'Cần Thơ', factor: 0.4, cover: IMG('1557750255-c76072a7aad1'),
      districts: ['Ninh Kiều', 'Cái Răng', 'Bình Thủy', 'Ô Môn'],
      streets: ['30 Tháng 4', 'Trần Hưng Đạo', 'Nguyễn Văn Cừ', 'Mậu Thân', 'Hòa Bình'] },
  ];

  // Loại hình: giá bán theo triệu/m² (cơ sở Hà Nội) hoặc giá thuê triệu/tháng
  const TYPES = {
    ban: [
      { id: 'canho', name: 'Căn hộ chung cư', photo: 'apartment', area: [45, 130], ppm: [45, 110], beds: [1, 4] },
      { id: 'nharieng', name: 'Nhà riêng', photo: 'house', area: [30, 90], ppm: [90, 220], beds: [2, 5] },
      { id: 'matpho', name: 'Nhà mặt phố', photo: 'house', area: [50, 180], ppm: [200, 550], beds: [3, 6] },
      { id: 'bietthu', name: 'Biệt thự, liền kề', photo: 'villa', area: [120, 400], ppm: [120, 300], beds: [3, 6] },
      { id: 'datnen', name: 'Đất nền', photo: 'land', area: [60, 500], ppm: [15, 90], beds: [0, 0] },
      { id: 'shophouse', name: 'Shophouse', photo: 'shop', area: [70, 200], ppm: [150, 320], beds: [2, 4] },
    ],
    thue: [
      { id: 'canho', name: 'Căn hộ chung cư', photo: 'apartment', area: [40, 120], rent: [7, 35], beds: [1, 3] },
      { id: 'nharieng', name: 'Nhà riêng', photo: 'house', area: [40, 120], rent: [9, 40], beds: [2, 5] },
      { id: 'phongtro', name: 'Phòng trọ', photo: 'room', area: [15, 35], rent: [2, 6], beds: [1, 1] },
      { id: 'vanphong', name: 'Văn phòng', photo: 'office', area: [40, 400], rent: [12, 180], beds: [0, 0] },
      { id: 'matbang', name: 'Mặt bằng kinh doanh', photo: 'shop', area: [40, 250], rent: [15, 150], beds: [0, 0] },
    ],
  };

  const PROJECT_NAMES = ['Sky Garden Residence', 'The Lotus Park', 'Riverside Harmony', 'Green Valley City', 'Sunrise Bay', 'Golden Palm Tower', 'Ocean Pearl', 'Emerald Heights', 'Maple Square', 'Lumi Central'];
  const VIEWS = ['sông', 'hồ điều hòa', 'công viên', 'thành phố', 'biển', 'nội khu'];
  const LANDMARKS = ['ĐH Bách Khoa', 'chợ', 'công viên', 'bến xe', 'ĐH Quốc gia', 'bệnh viện', 'trung tâm thương mại'];
  const DIRECTIONS = ['Đông', 'Tây', 'Nam', 'Bắc', 'Đông Nam', 'Đông Bắc', 'Tây Nam', 'Tây Bắc'];
  const LEGAL = ['Sổ đỏ/Sổ hồng', 'Sổ đỏ/Sổ hồng', 'Hợp đồng mua bán', 'Đang chờ sổ'];
  const FURNITURE = ['Đầy đủ', 'Cơ bản', 'Không nội thất'];
  const AGENTS = [
    { name: 'Nguyễn Minh Anh', phone: '0912 345 678', tag: 'Môi giới chuyên nghiệp' },
    { name: 'Trần Quốc Bảo', phone: '0987 654 321', tag: 'Chính chủ' },
    { name: 'Lê Thu Hà', phone: '0903 112 233', tag: 'Môi giới chuyên nghiệp' },
    { name: 'Phạm Gia Huy', phone: '0938 777 888', tag: 'Chính chủ' },
    { name: 'Võ Ngọc Lan', phone: '0977 246 810', tag: 'Môi giới' },
    { name: 'Đặng Hoàng Nam', phone: '0868 135 790', tag: 'Môi giới chuyên nghiệp' },
  ];

  function titleFor(mode, type, ctx) {
    const { area, beds, district, street, project, floors } = ctx;
    if (mode === 'ban') {
      switch (type.id) {
        case 'canho': return `Bán căn hộ ${beds}PN ${area}m² view ${pick(VIEWS)} tại ${project}, ${district}`;
        case 'nharieng': return `Bán nhà riêng ${floors} tầng ngõ ô tô đỗ cửa, ${district}, ${area}m², sổ đỏ chính chủ`;
        case 'matpho': return `Bán nhà mặt phố ${street}, ${district}, mặt tiền ${intBetween(4, 9)}m, kinh doanh sầm uất`;
        case 'bietthu': return `Bán biệt thự ${project} ${area}m², sân vườn rộng, hoàn thiện cao cấp`;
        case 'datnen': return `Bán lô đất ${area}m² tại ${district}, đường ${intBetween(5, 15)}m, pháp lý rõ ràng`;
        case 'shophouse': return `Bán shophouse mặt đường ${street}, ${project}, vừa ở vừa kinh doanh`;
      }
    } else {
      switch (type.id) {
        case 'canho': return `Cho thuê căn hộ ${beds}PN ${project}, ${district}, nội thất đẹp, vào ở ngay`;
        case 'nharieng': return `Cho thuê nhà nguyên căn ${floors} tầng ${district}, ${area}m², phù hợp gia đình`;
        case 'phongtro': return `Cho thuê phòng trọ ${area}m² gần ${pick(LANDMARKS)}, ${district}, có gác, giờ tự do`;
        case 'vanphong': return `Cho thuê văn phòng ${area}m² mặt đường ${street}, ${district}, sàn thông thủy`;
        case 'matbang': return `Cho thuê mặt bằng kinh doanh mặt phố ${street}, ${district}, vỉa hè rộng`;
      }
    }
    return 'Bất động sản';
  }

  function describe(l) {
    const lines = [];
    if (l.mode === 'ban') {
      lines.push(`Chính chủ cần bán gấp ${l.typeName.toLowerCase()} tại ${l.address}.`);
    } else {
      lines.push(`Cần cho thuê ${l.typeName.toLowerCase()} tại ${l.address}.`);
    }
    lines.push(`- Diện tích: ${l.area}m²${l.floors ? `, ${l.floors} tầng` : ''}${l.beds ? `, ${l.beds} phòng ngủ, ${l.baths} WC` : ''}.`);
    lines.push(`- Hướng ${l.direction}, nội thất: ${l.furniture.toLowerCase()}.`);
    lines.push(`- Pháp lý: ${l.legal}.`);
    lines.push(`- Vị trí thuận tiện, gần trường học, chợ, bệnh viện; khu dân trí cao, an ninh tốt.`);
    lines.push(l.mode === 'ban' ? '- Giá có thương lượng cho khách thiện chí. Hỗ trợ vay ngân hàng tới 70%.' : '- Hợp đồng tối thiểu 6 tháng, đặt cọc 1 tháng.');
    lines.push('Liên hệ ngay để xem nhà trực tiếp!');
    return lines.join('\n');
  }

  const NOW = Date.now();
  const listings = [];
  for (let i = 0; i < 72; i++) {
    const mode = rand() < 0.62 ? 'ban' : 'thue';
    const city = rand() < 0.7 ? pick(CITIES.slice(0, 2)) : pick(CITIES.slice(2));
    const type = pick(TYPES[mode]);
    const district = pick(city.districts);
    const street = pick(city.streets);
    const area = Math.round(between(type.area[0], type.area[1]));
    const beds = type.beds[1] ? intBetween(type.beds[0], type.beds[1]) : 0;
    const baths = beds ? Math.max(1, beds - intBetween(0, 1)) : (type.id === 'vanphong' || type.id === 'matbang' ? intBetween(1, 2) : 0);
    const floors = ['nharieng', 'matpho', 'bietthu', 'shophouse'].includes(type.id) ? intBetween(2, 6) : 0;
    const project = pick(PROJECT_NAMES);

    let price; // VND
    if (mode === 'ban') {
      const ppm = between(type.ppm[0], type.ppm[1]) * city.factor; // triệu/m²
      price = Math.round((ppm * area) / 10) * 10 * 1e6; // làm tròn 10 triệu
    } else {
      price = Math.round(between(type.rent[0], type.rent[1]) * city.factor * 2) / 2 * 1e6; // làm tròn 0,5 triệu
      if (price < 1.5e6) price = 1.5e6;
    }

    const photoPool = PHOTOS[type.photo];
    const start = intBetween(0, photoPool.length - 1);
    const images = Array.from({ length: Math.min(4, photoPool.length) }, (_, k) => IMG(photoPool[(start + k) % photoPool.length]));

    const l = {
      id: 'L' + (1000 + i),
      mode,
      type: type.id,
      typeName: type.name,
      cityId: city.id,
      city: city.name,
      district,
      address: `${street}, ${district}, ${city.name}`,
      area, beds, baths, floors, price,
      direction: pick(DIRECTIONS),
      legal: mode === 'ban' ? pick(LEGAL) : 'Hợp đồng thuê',
      furniture: pick(FURNITURE),
      vip: rand() < 0.22 ? (rand() < 0.4 ? 'Kim cương' : 'VIP') : '',
      images,
      agent: pick(AGENTS),
      postedAt: NOW - Math.floor(between(0.1, 30) * 86400000),
      title: titleFor(mode, type, { area, beds, district, street, project, floors }),
    };
    l.description = describe(l);
    listings.push(l);
  }

  const projects = PROJECT_NAMES.slice(0, 8).map((name, i) => {
    const city = CITIES[i % CITIES.length];
    const status = ['Đang mở bán', 'Sắp mở bán', 'Đã bàn giao'][i % 3];
    const kind = ['Căn hộ chung cư', 'Khu đô thị', 'Biệt thự nghỉ dưỡng', 'Khu phức hợp'][i % 4];
    const pool = i % 2 ? PHOTOS.villa : PHOTOS.office;
    return {
      id: 'P' + (i + 1),
      name,
      city: city.name,
      cityId: city.id,
      district: city.districts[i % city.districts.length],
      status,
      kind,
      scale: `${intBetween(2, 40)} ha · ${intBetween(300, 4500).toLocaleString('vi-VN')} sản phẩm`,
      priceFrom: Math.round(between(35, 120) * city.factor),
      developer: `Công ty CP Đầu tư ${['Hưng Thịnh Phát', 'An Khang', 'Phú Gia', 'Minh Long'][i % 4]} (demo)`,
      image: IMG(pool[i % pool.length]),
    };
  });

  const PRICE_RANGES = {
    ban: [
      { label: 'Dưới 1 tỷ', min: 0, max: 1e9 },
      { label: '1 - 3 tỷ', min: 1e9, max: 3e9 },
      { label: '3 - 5 tỷ', min: 3e9, max: 5e9 },
      { label: '5 - 10 tỷ', min: 5e9, max: 10e9 },
      { label: '10 - 20 tỷ', min: 10e9, max: 20e9 },
      { label: 'Trên 20 tỷ', min: 20e9, max: Infinity },
    ],
    thue: [
      { label: 'Dưới 5 triệu', min: 0, max: 5e6 },
      { label: '5 - 10 triệu', min: 5e6, max: 10e6 },
      { label: '10 - 20 triệu', min: 10e6, max: 20e6 },
      { label: '20 - 50 triệu', min: 20e6, max: 50e6 },
      { label: 'Trên 50 triệu', min: 50e6, max: Infinity },
    ],
  };

  const AREA_RANGES = [
    { label: 'Dưới 30 m²', min: 0, max: 30 },
    { label: '30 - 50 m²', min: 30, max: 50 },
    { label: '50 - 80 m²', min: 50, max: 80 },
    { label: '80 - 100 m²', min: 80, max: 100 },
    { label: '100 - 150 m²', min: 100, max: 150 },
    { label: '150 - 300 m²', min: 150, max: 300 },
    { label: 'Trên 300 m²', min: 300, max: Infinity },
  ];

  const articles = [
    { tag: 'Kinh nghiệm', title: '7 điều cần kiểm tra trước khi mua căn hộ lần đầu', excerpt: 'Từ pháp lý dự án, tiến độ xây dựng đến phí quản lý – danh sách giúp bạn tránh rủi ro khi xuống tiền.', image: IMG('1560518883-ce09059eeffa'), date: '05/11/2026' },
    { tag: 'Pháp lý', title: 'Thủ tục sang tên sổ đỏ: hồ sơ, các bước và chi phí', excerpt: 'Hướng dẫn chi tiết quy trình công chứng, kê khai thuế và đăng ký biến động đất đai.', image: IMG('1450101499163-c8848c66ca85'), date: '02/11/2026' },
    { tag: 'Tài chính', title: 'Vay mua nhà: nên vay bao nhiêu là an toàn?', excerpt: 'Quy tắc 30% thu nhập và cách tính khoản trả góp hàng tháng để không bị áp lực tài chính.', image: IMG('1554224155-6726b3ff858f'), date: '28/10/2026' },
    { tag: 'Thuê nhà', title: 'Checklist khi đi xem phòng trọ, căn hộ cho thuê', excerpt: 'Kiểm tra điện nước, an ninh, hợp đồng và tiền cọc – những điều người thuê thường bỏ qua.', image: IMG('1484154218962-a197022b5858'), date: '20/10/2026' },
  ];

  window.APP_DATA = { CITIES, TYPES, listings, projects, PRICE_RANGES, AREA_RANGES, articles, AGENTS };
})();
