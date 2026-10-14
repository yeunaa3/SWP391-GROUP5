-- Keep V9 and its table intact for existing database histories.
-- The daily allowance feature is retired; active Premium is ad-free.
UPDATE subscription_packages SET benefits = JSON_ARRAY(
    'Đọc tập trung · Chỉ Premium',
    'Đọc thành tiếng · Cần giọng tiếng Việt',
    'Không quảng cáo khi gói còn hiệu lực',
    'Đọc nội dung Premium của The Pluse'
);
