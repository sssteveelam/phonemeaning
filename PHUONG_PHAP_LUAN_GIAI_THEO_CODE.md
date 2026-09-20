# Phương pháp luận giải số điện thoại theo mã nguồn

> Tài liệu này là bản trích xuất hành vi đang được triển khai thực tế trong code, chủ yếu từ:
>
> - `src/lib/phoneAnalysisEngine.ts`
> - `src/lib/scoringEngine.ts`
> - `src/data/phoneMeanings.ts`
> - `src/lib/fileParser.ts`
> - `src/app/page.tsx`
> - `src/app/api/gemini/route.ts`
>
> Đây là mô tả quy tắc của phần mềm, không phải kết luận kiểm chứng độc lập về tính đúng/sai của hệ thống phong thủy. Engine chấm điểm là deterministic; AI chỉ được dùng cho phần “luận thêm” sau khi engine đã hoàn tất.

## 1. Nguyên tắc nguồn dữ liệu

1. Bảng meaning chính là `phoneMeanings` với các mã từ `01` đến `99`; nội dung được giữ theo `rules.md`.
2. Cặp không có trong bảng dùng đúng chuỗi: `Không có dữ liệu trong bảng.`
3. Không tra cứu Internet và không tự bổ sung meaning bên ngoài bảng.
4. `00` không phải một meaning độc lập; đây là toán tử phủ định cặp đứng ngay trước nó.
5. Không dùng AI/LLM để thay đổi cặp số, meaning, tổng chữ số, điểm hoặc rating.

## 2. Quy trình tổng quát

```text
Chuỗi đầu vào
  → chuẩn hóa
  → kiểm tra hợp lệ
  → tạo các cặp số
  → tra meaning
  → phát hiện cặp lặp và quy tắc 00
  → cộng tổng chữ số
  → gán sentiment/trọng số
  → tính điểm, rating, strengths, warnings
```

## 3. Chuẩn hóa và kiểm tra đầu vào

### 3.1. Chuẩn hóa

`normalizePhoneNumber(value)` loại bỏ:

- mọi ký tự khoảng trắng theo regex `\s`;
- dấu chấm `.`;
- dấu gạch ngang `-`;
- dấu ngoặc tròn `(` và `)`.

Các ký tự khác không được tự sửa hoặc tự loại bỏ.

Ví dụ:

```text
0984612963    → 0984612963
098-461-2963  → 0984612963
098 461 2963  → 0984612963
```

### 3.2. Điều kiện hợp lệ

Sau khi chuẩn hóa:

| Điều kiện | Kết quả |
| --- | --- |
| Chuỗi rỗng | Không hợp lệ: `Vui lòng nhập số điện thoại.` |
| Có ký tự không phải chữ số | Không hợp lệ: `Số chỉ được chứa chữ số và các dấu cách, ., -, (, ).` |
| Độ dài dưới 3 hoặc trên 20 chữ số | Không hợp lệ: `Độ dài số điện thoại nên từ 3 đến 20 chữ số.` |
| Từ 3 đến 20 chữ số | Được phân tích tiếp |

Khi không hợp lệ, engine trả kết quả rỗng cho cặp, tổng chữ số bằng `0`, điểm bằng `0`, rating `Không hợp lệ` và kèm `error`.

## 4. Quy tắc tạo cặp số

Đây là quy tắc đặc thù của engine:

1. Không lấy cặp chữ số đầu tiên–thứ hai.
2. Lấy các cặp liền kề chồng lấp, bắt đầu từ chữ số thứ hai:
   `d2d3, d3d4, ..., d(n-1)dn`.
3. Cuối cùng thêm cặp đầu–cuối: `d1dn`.
4. Với số có `n` chữ số, kết quả có `n - 1` cặp.

### Ví dụ

Với `0986995916`:

```text
98 – 86 – 69 – 99 – 95 – 59 – 91 – 16 – 06
```

Với `0366664670`:

```text
36 – 66 – 66 – 66 – 64 – 46 – 67 – 70 – 00
```

Cặp cuối `06` hoặc `00` là cặp đầu–cuối, không phải cặp liền kề cuối cùng.

## 5. Tra meaning từng cặp

- Mỗi cặp được tra trong `phoneMeanings`.
- Cặp `00` luôn dùng meaning kỹ thuật:
  `Không có ý nghĩa độc lập; phủ định cặp đứng trước.`
- Cặp không có dữ liệu dùng:
  `Không có dữ liệu trong bảng.`
- Meaning của cặp bị `00` phủ định vẫn được giữ trong chi tiết để truy nguyên, nhưng cặp đó không còn là cặp active khi tính điểm.

## 6. Quy tắc cặp lặp

Engine lập chỉ mục mọi lần xuất hiện của từng cặp trong danh sách cặp đã tạo.

Một cặp được xem là lặp khi xuất hiện từ 2 lần trở lên. Kết quả lưu:

```ts
{
  pair: string,
  count: number,
  consecutive: boolean,
  indexes: number[]
}
```

- `count`: số lần xuất hiện.
- `indexes`: vị trí trong mảng cặp, bắt đầu từ `0`.
- `consecutive`: `true` nếu có ít nhất hai lần xuất hiện ở các vị trí liên tiếp.
- `repeatedCount` dùng trong công thức điểm là số cặp **khác nhau** bị lặp (`repeatedPairs.length`), không phải tổng số lần lặp.

Ví dụ `66 – 66 – 66` tạo một mục lặp `66` với `count = 3`, `consecutive = true`.

## 7. Quy tắc `00` phủ định

Với mỗi cặp `00`:

- Nếu `00` không ở vị trí đầu tiên, cặp ngay trước nó được đánh dấu `isNegatedBy00 = true`.
- Nếu `00` ở vị trí đầu tiên, không có cặp đứng trước để phủ định.
- Nhiều cặp `00` được xử lý độc lập theo vị trí.

Hệ quả:

- Cặp bị phủ định bị loại khỏi tập `active`.
- Cặp bị phủ định không đóng góp trọng số vào điểm.
- Cặp bị phủ định không được tính vào `positiveCount` hoặc `negativeCount`.
- Mỗi cặp bị phủ định tạo penalty `-2` trong điểm.
- `warnings` được thêm cảnh báo:
  `00 phủ định X cặp đứng trước`.

Ví dụ:

```text
... – 60 – 00 – 01
```

Trong đó `60` bị phủ định; `00` không có điểm; `01` vẫn được phân tích bình thường.

## 8. Tổng chữ số và meaning của tổng

Engine cộng toàn bộ chữ số của số điện thoại, bao gồm cả `0`:

```text
digitSum = d1 + d2 + ... + dn
```

Nếu `digitSum` nằm trong khoảng `1–99`, tổng được chuyển thành mã hai chữ số để tra bảng:

```text
1  → "01"
9  → "09"
44 → "44"
```

Nếu tổng bằng `0` hoặc lớn hơn `99`, `totalMeaning` là `undefined` và giao diện hiển thị `Không có dữ liệu trong bảng.`.

Lưu ý: tổng chữ số chỉ dùng để tra meaning/điều chỉnh điểm; engine không rút gọn tiếp về một chữ số.

## 9. Phân loại sentiment và trọng số cặp

Việc gán sentiment được thực hiện theo thứ tự: `strongPositive`, `positive`, `strongNegative`, `negative`; cặp không nằm trong các nhóm là `neutral` với trọng số `0`.

### 9.1. Nhóm cặp thông thường

| Nhóm | Sentiment | Trọng số | Mã cặp |
| --- | --- | ---: | --- |
| `strongPositive` | positive | `+10` | `08, 18, 33, 48, 61, 66, 68, 83, 86, 89, 91, 96, 98` |
| `positive` | positive | `+5` | `06, 13, 17, 19, 21, 23, 29, 32, 41, 42, 44, 46, 56, 62, 64, 65, 73, 84, 94, 99` |
| `strongNegative` | negative | `-10` | `05, 10, 20, 31, 37, 39, 43, 45, 47, 50, 51, 54, 57, 58, 59, 60, 71, 74, 75, 78, 80, 81, 85, 87, 95, 97` |
| `negative` | negative | `-4` | `02, 03, 07, 12, 16, 22, 24, 27, 28, 30, 34, 35, 49, 52, 53, 67, 69, 70, 72, 76, 77, 79, 82, 88, 90, 92, 93` |

`00` luôn là `neutral`, trọng số `0`, bất kể nó không thuộc các nhóm trên.

## 10. Trọng số meaning của tổng chữ số

Khi mã tổng chữ số thuộc một nhóm dưới đây, engine cộng thêm điều chỉnh riêng. Các nhóm này độc lập với trọng số cặp thông thường.

| Nhóm meaning tổng | Điều chỉnh | Mã tổng |
| --- | ---: | --- |
| `strongPositive` | `+12` | `08, 18, 33, 41, 42, 48, 61, 66, 68, 83, 84, 86, 89, 91, 94, 96, 98` |
| `positive` | `+6` | `06, 13, 17, 19, 21, 23, 29, 32, 44, 46, 56, 62, 64, 65, 73, 99` |
| `strongNegative` | `-12` | `05, 10, 20, 31, 37, 39, 43, 45, 47, 50, 51, 54, 57, 58, 59, 60, 71, 74, 75, 78, 80, 81, 85, 87, 95, 97` |
| `negative` | `-6` | `02, 03, 07, 12, 16, 22, 24, 27, 28, 30, 34, 35, 49, 52, 53, 67, 69, 70, 72, 76, 77, 79, 82, 88, 90, 92, 93` |

## 11. Công thức điểm

Tập `active` gồm các cặp thỏa cả hai điều kiện:

- `pair !== "00"`;
- `isNegatedBy00 === false`.

Đặt:

```text
raw              = tổng trọng số của các cặp active
totalAdjustment  = điều chỉnh meaning của tổng chữ số, hoặc 0
repeatBonus      = min(repeatedCount × 2, 8), hoặc 0 nếu không có cặp lặp
negationPenalty  = số cặp bị 00 phủ định × 2
```

Công thức thực thi:

```text
score = clamp(
  round(50 + raw + totalAdjustment + repeatBonus - negationPenalty),
  0,
  100
)
```

Trong đó `clamp` giới hạn điểm trong `0–100`.

### Rating

| Khoảng điểm | Rating |
| ---: | --- |
| `80–100` | `Rất nổi bật` |
| `65–79` | `Tích cực` |
| `50–64` | `Cân bằng` |
| `35–49` | `Cần cân nhắc` |
| `0–34` | `Nhiều cảnh báo` |

## 12. Strengths, warnings và bộ đếm

### Strengths

- Chỉ xét cặp active có sentiment `positive`.
- Sắp xếp trọng số giảm dần.
- Chỉ lấy tối đa 3 mục.
- Mỗi mục có dạng: `mã cặp: meaning`.

### Warnings

- Chỉ xét cặp active có sentiment `negative`.
- Sắp xếp từ trọng số nhỏ đến lớn, để cảnh báo `-10` đứng trước `-4`.
- Chỉ lấy tối đa 3 mục.
- Nếu có cặp bị `00` phủ định, thêm cảnh báo tổng quát ở đầu danh sách.

### Bộ đếm

- `positiveCount`: số cặp positive không bị `00` phủ định.
- `negativeCount`: số cặp negative không bị `00` phủ định.
- Cặp neutral và cặp `00` không làm tăng hai bộ đếm này.

## 13. Cấu trúc kết quả engine

Kết quả hợp lệ gồm các trường chính:

```ts
{
  phoneNumber,
  pairs,
  digitSum,
  totalMeaning?,
  repeatedPairs,
  negatedPairs,
  score,
  rating,
  positiveCount,
  negativeCount,
  strengths,
  warnings,
  valid: true
}
```

Mỗi phần tử `pairs` có:

```ts
{
  pair,
  meaning,
  index,
  isRepeated,
  isConsecutiveRepeat,
  isNegatedBy00,
  sentiment,
  weight
}
```

## 14. Phân tích danh sách và xếp hạng trong ứng dụng

Đây là hành vi của phần upload/ranking, dùng cùng `analyzePhoneNumber()`:

1. TXT/CSV được tách theo dòng và các dấu phân cách `;`, `,`, `|`, tab.
2. XLS/XLSX được đọc tất cả sheet và cell trên trình duyệt.
3. Mỗi giá trị được validate riêng; dòng/cell không hợp lệ vẫn được giữ lại để hiển thị.
4. Chỉ các số hợp lệ được đưa vào engine.
5. Xếp hạng ban đầu theo điểm giảm dần.
6. Nếu bằng điểm, số có `totalMeaning` được ưu tiên hơn số không có.
7. Nếu vẫn bằng nhau, thứ tự ban đầu được giữ ổn định.
8. Bảng giao diện hiển thị tối đa 10 kết quả sau bộ lọc.

Các bộ lọc theo meaning dùng tìm chuỗi trong meaning của toàn bộ cặp:

| Bộ lọc | Từ khóa code dùng |
| --- | --- |
| Tài chính | `tiền`, `tài chánh`, `tài chính`, `thu nhập`, `giàu` |
| Nghề nghiệp | `nghề nghiệp`, `công việc`, `học vấn` |
| Tình cảm | `tình cảm`, `thương`, `yêu`, `lãng mạn`, `duyên` |
| Cơ hội | `cơ hội` |
| Lãnh đạo | `lãnh đạo`, `quyền lực` |
| Giữ tiền | `giữ được tiền`, `giữ tiền` |
| Điểm cao nhất | `score >= 75` |

Các lựa chọn sắp xếp trên giao diện:

- Điểm cao → thấp;
- Điểm thấp → cao;
- Tổng chữ số tăng dần;
- Số điện thoại theo thứ tự chuỗi.

## 15. Ranh giới của Gemini

Gemini chỉ được gọi khi người dùng chủ động bấm nút “Luận thêm với Gemini”. Prompt của route yêu cầu:

- Chỉ diễn giải dữ liệu engine đã cung cấp.
- Không tra Internet và không dùng meaning bên ngoài bảng.
- Không tự tạo hoặc sửa meaning.
- Không thay đổi `score`, `rating`, `digitSum` hay kết quả engine.
- Không khẳng định tương lai chắc chắn; dùng ngôn ngữ tham khảo.
- Giữ nguyên meaning khi nhắc lại.
- Trình bày tóm tắt, điểm mạnh, điểm cần lưu ý, các lĩnh vực liên quan, cặp lặp/quy tắc `00` và kết luận.
- Toàn bộ phần luận thêm tối đa 450 từ.

Vì vậy, Gemini là lớp diễn giải ngôn ngữ phía trên; nó không phải bộ phận chấm điểm hay quyết định số đứng đầu.

## 16. Các ví dụ được kiểm thử trong code

### `0366664670`

```text
Cặp:       36 – 66 – 66 – 66 – 64 – 46 – 67 – 70 – 00
Tổng:      44
Meaning:   44 → Lãng mạn
Cặp lặp:   66 xuất hiện 3 lần liên tiếp
```

### `0984612963`

```text
Cặp:       98 – 84 – 46 – 61 – 12 – 29 – 96 – 63 – 03
Tổng:      48
Meaning:   48 → Được nhận tiền từ người mình thương
```

### `0372036001`

```text
Cặp:       37 – 72 – 20 – 03 – 36 – 60 – 00 – 01 – 01
Quy tắc:   00 phủ định cặp 60
```

### `0986995916`

```text
Cặp:       98 – 86 – 69 – 99 – 95 – 59 – 91 – 16 – 06
Tổng:      62
```

## 17. Bảng meaning 01–99 được engine sử dụng

| Mã | Meaning |
| --- | --- |
| 01 | Nghề nghiệp |
| 02 | Lo lắng tài chánh |
| 03 | Bất đồng ý kiến |
| 04 | Tình cảm |
| 05 | Vận rủi |
| 06 | Cơ hội |
| 07 | Xung đột |
| 08 | Tiền tài |
| 09 | Khuyết đại cho số sau |
| 10 | Không tốt |
| 11 | Hai công việc đồng thời, lệ thuộc phía sau tốt hay không |
| 12 | Đường nghề nghiệp khó khăn, tự thân lập nghiệp |
| 13 | Lẹ làng khôn khéo |
| 14 | Có tâm hướng thượng |
| 15 | Vận rủi |
| 16 | Tự thân lập nghiệp trắc trở |
| 17 | Khôn khéo trực tính |
| 18 | Nghề nghiệp sinh tiền tài - nghị lực lớn |
| 19 | Nói năng ôn tồn, quyết đoán bản lĩnh, lãnh đạo |
| 20 | Lo lắng rất ngặt, rồi mất hết |
| 21 | Lanh lợi, lẹ làng, nhạy bén, đối tác yêu thương chân tình |
| 22 | Người giỏi gian khôn khéo, trí tuệ. Nhưng hay lo lắng tài chánh. Sự thể hiện chưa sáng suốt |
| 23 | Năng nổ, nhiệt tình, thông minh |
| 24 | Lo lắng tình cảm, nói năng ôn tồn |
| 25 | Nói năng ôn tồn, kỹ lưỡng tiền bạc. Nhưng sẵn sàng chi |
| 26 | Người xài không hạ tiện, không phung phí. Nhưng nếu cho cá nhân thì hơi phung phí |
| 27 | (Nam) đảm đang, nhưng hay cằn nhằn, trực tính |
| 28 | Lo lắng dễ giận hờn, nhưng có tài chánh |
| 29 | Vượt lên |
| 30 | Bất đồng rồi phải chịu thua |
| 31 | Bỏ ngang nửa chừng sụp đổ |
| 32 | Duyên dáng |
| 33 | Lãnh đạo |
| 34 | Xung đột tình cảm người thân sát bên mình, người nữ thì nắm quyền trong tay |
| 35 | Lòng dạ ngổn ngang, tâm rối bời |
| 36 | Đào hoa |
| 37 | Tâm tráo trở, phản nghịch |
| 38 | Phước, tai họa đều qua |
| 39 | Bị bạc đãi |
| 40 | Tâm hướng thượng -> cô độc-> xã hội tốt-> gia đình xấu |
| 41 | Có khả năng thuyết phục |
| 42 | Được thương chân tình (chân thành) |
| 43 | Bị thiệt, bị áp bức dưới cơ |
| 44 | Lãng mạn |
| 45 | Trắc trở tình duyên |
| 46 | Được người khác phái ngưỡng mộ |
| 47 | Xung đột tình cảm có thể chia tay – đồng sàng dị mộng |
| 48 | Được nhận tiền từ người mình thương |
| 49 | Quân tử được lòng - có một người trong nhà không hài lòng |
| 50 | Vận rủi bất ngờ -> sụp đổ -> nợ nần |
| 51 | Công việc trở ngại có thể sụp đổ |
| 52 | Dễ giận hờn, thích tâm sự, ít bằng lòng ai |
| 53 | Bị liên lụy bởi việc xui của người thân |
| 54 | Ly dị 10% - tang 10% - bị trù dập (Tu sĩ) |
| 55 | Kỹ lưỡng nguyên tắc |
| 56 | Tiền hung hậu kiết |
| 57 | Bị chỉ trích, bị hại ngầm |
| 58 | Hao tiền, thất thoát |
| 59 | Vận rủi |
| 60 | Cơ hội vượt mất |
| 61 | Cơ hội tốt đẹp trong nghề nghiệp |
| 62 | Đi nhiều nơi |
| 63 | Tâm hướng thượng, thích làm thiện cụ thể, tính cáu gắt |
| 64 | Sự cố học vấn, cơ hội tình yêu |
| 65 | Công việc hậu hung tiền cát |
| 66 | Thu nhập và giữ tiền tốt |
| 67 | Nói nhiều |
| 68 | Giữ được tiền |
| 69 | Cơ hội lệ thuộc số sau |
| 70 | Bị công kích nhưng nhận cho êm |
| 71 | Bất đồng trong nghề nghiệp lớn -> ra đi |
| 72 | Vất vả, buồn phiền, đời sống gió |
| 73 | Người có vị thế, lãng mạn, bị chỉ trích |
| 74 | Xung đột tình cảm có thể chia tay – đồng sàng dị mộng |
| 75 | Buồn phiền tài chánh hao hụt |
| 76 | Mẫu người hoạt bát, chủ quan, bảo thủ |
| 77 | Nói năng nhỏ nhẹ, nhưng cộc tánh |
| 78 | Thất thoát tài chánh |
| 79 | Bất đồng gia đình, thân tộc |
| 80 | Công việc đình trệ, buồn phiền âu lo, thân tình rạng nứt, mất mát người thân =>vượt lên tiền tài bất ngờ |
| 81 | Bị người hạ ngầm, vu khống, buồn giận, bị hạ nhục |
| 82 | Người thẳng thắn, trung thực, không tích lũy tiền được |
| 83 | Quyền lực |
| 84 | Được thương chân tình (chân thành) |
| 85 | Thất thoát tiền bạc |
| 86 | Giữ được tiền |
| 87 | Không giữ được tiền |
| 88 | Ban đầu không tốt |
| 89 | Giữ được tiền, cơ hội tiền tài, được hưởng đức từ người khác |
| 90 | Cơ hội tốt bị vuột, thay đổi việc làm |
| 91 | Nghề nghiệp thăng tiến |
| 92 | Lãnh đạo quyết đoán, nhưng có người chống đối |
| 93 | Lãnh đạo quyết đoán, nhưng có người chống đối |
| 94 | Người yêu mến, ngưỡng mộ |
| 95 | tai nạn |
| 96 | Cơ hội cực lớn |
| 97 | chu kỳ giữa - xung đột dữ dội |
| 98 | Cực giàu |
| 99 | Khởi tâm tham vọng |
