import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Thinking is disabled because this feature needs a complete, readable
// interpretation rather than hidden reasoning consuming the output budget.
const MODELS = ["gemini-2.5-flash", "gemini-3.5-flash"];
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Chưa cấu hình GEMINI_API_KEY trên server." }, { status: 503 });
  }

  try {
    const body = await request.json() as { analysis?: unknown };
    if (!body.analysis || typeof body.analysis !== "object") {
      return NextResponse.json({ error: "Thiếu dữ liệu phân tích." }, { status: 400 });
    }

    const analysis = body.analysis as Record<string, unknown>;
    const prompt = `Bạn là trợ lý diễn giải dữ liệu cho PHONE MEANING ANALYZER.

Nhiệm vụ: viết một bản "luận thêm" bằng tiếng Việt, dễ đọc và trung lập, dựa CHỈ trên dữ liệu phân tích được cung cấp bên dưới.

Quy tắc bắt buộc:
- Không tra cứu Internet, không dùng phong thủy/numerology bên ngoài.
- Không tự tạo, sửa hoặc suy diễn meaning mới.
- Giữ nguyên meaning của từng cặp khi nhắc lại.
- Không thay đổi score, rating, digitSum hoặc kết quả của engine.
- Không khẳng định tương lai chắc chắn; dùng ngôn ngữ tham khảo.
- Nếu dữ liệu không có meaning, nói rõ "Không có dữ liệu trong bảng."

Trình bày bằng các mục:
1. Tóm tắt nhanh
2. Điểm mạnh nổi bật (dẫn mã cặp và meaning)
3. Điểm cần lưu ý (dẫn mã cặp và meaning)
4. Tài chính, nghề nghiệp và tình cảm (chỉ nói khi dữ liệu liên quan)
5. Cặp lặp và quy tắc 00
6. Kết luận tham khảo trong 2–3 câu

Giới hạn toàn bộ câu trả lời tối đa 450 từ. Viết đủ câu, không dừng giữa chừng.

Dữ liệu engine:
${JSON.stringify({
  phoneNumber: analysis.phoneNumber,
  pairs: analysis.pairs,
  digitSum: analysis.digitSum,
  totalMeaning: analysis.totalMeaning,
  repeatedPairs: analysis.repeatedPairs,
  negatedPairs: analysis.negatedPairs,
  score: analysis.score,
  rating: analysis.rating,
  strengths: analysis.strengths,
  warnings: analysis.warnings
}, null, 2)}`;

    let lastStatus = 503;
    let lastMessage = "Gemini đang quá tải tạm thời.";
    for (const model of MODELS) {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        if (attempt > 0) await sleep(500 * 2 ** (attempt - 1));
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 2000,
              thinkingConfig: { thinkingBudget: 0 }
            }
          }),
          signal: AbortSignal.timeout(20_000)
        });
        const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>; error?: { message?: string } };
        if (response.ok) {
          const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
          if (text) return NextResponse.json({ text, model });
          lastStatus = 502;
          lastMessage = "Gemini trả về nội dung trống.";
          break;
        }
        lastStatus = response.status;
        lastMessage = payload.error?.message ?? "Gemini không thể trả lời lúc này.";
        if (!RETRYABLE_STATUS.has(response.status)) break;
      }
    }
    return NextResponse.json({
      error: lastStatus === 503 || lastStatus === 429
        ? "Gemini đang quá tải. Ứng dụng đã thử model dự phòng; vui lòng bấm lại sau ít phút."
        : lastMessage
    }, { status: lastStatus });
  } catch {
    return NextResponse.json({ error: "Không thể kết nối Gemini. Vui lòng thử lại." }, { status: 500 });
  }
}
