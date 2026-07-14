export class AIError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AIError";
  }
}

export function handleOpenAIError(error: any): AIError {
  // Rate Limit
  if (error?.status === 429) {
    return new AIError(
      "ระบบ AI ของร้านไม่ว่าง กรุณาลองใหม่ในอีกสักครู่",
      "RATE_LIMIT",
      429,
    );
  }

  // Invalid API Key
  if (error?.status === 401) {
    return new AIError(
      "การเชื่อมต่อ AI มีปัญหา กรุณาติดต่อผู้ดูแลระบบร้าน",
      "AUTH_ERROR",
      500,
    );
  }

  // Context Too Long
  if (error?.code === "context_length_exceeded") {
    return new AIError(
      "ข้อมูลสินค้า/FAQ มากเกินไป กรุณาถามคำถามให้เจาะจงขึ้น",
      "CONTEXT_TOO_LONG",
      400,
    );
  }

  // Generic Error
  return new AIError(
    "เกิดข้อผิดพลาดภายในระบบร้าน กรุณาลองใหม่อีกครั้ง",
    "INTERNAL_ERROR",
    500,
  );
}
