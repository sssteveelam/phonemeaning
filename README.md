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
