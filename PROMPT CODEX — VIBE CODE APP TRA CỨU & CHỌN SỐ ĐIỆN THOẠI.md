# PROMPT CODEX — VIBE CODE APP TRA CỨU & CHỌN SỐ ĐIỆN THOẠI

Tôi muốn bạn xây dựng một web app hoàn chỉnh để phân tích số điện thoại theo **một bộ quy tắc và bảng ý nghĩa do người dùng cung cấp**.

## 1. MỤC TIÊU APP

App có đúng **2 chức năng chính**:

### Chức năng 1 — CHECK Ý NGHĨA SỐ

Người dùng nhập một số điện thoại.

App phải:

1. Hiển thị số điện thoại.
2. Tự động tách thành các cặp **2 chữ số liên tiếp có chồng lấp từ chữ số thứ hai**, sau đó thêm cặp **chữ số đầu + chữ số cuối**.
3. Tra cứu ý nghĩa từng cặp từ bảng 01–99.
4. Xử lý quy tắc đặc biệt của `00`.
5. Phát hiện và highlight các cặp số lặp lại.
6. Tính tổng toàn bộ chữ số của số điện thoại, bao gồm cả `0`.
7. Tra cứu ý nghĩa của tổng nếu tổng nằm trong bảng 01–99.
8. Đưa ra phần kết luận tổng thể dựa **chính xác vào dữ liệu trong bảng**, không tự sáng tạo ý nghĩa.

Ví dụ:

Số:

`0986995916`

Phải tách thành:

`98 – 86 – 69 – 99 – 95 – 59 – 91 – 16 – 06`

Không được tách kiểu:

`09 – 98 – 86 – 69 – 99 – 95 – 59 – 91 – 16`

---

# 2. CHỨC NĂNG 2 — UPLOAD FILE VÀ TÌM SỐ TỐT NHẤT

Người dùng có thể upload một file chứa danh sách số điện thoại.

File có thể là:

- `.txt`
- `.csv`
- `.xlsx`
- `.xls`

App phải:

1. Đọc toàn bộ danh sách số trong file.
2. Làm sạch dữ liệu:
   - bỏ khoảng trắng;
   - bỏ dấu `.`, `-`, `(`, `)`;
   - giữ số 0 ở đầu;
   - không tự ý thay đổi số.
3. Phân tích từng số bằng **chính xác cùng engine của chức năng 1**.
4. Tính điểm cho từng số.
5. Xếp hạng từ tốt nhất đến thấp nhất.
6. Hiển thị:
   - Top 1
   - Top 5
   - Top 10
   - toàn bộ danh sách nếu người dùng muốn.
7. Cho phép người dùng click vào từng số để xem phân tích chi tiết giống chức năng 1.
8. Có thể export kết quả thành `.xlsx` hoặc `.csv`.

Quan trọng:

**Không được viết riêng một logic phân tích cho chức năng 2.**

Cả hai chức năng phải dùng chung một:

`PhoneNumberAnalysisEngine`

---

# 3. NGUỒN DỮ LIỆU Ý NGHĨA

Đây là nguyên tắc QUAN TRỌNG NHẤT.

App chỉ được sử dụng bảng:

`THỐNG KÊ Ý NGHĨA SỐ ĐIỆN THOẠI PHONG THỦY (01 - 99)`

Không được:

- tự thêm ý nghĩa;
- tự sửa ý nghĩa;
- dùng phong thủy/numerology từ Internet;
- dùng một bảng 01–99 khác;
- suy diễn ý nghĩa mới từ các con số;
- thay thế dữ liệu bằng kiến thức AI.

Nếu một cặp số không có trong bảng:

`Không có dữ liệu trong bảng.`

---

# 4. DATASET 01–99

Tạo một file dữ liệu riêng, ví dụ:

`src/data/phoneMeanings.ts`

Dữ liệu phải chứa chính xác:

01: Nghề nghiệp
02: Lo lắng tài chánh
03: Bất đồng ý kiến
04: Tình cảm
05: Vận rủi
06: Cơ hội
07: Xung đột
08: Tiền tài
09: Khuyết đại cho số sau
10: Không tốt
11: Hai công việc đồng thời, lệ thuộc phía sau tốt hay không
12: Đường nghề nghiệp khó khăn, tự thân lập nghiệp
13: Lẹ làng khôn khéo
14: Có tâm hướng thượng
15: Vận rủi
16: Tự thân lập nghiệp trắc trở
17: Khôn khéo trực tính
18: Nghề nghiệp sinh tiền tài - nghị lực lớn
19: Nói năng ôn tồn, quyết đoán bản lĩnh, lãnh đạo
20: Lo lắng rất ngặt, rồi mất hết
21: Lanh lợi, lẹ làng, nhạy bén, đối tác yêu thương chân tình
22: Người giỏi gian khôn khéo, trí tuệ. Nhưng hay lo lắng tài chánh. Sự thể hiện chưa sáng suốt
23: Năng nổ, nhiệt tình, thông minh
24: Lo lắng tình cảm, nói năng ôn tồn
25: Nói năng ôn tồn, kỹ lưỡng tiền bạc. Nhưng sẵn sàng chi
26: Người xài không hạ tiện, không phung phí. Nhưng nếu cho cá nhân thì hơi phung phí
27: (Nam) đảm đang, nhưng hay cằn nhằn, trực tính
28: Lo lắng dễ giận hờn, nhưng có tài chánh
29: Vượt lên
30: Bất đồng rồi phải chịu thua
31: Bỏ ngang nửa chừng sụp đổ
32: Duyên dáng
33: Lãnh đạo
34: Xung đột tình cảm người thân sát bên mình, người nữ thì nắm quyền trong tay
35: Lòng dạ ngổn ngang, tâm rối bời
36: Đào hoa
37: Tâm tráo trở, phản nghịch
38: Phước, tai họa đều qua
39: Bị bạc đãi
40: Tâm hướng thượng -> cô độc-> xã hội tốt-> gia đình xấu
41: Có khả năng thuyết phục
42: Được thương chân tình (chân thành)
43: Bị thiệt, bị áp bức dưới cơ
44: Lãng mạn
45: Trắc trở tình duyên
46: Được người khác phái ngưỡng mộ
47: Xung đột tình cảm có thể chia tay – đồng sàng dị mộng
48: Được nhận tiền từ người mình thương
49: Quân tử được lòng - có một người trong nhà không hài lòng
50: Vận rủi bất ngờ -> sụp đổ -> nợ nần
51: Công việc trở ngại có thể sụp đổ
52: Dễ giận hờn, thích tâm sự, ít bằng lòng ai
53: Bị liên lụy bởi việc xui của người thân
54: Ly dị 10% - tang 10% - bị trù dập (Tu sĩ)
55: Kỹ lưỡng nguyên tắc
56: Tiền hung hậu kiết
57: Bị chỉ trích, bị hại ngầm
58: Hao tiền, thất thoát
59: Vận rủi
60: Cơ hội vượt mất
61: Cơ hội tốt đẹp trong nghề nghiệp
62: Đi nhiều nơi
63: Tâm hướng thượng, thích làm thiện cụ thể, tính cáu gắt
64: Sự cố học vấn, cơ hội tình yêu
65: Công việc hậu hung tiền cát
66: Thu nhập và giữ tiền tốt
67: Nói nhiều
68: Giữ được tiền
69: Cơ hội lệ thuộc số sau
70: Bị công kích nhưng nhận cho êm
71: Bất đồng trong nghề nghiệp lớn -> ra đi
72: Vất vả, buồn phiền, đời sống gió
73: Người có vị thế, lãng mạn, bị chỉ trích
74: Xung đột tình cảm có thể chia tay – đồng sàng dị mộng
75: Buồn phiền tài chánh hao hụt
76: Mẫu người hoạt bát, chủ quan, bảo thủ
77: Nói năng nhỏ nhẹ, nhưng cộc tánh
78: Thất thoát tài chánh
79: Bất đồng gia đình, thân tộc
80: Công việc đình trệ, buồn phiền âu lo, thân tình rạng nứt, mất mát người thân => vượt lên tiền tài bất ngờ
81: Bị người hạ ngầm, vu khống, buồn giận, bị hạ nhục
82: Người thẳng thắn, trung thực, không tích lũy tiền được
83: Quyền lực
84: Được thương chân tình (chân thành)
85: Thất thoát tiền bạc
86: Giữ được tiền
87: Không giữ được tiền
88: Ban đầu không tốt
89: Giữ được tiền, cơ hội tiền tài, được hưởng đức từ người khác
90: Cơ hội tốt bị vuột, thay đổi việc làm
91: Nghề nghiệp thăng tiến
92: Lãnh đạo quyết đoán, nhưng có người chống đối
93: Lãnh đạo quyết đoán, nhưng có người chống đối
94: Người yêu mến, ngưỡng mộ
95: tai nạn
96: Cơ hội cực lớn
97: chu kỳ giữa - xung đột dữ dội
98: Cực giàu
99: Khởi tâm tham vọng

Giữ nguyên text, dấu câu và wording.

---

# 5. THUẬT TOÁN TÁCH SỐ

Với số:

`0986995916`

Tách các cặp liền kề bắt đầu từ chữ số thứ hai, rồi thêm cặp gồm chữ số đầu và chữ số cuối:

```text
98
86
69
99
95
59
91
16
06
```

Pseudo:

```ts
for (let i = 1; i < phone.length - 1; i++) {
    pairs.push(phone.slice(i, i + 2));
}
pairs.push(phone[0] + phone[phone.length - 1]);
```

Không lấy cặp giữa chữ số đầu tiên và chữ số thứ hai. Với số có `n` chữ số, kết quả có `n - 1` cặp.

---

# 6. QUY TẮC 00

`00` KHÔNG có ý nghĩa độc lập.

Nếu xuất hiện:

`XX – 00`

thì `00` phủ định cặp đứng trước.

Ví dụ:

`60 – 00 – 01`

thì:

- `60` bị phủ định bởi `00`;
- `00` không được tra cứu như một ý nghĩa riêng;
- `01` vẫn được phân tích bình thường.

UI phải thể hiện rõ:

`00 → phủ định cặp 60`

Không tự tạo meaning cho `00`.

---

# 7. CẶP LẶP

Phải detect:

- lặp một cặp;
- lặp nhiều lần;
- đặc biệt là lặp liên tiếp.

Ví dụ:

`66 – 66 – 66`

phải hiển thị:

`66 xuất hiện 3 lần liên tiếp`

và highlight cả 3.

Tương tự:

`88 – 88 – 88`

---

# 8. TỔNG CHỮ SỐ

Luôn cộng toàn bộ chữ số.

Ví dụ:

`0366664670`

=

`0 + 3 + 6 + 6 + 6 + 6 + 4 + 6 + 7 + 0`

=

`44`

Sau đó tra:

`44 = Lãng mạn`

Không được bỏ số 0.

Nếu tổng > 99 thì thiết kế engine để xử lý rõ ràng, nhưng không tự tạo meaning ngoài bảng.

---

# 9. ENGINE PHÂN TÍCH

Tạo module:

`phoneAnalysisEngine.ts`

Ví dụ interface:

```ts
interface PhoneAnalysis {
    phoneNumber: string;
    pairs: PhonePair[];
    digitSum: number;
    totalMeaning?: string;
    repeatedPairs: RepeatedPair[];
    negatedPairs: string[];
    score: number;
    rating: string;
}
```

Mỗi pair:

```ts
interface PhonePair {
    pair: string;
    meaning: string;
    index: number;
    isRepeated: boolean;
    isConsecutiveRepeat: boolean;
    isNegatedBy00: boolean;
}
```

---

# 10. CHẤM ĐIỂM SỐ

Đây là phần cần thiết cho chức năng upload file.

Không được để AI tự chấm điểm tùy ý.

Hãy xây dựng một scoring system deterministic dựa trên chính bảng 01–99.

Tách các nhóm:

### Positive
Ví dụ các meaning thiên về:
- Tiền tài
- Cơ hội
- Nghề nghiệp thăng tiến
- Giữ được tiền
- Cực giàu
- Cơ hội cực lớn
- Lãnh đạo
- Có khả năng thuyết phục
- Được thương chân tình
- Được người yêu mến/ngưỡng mộ
- Khôn khéo
- Quyền lực

### Negative
Ví dụ:
- Vận rủi
- Không tốt
- Xung đột
- Hao tiền
- Thất thoát
- Không giữ được tiền
- Bị bạc đãi
- Bị hạ ngầm
- tai nạn
- sụp đổ
- nợ nần
- bất đồng nghề nghiệp
- trắc trở tình duyên

Nhưng scoring phải được định nghĩa thành một object/config rõ ràng:

```ts
const scoringRules = {
   ...
}
```

Không hard-code rải rác trong UI.

Quan trọng:

**Không dùng AI/LLM để quyết định Top 1.**

Top 1 phải được xác định bằng thuật toán deterministic để cùng một input luôn cho cùng một kết quả.

---

# 11. ƯU TIÊN TRONG SCORING

Khi xếp hạng:

1. Điểm tổng.
2. Ý nghĩa tổng số.
3. Các cặp tích cực mạnh.
4. Các cặp tiêu cực mạnh.
5. Repeated pairs.
6. Các trường hợp `00`.
7. Nếu bằng điểm thì giữ thứ tự xuất hiện trong file.

Không được chỉ nhìn các số "đẹp" về mặt hình thức.

Ví dụ:

Một số có `98` nhưng tổng là `58 = Hao tiền, thất thoát` thì phải phản ánh điều này trong điểm.

---

# 12. UI / UX

Thiết kế hiện đại, sạch, premium.

Phong cách:

- xanh lá / emerald;
- white background;
- dark text;
- card bo góc;
- subtle shadow;
- responsive;
- mobile friendly;
- typography rõ ràng.

Trang chính gồm:

## Header

Tên app:

**PHONE MEANING ANALYZER**

Subtitle:

**Tra cứu ý nghĩa & tìm số nổi bật**

---

## Tab 1: CHECK SỐ

Input:

`Nhập số điện thoại`

Button:

`Phân tích`

Sau khi phân tích:

### Card 1
**Số điện thoại**

`0984612963`

### Card 2
**Các cặp số**

Hiển thị dạng chip:

`09 → 98 → 84 → 46 → 61 → 12 → 29 → 96 → 63`

Các cặp lặp được highlight.

### Card 3
**Chi tiết ý nghĩa**

Bảng:

| Cặp | Ý nghĩa |
|---|---|
| 98 | Cực giàu |
| 84 | Được thương chân tình... |
| ... | ... |

### Card 4
**Tổng số**

Ví dụ:

`48`

`Được nhận tiền từ người mình thương`

### Card 5
**Đánh giá**

Hiển thị:

- Điểm số
- Mức đánh giá
- Điểm mạnh
- Điểm cần lưu ý

Nhưng tất cả phải trace được về dữ liệu bảng.

---

# 13. TAB 2 — TÌM SỐ TỐT NHẤT

Khu vực upload lớn:

```text
┌─────────────────────────────────┐
│                                 │
│       Kéo thả file vào đây      │
│                                 │
│       hoặc chọn file            │
│                                 │
│       TXT / CSV / XLSX          │
│                                 │
└─────────────────────────────────┘
```

Sau khi upload:

Hiển thị:

`Đã đọc 127 số`

Button:

**Phân tích tất cả**

Sau khi chạy:

### TOP 10

| Rank | Số điện thoại | Điểm | Tổng | Ý nghĩa tổng | Đánh giá |
|---|---|---:|---:|---|---|
| 🥇 | 0984612963 | ... | 48 | ... | ... |
| 🥈 | ... | ... | ... | ... | ... |

Click vào một số → mở detail drawer/modal.

---

# 14. FILTER

Cho phép filter:

- Tất cả
- Tài chính
- Nghề nghiệp
- Tình cảm
- Cơ hội
- Lãnh đạo
- Giữ tiền
- Điểm cao nhất

Cho phép sort:

- Điểm cao → thấp
- Điểm thấp → cao
- Tổng số
- Số điện thoại

---

# 15. EXPORT

Có button:

**Export Excel**

và:

**Export CSV**

Output nên có:

```text
Rank
Phone
Score
Digit Sum
Total Meaning
Pairs
Positive Count
Negative Count
Repeated Pairs
Warnings
Rating
```

---

# 16. TECH STACK

Nếu project chưa có framework, sử dụng:

- Next.js
- TypeScript
- Tailwind CSS
- App Router

Có thể sử dụng:

- SheetJS / xlsx để đọc Excel;
- PapaParse hoặc tương đương để đọc CSV.

Không cần backend nếu toàn bộ xử lý có thể thực hiện client-side.

Ưu tiên privacy:

**File người dùng upload phải được xử lý local trên browser nếu có thể.**

Không gửi danh sách số điện thoại lên server nếu không cần thiết.

---

# 17. KIẾN TRÚC

Tách rõ:

```text
src/
├── app/
│   ├── page.tsx
│   └── ...
│
├── components/
│   ├── PhoneChecker.tsx
│   ├── FileUploader.tsx
│   ├── PhoneAnalysis.tsx
│   ├── PairList.tsx
│   ├── RankingTable.tsx
│   ├── ScoreCard.tsx
│   └── ...
│
├── data/
│   └── phoneMeanings.ts
│
├── lib/
│   ├── phoneAnalysisEngine.ts
│   ├── scoringEngine.ts
│   ├── fileParser.ts
│   └── utils.ts
│
└── types/
    └── phone.ts
```

---

# 18. VALIDATION

Số điện thoại phải:

- chỉ chứa chữ số sau khi normalize;
- có độ dài hợp lý;
- không được để empty;
- nếu file có dòng không phải số thì đánh dấu là invalid thay vì làm crash app.

Ví dụ:

```text
0984612963       VALID
098-461-2963     VALID
098 461 2963     VALID
abc123           INVALID
```

Không được tự đoán hoặc sửa số invalid.

---

# 19. TEST CASE BẮT BUỘC

Tạo unit tests cho ít nhất các số sau:

### Test 1

`0366664670`

Expected pairs:

```text
36
66
66
66
64
46
67
70
00
```

Expected sum:

`44`

Expected total meaning:

`Lãng mạn`

Expected repeated pair:

`66 x 3 consecutive`

---

### Test 2

`0984612963`

Expected pairs:

```text
98
84
46
61
12
29
96
63
03
```

Expected sum:

`48`

Expected total meaning:

`Được nhận tiền từ người mình thương`

---

### Test 3 — 00 rule

`0372036001`

Expected pairs:

```text
37
72
20
03
36
60
00
01
01
```

Expected:

`00` negates `60`.

---

# 20. QUAN TRỌNG — KHÔNG ĐƯỢC LÀM

Không được:

❌ gọi API bên ngoài để lấy ý nghĩa số.

❌ dùng Google/search/web để bổ sung ý nghĩa.

❌ dùng AI để tự phán phong thủy.

❌ tự thêm meaning cho 00.

❌ lấy cặp giữa chữ số đầu tiên và chữ số thứ hai thay cho cặp đầu-cuối.

❌ tách số thành từng cặp không chồng lấp.

❌ bỏ số 0 khi tính tổng.

❌ tự sửa dữ liệu trong bảng.

❌ để scoring phụ thuộc vào LLM.

❌ hard-code Top 1.

---

# 21. VIBE CODING REQUIREMENT

Tôi muốn bạn thực hiện theo kiểu **vibe coding nhưng production-minded**:

1. Kiểm tra project hiện tại trước.
2. Nếu đã có code thì tận dụng cấu trúc hiện tại.
3. Không phá các chức năng đang hoạt động.
4. Xây dựng UI đẹp ngay từ đầu.
5. Component hóa hợp lý.
6. TypeScript strict.
7. Không để TypeScript error.
8. Không để ESLint error.
9. Không để console error.
10. Sau khi code xong phải chạy build/test.
11. Nếu có lỗi thì tự sửa.
12. Cuối cùng báo cáo:
   - đã tạo file nào;
   - architecture;
   - scoring logic;
   - cách chạy;
   - kết quả test;
   - các điểm còn cần cải thiện.

---

# 22. QUY TẮC QUAN TRỌNG NHẤT

Hãy coi bảng 01–99 và các quy tắc phân tích ở trên là **single source of truth**.

UI có thể đẹp, scoring có thể phức tạp, nhưng **không được làm sai dữ liệu nguồn**.

Mục tiêu cuối cùng:

> Người dùng nhập 1 số → app giải thích đầy đủ.

> Người dùng upload 1 file chứa hàng trăm/hàng nghìn số → app tự động phân tích toàn bộ và trả về danh sách xếp hạng, trong đó có **SỐ TỐT NHẤT** ở vị trí Top 1.

Bắt đầu bằng việc kiểm tra project hiện tại, sau đó triển khai toàn bộ chức năng.
