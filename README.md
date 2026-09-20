# Phone Meaning Analyzer

Ứng dụng Next.js client-side để tra cứu ý nghĩa số điện thoại theo bảng 01–99 do người dùng cung cấp và xếp hạng danh sách số.

## Chạy local

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

File upload được xử lý ngay trên trình duyệt. Engine phân tích trong `src/lib/phoneAnalysisEngine.ts` được dùng chung cho nhập số và xếp hạng file.

## Gemini

Đặt key vào `.env.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Nút **Luận thêm với Gemini** chỉ gọi `/api/gemini` khi người dùng chủ động bấm. Không đưa key vào `NEXT_PUBLIC_*` hoặc mã client.

## Cào số Viettel và luận giải

Trong tab **Tìm số tốt nhất**, nhập mẫu như `0989*`, chọn trả trước/trả sau rồi bấm **Lấy số & luận giải**. Ứng dụng gọi API Viettel ở server, đưa các số nhận được qua cùng `analyzePhoneNumber()` và xếp hạng bằng scoring hiện tại. Giá SIM chỉ là thông tin nguồn; không thay đổi ý nghĩa, điểm số hoặc rules.

Nếu Viettel giới hạn tần suất, giao diện sẽ hiện lỗi và không tự động vượt CAPTCHA/Cloudrity. Có thể dùng script CLI độc lập trong `scripts/crawl-viettel-sim-numbers.mjs` khi cần xuất TXT.
