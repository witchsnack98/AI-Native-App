import { buildContext } from "@/lib/context-builder";

async function main() {
  const mockDocuments = [
    {
      id: "1",
      content: "วิธีการสั่งซื้อสินค้า? คุณสามารถสั่งซื้อผ่านเว็บไซต์...",
      metadata: { source: "CustomerFAQ.pdf" },
      similarity: 0.82,
    },
    {
      id: "2",
      content: "นโยบายการคืนสินค้า? ลูกค้าสามารถคืนสินค้าได้ภายใน 7 วัน...",
      metadata: { source: "CustomerFAQ.pdf" },
      similarity: 0.75,
    },
    {
      id: "3",
      content: "เวลาทำการของร้าน? ร้านเปิดทุกวันจันทร์-ศุกร์ 9.00-18.00 น.",
      metadata: { source: "CustomerFAQ.pdf" },
      similarity: 0.65,
    },
  ];

  const context = buildContext(mockDocuments, {
    maxTokens: 100,
    minSimilarity: 0.7,
    maxDocuments: 2,
  });

  console.log("Generated Context:\n", context);
}

main().catch(console.error);
