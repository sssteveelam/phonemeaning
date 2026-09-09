# AI Handoff — Phone Meaning Analyzer

## 1. Mục đích tài liệu

Tài liệu này mô tả toàn bộ trạng thái hiện tại của dự án để có thể chuyển tiếp cho một AI khác tiếp tục phát triển mà không phải đọc lại toàn bộ lịch sử trao đổi.

Ngày cập nhật: **09/09/2026**

## 2. Bối cảnh và nguồn tài liệu

Thư mục dự án ban đầu chỉ có ba tài liệu:

- `PROMPT CODEX — VIBE CODE APP TRA CỨU & CHỌN SỐ ĐIỆN THOẠI.md`: đặc tả chức năng, UI/UX, kiến trúc và yêu cầu kỹ thuật.
- `rules.md`: bảng ý nghĩa 01–99. Đây là **single source of truth** cho meaning.
- `Phương Pháp Luận Giải Số Điện Thoại.pdf`: tài liệu tham khảo nghiệp vụ. Không được tự lấy thêm meaning từ Internet, AI hoặc nguồn ngoài bảng 01–99.

Yêu cầu của người dùng là triển khai app theo file prompt Codex. Không có yêu cầu backend, API hay đăng tải dữ liệu lên server.

## 3. Trạng thái triển khai

Đã dựng một app Next.js hoàn chỉnh, xử lý client-side:

- Tab **Check số**: nhập và phân tích một số điện thoại.
- Tab **Tìm số tốt nhất**: upload danh sách TXT/CSV/XLS/XLSX, phân tích, xếp hạng và export.
- Engine phân tích được dùng chung cho cả hai tab.
- Giao diện responsive, phong cách emerald/white premium.
- Font hiện tại:
  - `Playfair Display` cho tiêu đề và số lớn.
  - `DM Sans` cho nội dung.
  - Có fallback `Georgia`, `Avenir Next`, `Segoe UI`.

## 4. Công nghệ

- Next.js 14, App Router
- React 18
- TypeScript strict
- Tailwind CSS
- `lucide-react` cho icon
- `xlsx` để đọc/ghi Excel
- Vitest cho unit test
- ESLint + `eslint-config-next`

## 5. Cấu trúc file

```text
.
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── PhoneAnalysis.tsx
│   │   ├── RankingTable.tsx
│   │   └── ScoreCard.tsx
│   ├── data/
│   │   └── phoneMeanings.ts
│   ├── lib/
│   │   ├── fileParser.ts
│   │   ├── phoneAnalysisEngine.ts
│   │   ├── phoneAnalysisEngine.test.ts
│   │   └── scoringEngine.ts
│   └── types/
│       └── phone.ts
├── package.json
├── package-lock.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.mjs
├── vitest.config.ts
├── .eslintrc.json
├── README.md
├── rules.md
└── AI_HANDOFF.md
```

## 6. Dataset 01–99

File: `src/data/phoneMeanings.ts`

- Chứa đủ mã từ `01` đến `99`.
- Text meaning được chép theo `rules.md`, giữ nguyên wording, dấu câu và ký tự tiếng Việt.
- Nếu cặp không tồn tại trong bảng, engine trả:

```text
Không có dữ liệu trong bảng.
```

- `00` không được xem là meaning độc lập; UI hiển thị quy tắc phủ định riêng.

Không được sửa, diễn giải lại hoặc bổ sung bảng này nếu chưa có chỉ dẫn rõ ràng từ người dùng.

## 7. Quy tắc phân tích số

### Normalize và validation

`normalizePhoneNumber()` chỉ loại bỏ:

```text
space, ., -, (, )
```

Sau normalize:

- Chỉ còn chữ số.
- Không được rỗng.
- Độ dài hiện tại: từ 3 đến 20 chữ số.
- Chuỗi chứa ký tự khác sẽ bị đánh dấu invalid, không tự sửa.

Ví dụ:

```text
0984612963  -> VALID
098-461-2963 -> VALID
098 461 2963 -> VALID
abc123 -> INVALID
```

### Cặp liền kề từ số thứ hai và cặp đầu-cuối

Với `0986995916`, engine tạo chính xác:

```text
98, 86, 69, 99, 95, 59, 91, 16, 06
```

Quy tắc:

- Không lấy cặp gồm chữ số đầu tiên và chữ số thứ hai.
- Tạo các cặp liền kề có chồng lấp, bắt đầu từ chữ số thứ hai cho đến chữ số cuối.
- Cuối cùng thêm cặp gồm `chữ số đầu + chữ số cuối`.
- Với số có `n` chữ số, kết quả vẫn có `n - 1` cặp.

### Quy tắc `00`

- `00` không có meaning độc lập.
- Nếu `00` ở vị trí sau một cặp, cặp ngay trước đó được đánh dấu `isNegatedBy00`.
- Ví dụ `60 – 00 – 01`:
  - `60` bị phủ định.
  - `00` hiển thị: `Không có ý nghĩa độc lập; phủ định cặp đứng trước.`
  - `01` vẫn phân tích bình thường.
- UI hiển thị cảnh báo dạng:

```text
00 → phủ định cặp 60
```

### Cặp lặp

Engine đếm mọi cặp xuất hiện nhiều lần và ghi nhận:

- `count`
- `indexes`
- `consecutive`

Ví dụ `66 – 66 – 66`:

```ts
{
  pair: "66",
  count: 3,
  consecutive: true,
  indexes: [2, 3, 4]
}
```

UI highlight toàn bộ các cặp bị lặp.

### Tổng chữ số

Engine cộng toàn bộ chữ số, bao gồm `0`.

```text
0366664670 = 44
```

Nếu tổng nằm trong khoảng `01–99`, engine tra meaning trong dataset. Nếu tổng ngoài bảng, `totalMeaning` là undefined và UI hiển thị không có dữ liệu.

## 8. Kiểu dữ liệu chính

File: `src/types/phone.ts`

`PhonePair` gồm:

```ts
{
  pair: string;
  meaning: string;
  index: number;
  isRepeated: boolean;
  isConsecutiveRepeat: boolean;
  isNegatedBy00: boolean;
  sentiment: "positive" | "negative" | "neutral";
  weight: number;
}
```

`PhoneAnalysis` gồm:

```ts
{
  phoneNumber: string;
  pairs: PhonePair[];
  digitSum: number;
  totalMeaning?: string;
  repeatedPairs: RepeatedPair[];
  negatedPairs: string[];
  score: number;
  rating: string;
  positiveCount: number;
  negativeCount: number;
  strengths: string[];
  warnings: string[];
  valid: boolean;
  error?: string;
}
```

## 9. Scoring deterministic

File: `src/lib/scoringEngine.ts`

Scoring không dùng AI/LLM. Tất cả rule nằm trong object `scoringRules`, không rải trong UI.

Nhóm hiện tại:

- `strongPositive`: trọng số `+10`
- `positive`: trọng số `+5`
- `strongNegative`: trọng số `-10`
- `negative`: trọng số `-4`

Điểm tổng được tính theo công thức:

```text
score = clamp(
  round(
    50
    + tổng trọng số các cặp active
    + điều chỉnh meaning của tổng chữ số
    + bonus cặp lặp
    - penalty cho cặp bị 00 phủ định
  ),
  0,
  100
)
```

Chi tiết hiện tại:

- Meaning của tổng:
  - strong positive: `+12`
  - positive: `+6`
  - strong negative: `-12`
  - negative: `-6`
- Cặp lặp: tối đa `+8`.
- Mỗi cặp bị `00` phủ định: `-2`.
- Cặp `00` không được tính điểm.
- Cặp bị phủ định không được tính meaning vào điểm.

Rating:

```text
80–100: Rất nổi bật
65–79:  Tích cực
50–64:  Cân bằng
35–49:  Cần cân nhắc
0–34:   Nhiều cảnh báo
```

Các cặp tích cực và cảnh báo được hiển thị kèm mã cặp và meaning để trace về bảng nguồn.

Lưu ý: scoring là hệ quy tắc deterministic được xây dựng từ các nhóm ví dụ trong prompt. Nếu chủ dự án muốn thay đổi trọng số hoặc phân loại cặp, chỉ sửa `scoringRules`.

## 10. Upload và ranking

File: `src/lib/fileParser.ts`

Định dạng hỗ trợ:

- `.txt`
- `.csv`
- `.xlsx`
- `.xls`

Hành vi:

1. Đọc toàn bộ file trên browser.
2. TXT/CSV được tách theo dòng và các delimiter phổ biến.
3. Excel được đọc tất cả sheet/cell bằng SheetJS.
4. Mỗi dòng/cell được validate riêng.
5. Dòng invalid được giữ lại để hiển thị, không làm crash app.
6. Chỉ số valid được đưa vào `analyzePhoneNumber()`.

Ranking:

- Tính điểm bằng cùng engine với tab Check số.
- Sắp xếp mặc định điểm cao → thấp.
- Nếu bằng điểm, ưu tiên số có meaning tổng; tiếp tục giữ thứ tự ổn định ban đầu.
- Hiển thị Top 10.
- Hỗ trợ filter:
  - Tất cả
  - Tài chính
  - Nghề nghiệp
  - Tình cảm
  - Cơ hội
  - Lãnh đạo
  - Giữ tiền
  - Điểm cao nhất
- Hỗ trợ sort:
  - Điểm cao → thấp
  - Điểm thấp → cao
  - Tổng số
  - Số điện thoại

Click một dòng mở modal phân tích chi tiết.

Export:

- CSV bằng `exportRows()`.
- Excel bằng `XLSX.utils.json_to_sheet()`.
- Các cột gồm Rank, Phone, Score, Digit Sum, Total Meaning, Pairs, Positive Count, Negative Count, Repeated Pairs, Warnings, Rating.

## 11. UI hiện tại

File chính: `src/app/page.tsx`

Đã có:

- Header thương hiệu.
- Privacy badge: xử lý cục bộ trên browser.
- Hero section.
- Hai tab chính.
- Input phân tích số.
- Số mẫu:
  - `0366664670`
  - `0984612963`
  - `0372036001`
- Card số điện thoại.
- Chip các cặp số.
- Highlight cặp lặp.
- Cảnh báo `00`.
- Bảng chi tiết meaning.
- Card tổng chữ số.
- Score card.
- Dropzone upload.
- Bảng ranking.
- Filter/sort.
- Export CSV/Excel.
- Detail modal.
- Responsive mobile.

## 12. Test bắt buộc

File: `src/lib/phoneAnalysisEngine.test.ts`

Đã có 4 test:

### Test 1

Input `0366664670`

- Pairs bắt đầu từ chữ số thứ hai và kết thúc bằng cặp đầu-cuối.
- Digit sum `44`.
- Total meaning `Lãng mạn`.
- `66` lặp 3 lần liên tiếp.

### Test 2

Input `0984612963`

- Pairs bắt đầu từ chữ số thứ hai và kết thúc bằng cặp đầu-cuối.
- Digit sum `48`.
- Total meaning `Được nhận tiền từ người mình thương`.

### Test 3

Input `0372036001`

- Pairs bắt đầu từ chữ số thứ hai và kết thúc bằng cặp đầu-cuối.
- `00` phủ định `60`.

### Test 4

Input `0986995916`

- Pairs: `98, 86, 69, 99, 95, 59, 91, 16, 06`.
- Digit sum giữ nguyên là `62`.

## 13. Lệnh chạy và kiểm tra

Cài dependency:

```bash
npm install
```

Chạy development:

```bash
npm run dev
```

Mở:

```text
http://localhost:3000
```

Kiểm tra:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Trạng thái lần kiểm tra gần nhất:

- `npm test`: pass, 3 tests.
- `npm run lint`: pass.
- `npx tsc --noEmit`: pass.
- `npm run build`: pass.
- `http://localhost:3000`: HTTP 200 khi chạy production server.

## 14. Nguyên tắc bắt buộc cho AI tiếp theo

1. Không gọi API ngoài để lấy meaning.
2. Không dùng Google/search/Internet để bổ sung meaning.
3. Không dùng AI/LLM để chấm điểm hoặc quyết định Top 1.
4. Không tự thêm meaning cho `00`.
5. Luôn tách cặp liền kề từ chữ số thứ hai và thêm cặp `chữ số đầu + chữ số cuối`.
6. Không quay lại quy tắc lấy cặp giữa chữ số đầu tiên và chữ số thứ hai.
7. Không bỏ `0` khi tính tổng.
8. Không tự sửa số invalid.
9. Không thay đổi meaning trong `src/data/phoneMeanings.ts` nếu chưa có yêu cầu mới.
10. Giữ engine dùng chung cho cả Check số và ranking file.
11. Khi thay đổi scoring, sửa trong `scoringRules`, không hard-code trong UI.
12. Sau mỗi thay đổi quan trọng phải chạy lại test, typecheck, lint và build.

## 15. Các điểm có thể cải thiện tiếp

- Tách `page.tsx` thành các component nhỏ hơn như `PhoneChecker`, `FileUploader`, `FilterBar`, `ExportActions`.
- Thêm progress indicator khi phân tích hàng nghìn số.
- Thêm lựa chọn hiển thị toàn bộ danh sách, không chỉ Top 10.
- Bổ sung test cho parser CSV/XLSX, normalize và validation.
- Cải thiện tie-break ranking theo đầy đủ thứ tự ưu tiên trong prompt.
- Có thể dùng Web Worker cho file rất lớn để tránh block UI.
- Thêm drag-and-drop feedback trực quan hơn.
- Nếu cần offline tuyệt đối, đóng gói font thay vì dùng Google Fonts qua `@import`.

## 16. Tích hợp Gemini (mới)

Đã thêm nút **Luận thêm với Gemini** trong phần chi tiết phân tích.

Files:

- `src/components/GeminiInsight.tsx`: nút gọi AI, trạng thái loading/error và vùng hiển thị kết quả.
- `src/app/api/gemini/route.ts`: route server-side gọi Gemini REST API.
- `.env.example`: mẫu biến môi trường.
- `.env.local`: biến môi trường local hiện tại (không commit).

Bảo mật:

- API key chỉ được đọc từ `process.env.GEMINI_API_KEY` trong route server.
- Không đưa API key vào `NEXT_PUBLIC_*`, React client hoặc source bundle.
- `.env*.local` đã được thêm vào `.gitignore`.
- API key đã từng xuất hiện trong cuộc trò chuyện; nên thu hồi key hiện tại và tạo key mới trước khi dùng production.

Model hiện dùng (thử theo thứ tự):

```text
gemini-2.5-flash-lite
gemini-2.5-flash
```

Route tự retry một lần với backoff ngắn cho các lỗi 429/5xx và tự chuyển model kế tiếp khi Gemini báo quá tải. Nếu vẫn thất bại, UI nhận thông báo tiếng Việt yêu cầu thử lại sau.

`thinkingConfig.thinkingBudget = 0` được bật để tránh model tiêu hết ngân sách vào phần suy luận ẩn khiến nội dung hiển thị bị cắt giữa câu. `maxOutputTokens` hiện là `2000`, prompt yêu cầu tối đa 450 từ và trả lời hoàn chỉnh.

Payload gửi lên gồm kết quả engine: số điện thoại, các cặp, meaning, tổng chữ số, cặp lặp, cặp bị `00` phủ định, score, rating, strengths và warnings.

Prompt Gemini bắt buộc:

- Chỉ diễn giải dữ liệu đã cung cấp.
- Không tra Internet.
- Không tự tạo/sửa meaning.
- Không thay đổi score/rating.
- Không khẳng định tương lai chắc chắn.
- Trình bày các mục: tóm tắt, điểm mạnh, cảnh báo, tài chính/nghề nghiệp/tình cảm, cặp lặp và `00`, kết luận tham khảo.

Luồng privacy sau khi tích hợp:

- Upload và ranking vẫn xử lý local trên browser.
- Chỉ khi người dùng bấm **Luận thêm** thì dữ liệu của số đang xem mới được gửi tới Gemini qua route server.
- Nếu người dùng không bấm nút Gemini, không có request Gemini.

## 17. Troubleshooting dev server

Nếu log xuất hiện xen kẽ `GET / 404` và `/_next/static/chunks/... 404`:

1. Dừng các terminal đang chạy Next (`Ctrl+C`).
2. Chỉ chạy một instance:

```bash
npm run dev
```

3. Hard refresh trình duyệt bằng `Ctrl+Shift+R`.

`GET /.well-known/appspecific/com.chrome.devtools.json 404` là request tự động của Chrome DevTools, không phải lỗi ứng dụng.
