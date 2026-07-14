## Next.js 16: The AI-Native Developer Masterclass - Day 6

### การสร้างฐานความรู้ AI ด้วย Vector Database และ Ingestion Pipeline

1. [Section 1: Embeddings Fundamentals](#section-1-embeddings-fundamentals)
    - ทำความเข้าใจ Text Embeddings คืออะไร
    - การแปลงข้อความเป็นเวกเตอร์ตัวเลข
    - Cosine Similarity และการค้นหาเชิงความหมาย

2. [Section 2: pgVector on Neon](#section-2-pgvector-on-neon)
    - การตั้งค่า Extension pgVector
    - การสร้างตารางเก็บข้อมูล Vector
    - การเขียน SQL Query สำหรับ Similarity Search

3. [Section 3: Document Processing](#section-3-document-processing)
    - Document Loader สำหรับ TXT, CSV และ PDF
    - Text Splitting: การแบ่งข้อความเป็น Chunks
    - Chunking Strategies

4. [Section 4: Ingestion Pipeline](#section-4-ingestion-pipeline)
    - สร้าง Script อัตโนมัติสำหรับ Ingestion
    - การแปลง Chunks เป็น Embeddings ด้วย OpenAI
    - การบันทึก Embeddings ลงใน pgVector
    - Workshop: นำเอกสารองค์กรเข้าสู่ Vector Database

5. [Section 5: Similarity Search & Testing](#section-5-similarity-search--testing)
    - การเขียน Query เพื่อค้นหาข้อมูลจากความหมาย
    - ทดสอบ Similarity Search ด้วย Prisma
    - Workshop: สร้าง API Endpoint สำหรับ Search

---

### Section 1: Embeddings Fundamentals

#### 1.1 Embeddings คืออะไร?

**Embeddings คืออะไร?**
- Embeddings คือการแปลงข้อความให้เป็นตัวเลข (Vector) ที่สามารถเปรียบเทียบความคล้ายคลึงกันได้
- ใช้ในการค้นหาข้อมูลที่มีความหมายใกล้เคียงกัน (Semantic Search)
- OpenAI ใช้โมเดล `text-embedding-3-small` หรือ `text-embedding-3-large` ที่ให้เวกเตอร์ขนาด 1536 dimensions

**Embeddings** คือการแปลงข้อความ (Text) ให้เป็นเวกเตอร์ตัวเลข (Numerical Vector) ที่สามารถเปรียบเทียบความหมายได้ ตัวอย่างเช่น:

```
"แมวกินปลา" → [0.021, -0.034, 0.087, 0.015, ...]  (1536 dimensions)
"หมากินข้าว" → [0.019, -0.032, 0.091, 0.013, ...]  (1536 dimensions)
"รถยนต์วิ่งเร็ว" → [0.145, 0.067, -0.023, 0.198, ...]  (1536 dimensions)
```

> **สังเกต:** ข้อความที่มีความหมายคล้ายกัน จะมีค่าเวกเตอร์ที่ใกล้เคียงกัน ส่วนข้อความที่มีความหมายต่างกัน จะมีค่าเวกเตอร์ที่ห่างกัน

#### 1.2 ทำไมต้องใช้ Embeddings?

ในระบบ Search แบบดั้งเดิม จะค้นหาด้วย **keyword matching** เช่น:
- ค้นหา "แมว" → หาคำว่า "แมว" ในเอกสาร
- ปัญหา: ถ้าเอกสารเขียนว่า "สัตว์เลี้ยงตัวเล็ก" จะหาไม่เจอ

ในระบบ **Semantic Search** ด้วย Embeddings:
- ค้นหา "แมว" → แปลงเป็นเวกเตอร์ → เปรียบเทียบกับเวกเตอร์ของเอกสาร
- ข้อดี: หาเจอแม้ใช้คำต่างกันแต่ความหมายเหมือนกัน

#### 1.3 Cosine Similarity

**Cosine Similarity** คือวิธีการวัดความเหมือนระหว่างเวกเตอร์ 2 ตัว:

- ค่า **1.0** = เหมือนกันมาก (ทิศทางเดียวกัน)
- ค่า **0.0** = ไม่เกี่ยวข้องกัน (ตั้งฉากกัน)
- ค่า **-1.0** = ตรงข้ามกัน (คนละทิศ)

```
similarity("แมวกินปลา", "หมากินข้าว") ≈ 0.85  (คล้ายกันมาก)
similarity("แมวกินปลา", "รถยนต์วิ่งเร็ว") ≈ 0.12  (ไม่เกี่ยวข้อง)
```

#### 1.4 ตัวอย่างการสร้าง Embeddings ด้วย OpenAI

#### 1.4.1 ติดตั้ง Dependencies สำหรับ Day 6

```bash
pnpm install openai pdf-parse csv-parse
pnpm install -D @types/pdf-parse
```

#### 1.4.2 เพิ่ม Environment Variables

เพิ่มใน `.env`:
```env
# OpenAI API Key
OPENAI_API_KEY="sk-your-openai-api-key"

# Embedding Model
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
```

#### 1.4.3 สร้าง OpenAI Client และฟังก์ชันสร้าง Embedding

สร้างไฟล์ `lib/openai.ts`:

```typescript
import OpenAI from "openai"

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ฟังก์ชันสร้าง Embedding จากข้อความ
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    input: text,
  })

  return response.data[0].embedding
}
```

**ทดสอบการสร้าง Embedding:**
สร้างไฟล์ `scripts/test-embedding.ts`:

```typescript
import { generateEmbedding } from "../lib/openai"

async function main() {
  const embedding = await generateEmbedding("สวัสดีครับ นี่คือตัวอย่างข้อความ")
  console.log(`Dimensions: ${embedding.length}`)  // 1536
  console.log(`First 5 values: ${embedding.slice(0, 5)}`)
}

main().catch(console.error)

```

รันสคริปต์:

```bash
npx tsx --env-file=.env scripts/test-embedding.ts
```

ผลลัพธ์:
```
Dimensions: 1536
First 5 values: [0.021, -0.034, 0.087, 0.015, ...]
```

---

### Section 2: pgVector on Neon

**Vector Store คืออะไร?**
- ฐานข้อมูลที่ออกแบบมาเพื่อเก็บและค้นหา Vector
- รองรับการค้นหาแบบ Similarity Search
- ตัวอย่าง: Neon Serverless Postgres (pgVector), Pinecone, Weaviate, Chroma

#### 2.1 การตั้งค่า Neon Serverless Postgres pgVector

pgVector เป็น Extension ของ PostgreSQL ที่รองรับการเก็บและค้นหาข้อมูลเวกเตอร์ Neon รองรับ pgVector มาตั้งแต่ต้น

**เปิดใช้งานผ่าน SQL:**

ไปที่ Neon Console → SQL Editor → รันคำสั่ง:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 2.2 อัปเดต Prisma Schema เพิ่มตาราง Document

เพิ่มโมเดล `Document` ใน `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  previewFeatures = ["postgresqlExtensions"]
  output   = "../app/generated/prisma"
}

datasource db {
  provider = "postgresql"
  extensions = [pgvector(map: "vector")]
}

model Document {
  id        String   @id @default(cuid())
  content   String   // เนื้อหาข้อความ
  metadata  Json?    // ข้อมูลเพิ่มเติม (เช่น ชื่อไฟล์, หน้า)
  embedding Unsupported("vector(1536)")? // เวกเตอร์จาก OpenAI (1536 มิติ)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("document")
}
```

#### 2.3 สร้างตาราง Vector และ Index ใน Neon

หลังจาก migrate schema แล้ว ให้รัน SQL เพิ่มเติม:

```bash
# รันคำสั่ง migrate เพื่อสร้างตาราง document
npx prisma migrate dev --name add_document_table

# หรือถ้าไม่ต้องการใช้ migration สามารถรันคำสั่ง db push ได้เลย
npx prisma db push

# รันคำสั่ง generate เพื่ออัปเดต Prisma Client
npx prisma generate
```

จากนั้นไปที่ Neon SQL Editor รัน:

```sql
-- สร้าง Index สำหรับ Similarity Search (IVFFlat)
CREATE INDEX IF NOT EXISTS document_embedding_idx
ON document
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

> **อธิบาย:**
> - `vector(1536)` — ขนาดเวกเตอร์ 1536 dimensions (สำหรับ OpenAI text-embedding-3-small)
> - `ivfflat` — วิธีการสร้าง Index แบบ Inverted File Flat ที่มีประสิทธิภาพ
> - `vector_cosine_ops` — ใช้ Cosine Distance สำหรับการค้นหา

#### 2.4 ทดสอบ pgVector ด้วย SQL

```sql
-- ตรวจสอบว่า extension ถูกติดตั้งแล้ว
SELECT * FROM pg_extension WHERE extname = 'vector';

-- ตรวจสอบว่าตาราง document มีคอลัมน์ embedding
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'document';
```

---

### Section 3: Document Processing

#### 3.1 Document Loader

**Document Loader คืออะไร?** 
Document Loader คือ utility ที่ช่วยในการโหลดเอกสารจากไฟล์ต่างๆ เช่น PDF หรือ TXT และแปลงเป็นข้อความพร้อม metadata 

เราจะสร้าง utility ที่สามารถอ่านไฟล์ TXT, CSV และ PDF ได้ โดยใช้ `pdf-parse` สำหรับ PDF และ `csv-parse` สำหรับ CSV

สร้างไฟล์ `lib/document-loader.ts`:

```typescript
import fs from "fs"
import path from "path"
import { PDFParse } from "pdf-parse"
import { parse as csvParse } from "csv-parse/sync"

export interface LoadedDocument {
  content: string
  metadata: {
    source: string
    type: string
    pages?: number
  }
}

// อ่านไฟล์ TXT
export async function loadTextFile(filePath: string): Promise<LoadedDocument> {
  const content = fs.readFileSync(filePath, "utf-8")
  return {
    content,
    metadata: {
      source: path.basename(filePath),
      type: "txt",
    },
  }
}

// อ่านไฟล์ CSV — แปลงแต่ละ row เป็นข้อความภาษาธรรมชาติเพื่อให้ semantic search ทำงานได้ดี
export async function loadCSVFile(filePath: string): Promise<LoadedDocument> {
  const content = fs.readFileSync(filePath, "utf-8")
  const records = csvParse(content, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]

  // แปลงแต่ละ row เป็นประโยคภาษาธรรมชาติ
  const naturalTextRows = records.map((row) => {
    return Object.entries(row)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ")
  })

  return {
    content: naturalTextRows.join("\n\n"),
    metadata: {
      source: path.basename(filePath),
      type: "csv",
    },
  }
}

// อ่านไฟล์ PDF
export async function loadPDFFile(filePath: string): Promise<LoadedDocument> {
  const dataBuffer = fs.readFileSync(filePath)
  
  // 1. ส่ง { data: Buffer } เข้าไปใน Constructor
  const parser = new PDFParse({ data: dataBuffer })
  
  try {
    // 2. ใช้ getText() เพื่อดึงเนื้อหาข้อความ
    const textResult = await parser.getText()
    
    // 3. ใช้ getInfo() เพื่อดึงจำนวนหน้า (ใน v2 จะเก็บใน property .total)
    const infoResult = await parser.getInfo()

    return {
      content: textResult.text,
      metadata: {
        source: path.basename(filePath),
        type: "pdf",
        pages: infoResult.total, // เปลี่ยนจาก numpages เป็น total
      },
    }
  } catch (error) {
    console.error("Error parsing PDF:", error)
    throw error
  } finally {
    // 4. สำคัญมากใน v2: ต้องเรียก destroy() เสมอเพื่อคืนหน่วยความจำ
    await parser.destroy()
  }
}

// อ่านไฟล์อัตโนมัติตาม extension
export async function loadDocument(filePath: string): Promise<LoadedDocument> {
  const ext = path.extname(filePath).toLowerCase()

  switch (ext) {
    case ".txt":
        return loadTextFile(filePath)
    case ".csv":
        return loadCSVFile(filePath)
    case ".pdf":
      return loadPDFFile(filePath)
    default:
      throw new Error(`Unsupported file type: ${ext}`)
  }
}
```

**ทดสอบ Document Loader:**

สร้างไฟล์ `scripts/test-loader.ts`:

```typescript
import { loadDocument } from "@/lib/document-loader"
import path from "path"

const files = [
  "documents/shop_info.txt",
  "documents/sample_product.csv",
  "documents/CustomerFAQ.pdf",
]

async function main() {
  for (const file of files) {
    const docPath = path.join(process.cwd(), file)
    console.log(`\n${"=".repeat(50)}`)
    console.log(`Loading: ${file}`)
    console.log("=".repeat(50))

    const document = await loadDocument(docPath)
    console.log(`Source: ${document.metadata.source}`)
    console.log(`Type: ${document.metadata.type}`)
    console.log(`Pages: ${document.metadata.pages || "N/A"}`)
    console.log(`Content Preview: ${document.content.slice(0, 200)}...`)
  }
}

main().catch(console.error)
```
รันสคริปต์:

```bash
npx tsx --env-file=.env scripts/test-loader.ts
```

ผลลัพธ์:
```
==================================================
Loading: documents/shop_info.txt
Source: shop_info.txt
Type: txt
Content Preview: ร้านค้าของเรามีสินค้าหลากหลายประเภท เช่น เสื้อผ้า รองเท้า และอุปกรณ์อิเล็กทรอนิกส์...
==================================================
Loading: documents/sample_product.csv
Source: sample_product.csv
Type: csv
Content Preview: [{"id":"1","name":"เสื้อยืด","price":"199"},{"id":"2","name":"กางเกงยีนส์","price":"499"},{"id":"3","name":"รองเท้าผ้าใบ","price":"899"}]...
==================================================
Loading: documents/CustomerFAQ.pdf
Source: CustomerFAQ.pdf
Type: pdf
Pages: 5
Content Preview: Q: วิธีการสั่งซื้อสินค้า? A: คุณสามารถสั่งซื้อ
ผ่านเว็บไซต์ของเราได้โดยการเลือกสินค้าที่ต้องการและกดปุ่ม "สั่งซื้อ"...
```

#### 3.2 Text Splitting (Chunking)

เอกสารที่ยาวมากไม่สามารถส่งเป็น Embedding ทั้งก้อนได้ เราต้องแบ่งเป็น **Chunks** ย่อยๆ

สร้างไฟล์ `lib/text-splitter.ts`:

```typescript
export interface TextChunk {
  content: string
  metadata: {
    source: string
    chunkIndex: number
    totalChunks?: number
  }
}

export function splitTextIntoChunks(
  text: string,
  options: {
    chunkSize?: number     // ขนาด chunk (จำนวนตัวอักษร)
    chunkOverlap?: number  // ส่วนที่ซ้อนทับกัน
    source?: string        // ชื่อไฟล์ต้นทาง
  } = {}
): TextChunk[] {
  const {
    chunkSize = 1000,
    chunkOverlap = 200,
    source = "unknown",
  } = options

  const chunks: TextChunk[] = []

  // แบ่งตามย่อหน้าก่อน
  const paragraphs = text.split(/\n\s*\n/)
  let currentChunk = ""
  let chunkIndex = 0

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim()
    if (!trimmed) continue

    // ถ้าเพิ่มย่อหน้าใหม่แล้วเกิน chunkSize
    if (currentChunk.length + trimmed.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          source,
          chunkIndex,
        },
      })
      chunkIndex++

      // เก็บส่วน overlap
      const words = currentChunk.split(" ")
      const overlapWords = words.slice(-Math.floor(chunkOverlap / 5))
      currentChunk = overlapWords.join(" ") + "\n\n" + trimmed
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + trimmed
    }
  }

  // เพิ่ม chunk สุดท้าย
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      metadata: {
        source,
        chunkIndex,
      },
    })
  }

  // อัปเดต totalChunks
  return chunks.map((chunk) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      totalChunks: chunks.length,
    },
  }))
}
```

> **Best Practice สำหรับ Chunking:**
> - **chunkSize: 500-1500** ตัวอักษร — ไม่เล็กเกินไป (ขาด context) และไม่ใหญ่เกินไป (เสียค่า token)
> - **chunkOverlap: 100-300** ตัวอักษร — ให้ข้อมูลมีส่วนซ้อนทับ ป้องกันข้อมูลหลุด
> - แบ่งตาม **ย่อหน้า** หรือ **ประโยค** ดีกว่าแบ่งตาม **ตัวอักษร** ตรงๆ

**ทดสอบ Text Splitter:**
สร้างไฟล์ `scripts/test-splitter.ts`:

```typescript
import { loadDocument } from "@/lib/document-loader"
import path from "path"
import { splitTextIntoChunks } from "@/lib/text-splitter"

const files = [
  "documents/shop_info.txt",
  "documents/sample_product.csv",
  "documents/CustomerFAQ.pdf",
]

async function main() {
  for (const file of files) {
    const docPath = path.join(process.cwd(), file)
    console.log(`\n${"=".repeat(60)}`)
    console.log(`Loading: ${file}`)
    console.log("=".repeat(60))

    const document = await loadDocument(docPath)

    const chunks = splitTextIntoChunks(document.content, {
      chunkSize: 100,
      chunkOverlap: 20,
      source: document.metadata.source,
    })

    console.log(`Total Chunks: ${chunks.length}`)
    chunks.forEach((chunk, index) => {
      console.log(`\n--- Chunk ${index + 1} ---`)
      console.log(`Content: ${chunk.content}`)
      console.log(`Metadata: ${JSON.stringify(chunk.metadata)}`)
    })
  }
}

main().catch(console.error)
```
รันสคริปต์:

```bash
npx tsx --env-file=.env scripts/test-splitter.ts
```

ผลลัพธ์:
```
============================================================
Loading: documents/shop_info.txt
Total Chunks: 3
--- Chunk 1 ---
Content: ร้านค้าของเรามีสินค้าหลากหลายประเภท เช่น เสื้อผ้า รองเท้า และอุปกรณ์อิเล็กทรอนิกส์...
Metadata: {"source":"shop_info.txt","chunkIndex":0,"totalChunks":3}
--- Chunk 2 ---
Content: นอกจากนี้ เรายังมีบริการจัดส่งฟรีสำหรับคำสั่งซื้อที่มีมูลค่ามากกว่า 500 บาท และมีนโยบายคืนสินค้าภายใน 7 วัน...
Metadata: {"source":"shop_info.txt","chunkIndex":1,"totalChunks":3}
--- Chunk 3 ---
Content: หากคุณมีคำถามเพิ่มเติม สามารถติดต่อฝ่ายบริการลูกค้าของเราได้ที่เบอร์ 02-123-4567 หรืออีเมล
Metadata: {"source":"shop_info.txt","chunkIndex":2,"totalChunks":3}
============================================================
Loading: documents/sample_product.csv
Total Chunks: 1
--- Chunk 1 ---
Content: [{"id":"1","name":"เสื้อยืด","price":"199"},{"
id":"2","name":"กางเกงยีนส์","price":"499"},{"id":"3","name":"รองเท้าผ้าใบ","price":"899"}]...
Metadata: {"source":"sample_product.csv","chunkIndex":0,"totalChunks":1}
============================================================
Loading: documents/CustomerFAQ.pdf
Total Chunks: 5
--- Chunk 1 ---
Content: Q: วิธีการสั่งซื้อสินค้า? A: คุณสามารถสั่งซื้อผ่านเว็บไซต์ของเราได้โดยการเลือกสินค้าที่ต้องการและกดปุ่ม "สั่งซื้อ"...
Metadata: {"source":"CustomerFAQ.pdf","chunkIndex":0,"totalChunks":5}
--- Chunk 2 ---
Content: Q: นโยบายการคืนสินค้า? A: คุณสามารถคืนสินค้าได้ภายใน 7 วันหลังจากได้รับสินค้า โดยต้องอยู่ในสภาพเดิมและมีใบเสร็จรับเงิน...
Metadata: {"source":"CustomerFAQ.pdf","chunkIndex":1,"totalChunks":5}
--- Chunk 3 ---
Content: Q: มีบริการจัดส่งฟรีหรือไม่? A: เรามีบริการจัดส่งฟรีสำหรับคำสั่งซื้อที่มีมูลค่ามากกว่า 500 บาท...
Metadata: {"source":"CustomerFAQ.pdf","chunkIndex":2,"totalChunks":5}
--- Chunk 4 ---
Content: Q: วิธีการติดต่อฝ่ายบริการลูกค้า? A: คุณสามารถติดต่อฝ่ายบริการลูกค้าของเราได้ที่เบอร์ 02-123-4567 หรืออีเมล
Metadata: {"source":"CustomerFAQ.pdf","chunkIndex":3,"totalChunks":5} 
--- Chunk 5 ---
Content: Q: เวลาทำการของร้านค้า? A: ร้านค้าของเราทำการทุกวันจันทร์ถึงศุกร์ เวลา 9:00 - 18:00 น. และวันเสาร์ เวลา 10:00 - 16:00 น....
Metadata: {"source":"CustomerFAQ.pdf","chunkIndex":4,"totalChunks":5}
```

---

### Section 4: Ingestion Pipeline

**Ingestion Pipeline คืออะไร?**

Ingestion Pipeline คือกระบวนการอัตโนมัติที่นำเอกสารต่างๆ เข้าสู่ระบบฐานข้อมูล โดยผ่านขั้นตอนการโหลดเอกสาร, แบ่งเป็น chunks, สร้าง embeddings และบันทึกลงในฐานข้อมูล ในรูปแบบที่พร้อมสำหรับการค้นหา ในภายหลัง เราจะสร้างสคริปต์ที่ทำงานทั้งหมดนี้โดยอัตโนมัติ

#### 4.1 สร้าง Ingestion Script

สร้างไฟล์ `scripts/ingest.ts`:

```typescript
import { prisma } from "@/lib/prisma"
import { generateEmbedding } from "@/lib/openai"
import { loadDocument } from "@/lib/document-loader"
import { splitTextIntoChunks } from "@/lib/text-splitter"
import path from "path"
import fs from "fs"

// Retry logic สำหรับ OpenAI rate limit (429)
async function generateEmbeddingWithRetry(
  text: string,
  maxRetries = 3
): Promise<number[]> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateEmbedding(text)
    } catch (error: any) {
      // หมดเครดิต — ไม่มีประโยชน์ retry
      if (error?.code === "insufficient_quota") {
        console.error("\n❌ OpenAI API หมดเครดิต!")
        console.error("   กรุณาเติมเงินที่: https://platform.openai.com/settings/billing")
        process.exit(1)
      }

      // Rate limit — รอแล้ว retry
      if (error?.status === 429 && attempt < maxRetries) {
        const waitMs = 1000 * attempt * 2
        console.warn(`   ⏳ Rate limited — รอ ${waitMs / 1000} วินาที (attempt ${attempt}/${maxRetries})`)
        await new Promise((r) => setTimeout(r, waitMs))
        continue
      }

      throw error
    }
  }
  throw new Error("generateEmbedding failed after max retries")
}

async function ingestDocument(filePath: string) {
  console.log(`📄 กำลังอ่านไฟล์: ${filePath}`)

  // 1. อ่านเอกสาร
  const document = await loadDocument(filePath)
  console.log(`   ✅ อ่านเนื้อหาได้ ${document.content.length} ตัวอักษร`)

  // 2. แบ่งเป็น chunks
  const chunks = splitTextIntoChunks(document.content, {
    chunkSize: 300,
    chunkOverlap: 50,
    source: document.metadata.source,
  })
  console.log(`   📦 แบ่งได้ ${chunks.length} chunks`)

  // 3. สร้าง Embedding และบันทึกลง Database
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    console.log(`   🔄 Processing chunk ${i + 1}/${chunks.length}...`)

    // สร้าง Embedding (มี retry logic + quota check)
    const embedding = await generateEmbeddingWithRetry(chunk.content)

    // แปลง embedding array เป็น string format ที่ pgVector ต้องการ: [0.1, 0.2, ...]
    const embeddingStr = `[${embedding.join(",")}]`

    // บันทึกลง Database ด้วย Raw SQL (เพราะ Prisma ยังไม่รองรับ vector type)
    await prisma.$executeRaw`
      INSERT INTO document (id, content, metadata, embedding, "createdAt", "updatedAt")
      VALUES (
        ${`doc_${Date.now()}_${i}`},
        ${chunk.content},
        ${JSON.stringify(chunk.metadata)}::jsonb,
        ${embeddingStr}::vector,
        NOW(),
        NOW()
      )
    `

    // หน่วงเวลาเล็กน้อยเพื่อไม่ให้ถูก rate limit โดย OpenAI
    await new Promise((resolve) => setTimeout(resolve, 200))
  }

  console.log(`   ✅ บันทึกสำเร็จ!`)
}

async function main() {
  const docsDir = path.join(process.cwd(), "documents")

  // ตรวจสอบว่ามีโฟลเดอร์ documents หรือยัง
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true })
    console.log("📁 สร้างโฟลเดอร์ documents/ แล้ว")
    console.log("   กรุณาใส่ไฟล์ TXT, CSV หรือ PDF ในโฟลเดอร์นี้แล้วรันอีกครั้ง")
    return
  }

  // อ่านไฟล์ทั้งหมดในโฟลเดอร์ documents
  const files = fs.readdirSync(docsDir).filter((f) => {
    const ext = path.extname(f).toLowerCase()
    return ext === ".pdf" || ext === ".txt" || ext === ".csv"
  })

  if (files.length === 0) {
    console.log("❌ ไม่พบไฟล์ TXT, CSV หรือ PDF ในโฟลเดอร์ documents/")
    return
  }

  console.log(`🚀 เริ่มทำ Ingestion สำหรับ ${files.length} ไฟล์\n`)

  // ลบข้อมูลเก่าออกก่อน เพื่อป้องกันข้อมูลซ้ำเมื่อรันซ้ำ
  const deleted = await prisma.$executeRaw`DELETE FROM document`
  console.log(`🗑️  ลบข้อมูลเก่า ${deleted} รายการ\n`)

  for (const file of files) {
    const filePath = path.join(docsDir, file)
    await ingestDocument(filePath)
    console.log("")
  }

  console.log("🎉 Ingestion เสร็จสมบูรณ์!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

#### 4.2 การรัน Ingestion Script

1. สร้างโฟลเดอร์ `documents/` ที่ root ของโปรเจกต์
2. ใส่ไฟล์ TXT, CSV หรือ PDF ที่ต้องการนำเข้า
3. รัน script:

```bash
npx tsx --env-file=.env scripts/ingest.ts
```

ผลลัพธ์:
```
🚀 เริ่มทำ Ingestion สำหรับ 3 ไฟล์
🗑️  ลบข้อมูลเก่า 0 รายการ
📄 กำลังอ่านไฟล์: documents/shop_info.txt
   ✅ อ่านเนื้อหาได้ 450 ตัวอักษร
   📦 แบ่งได้ 3 chunks
   🔄 Processing chunk 1/3...
   🔄 Processing chunk 2/3...
   🔄 Processing chunk 3/3...
   ✅ บันทึกสำเร็จ!
📄 กำลังอ่านไฟล์: documents/sample_product.csv
    ✅ อ่านเนื้อหาได้ 200 ตัวอักษร
    📦 แบ่งได้ 1 chunks
    🔄 Processing chunk 1/1...
    ✅ บันทึกสำเร็จ!
📄 กำลังอ่านไฟล์: documents/CustomerFAQ.pdf
   ✅ อ่านเนื้อหาได้ 1234 ตัวอักษร
   📦 แบ่งได้ 5 chunks
   🔄 Processing chunk 1/5...
   🔄 Processing chunk 2/5...
   🔄 Processing chunk 3/5...
   🔄 Processing chunk 4/5...
   🔄 Processing chunk 5/5...
   ✅ บันทึกสำเร็จ!
🎉 Ingestion เสร็จสมบูรณ์!
```

#### 4.3 ตรวจสอบข้อมูลใน Database

ไปที่ Neon SQL Editor รัน:

```sql
-- ตรวจสอบจำนวน documents ที่ถูก ingest
SELECT COUNT(*) FROM document;

-- ดูตัวอย่างข้อมูล
SELECT id, LEFT(content, 100) AS preview, metadata
FROM document
LIMIT 5;

-- ตรวจสอบว่ามี embedding หรือไม่
SELECT id, LEFT(content, 50) AS preview, embedding IS NOT NULL AS has_embedding
FROM document
LIMIT 5;
```

**Best Practice สำหรับ Ingestion Pipeline:**
- **แยกขั้นตอนชัดเจน:** โหลดเอกสาร → แบ่งเป็น chunks → สร้าง embeddings → บันทึกลง DB
- **จัดการกับข้อผิดพลาด:** ใช้ try-catch เพื่อจับข้อผิดพลาดในแต่ละขั้นตอน และ log ข้อผิดพลาดอย่างชัดเจน
- **หน่วงเวลา:** ใส่ delay เล็กน้อยระหว่างการเรียก API ของ OpenAI เพื่อป้องกันการถูก rate limit
- **ลบข้อมูลเก่า:** ก่อนรัน ingestion ใหม่ ควรลบข้อมูลเก่าออกก่อน เพื่อป้องกันข้อมูลซ้ำ (สามารถปรับเป็นการอัปเดตหรือเพิ่มใหม่ได้ตามความเหมาะสม)

---

### Section 5: Similarity Search & Testing

**Similarity Search คืออะไร?**
Similarity Search คือการค้นหาข้อมูลที่มีความหมายใกล้เคียงกัน โดยใช้ Embeddings และการวัดความคล้ายคลึงกัน เช่น Cosine Similarity ใน pgVector เราสามารถใช้ operator `<=>` เพื่อคำนวณ Cosine Distance ได้โดยตรงใน SQL

#### 5.1 สร้าง Search Function

สร้างไฟล์ `lib/vector-search.ts`:

```typescript
import { prisma } from "@/lib/prisma"
import { generateEmbedding } from "@/lib/openai"

export interface SearchResult {
  id: string
  content: string
  metadata: any
  similarity: number
}

export async function searchDocuments(
  query: string,
  topK: number = 5,
  matchThreshold: number = 0.3 // ค่า similarity ขั้นต่ำ
): Promise<SearchResult[]> {
  // 1. แปลงคำถามเป็น Embedding
  const queryEmbedding = await generateEmbedding(query)

  // แปลง embedding array เป็น string format ที่ pgVector ต้องการ: [0.1, 0.2, ...]
  const embeddingStr = `[${queryEmbedding.join(",")}]`

  // 2. ค้นหาด้วย Cosine Similarity + filter ด้วย threshold
  const results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> ${embeddingStr}::vector) AS similarity
    FROM document
    WHERE embedding IS NOT NULL
      AND 1 - (embedding <=> ${embeddingStr}::vector) >= ${matchThreshold}
    ORDER BY embedding <=> ${embeddingStr}::vector
    LIMIT ${topK}
  `

  return results
}
```

> **อธิบาย SQL:**
> - `<=>` — เป็น Cosine Distance operator ของ pgVector
> - `1 - distance = similarity` — แปลง distance เป็น similarity score
> - `ORDER BY embedding <=> query` — เรียงจากใกล้สุด (คล้ายสุด) ก่อน

#### 5.2 สร้าง API Endpoint สำหรับ Search

สร้างไฟล์ `app/api/search/route.ts`:

```typescript
import { searchDocuments } from "@/lib/vector-search"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { query, topK = 5 } = await request.json()

    if (!query) {
      return NextResponse.json(
        { error: "Missing 'query' parameter" },
        { status: 400 }
      )
    }

    const results = await searchDocuments(query, topK)

    return NextResponse.json({
      query,
      results: results.map((r) => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        similarity: Math.round(r.similarity * 100) / 100,
      })),
      totalResults: results.length,
    })
  } catch (error: any) {
    console.error("Search error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
```

#### 5.3 ทดสอบ Search API

**ด้วย curl:**
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "ร้านนี้ขายสินค้าอะไรบ้าง", "topK": "5"}'
```

**ผลลัพธ์ตัวอย่าง:**
```json
{
  "query": "ร้านนี้ขายสินค้าอะไรบ้าง",
  "results": [
    {
      "id": "doc_1234_3",
      "content": "พนักงานมีสิทธิ์ลาพักร้อนประจำปี 10 วันทำการ โดยต้องแจ้งล่วงหน้าอย่างน้อย 3 วัน...",
      "metadata": {"source": "store-policy.pdf", "chunkIndex": 3},
      "similarity": 0.92
    },
    {
      "id": "doc_1234_5",
      "content": "การลากิจ ลาป่วย และลาพักร้อน สามารถยื่นผ่านระบบ HR Online ได้...",
      "metadata": {"source": "company-policy.pdf", "chunkIndex": 5},
      "similarity": 0.85
    }
  ],
  "totalResults": 2
}
```

#### 5.4 Workshop: ทดสอบ Similarity Search แบบต่างๆ

**ทดสอบด้วย curl หรือ Postman:**

##### Workshop 1: ค้นหาข้อมูลร้านค้า
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "ร้านนี้ขายสินค้าอะไรบ้าง", "topK": 5}'
```
> **คาดหวัง:** จะได้ chunk จาก CustomerFAQ.pdf ที่มีคำตอบ "จำหน่ายอุปกรณ์เสริมสำหรับสมาร์ทโฟน เคสกันกระแทก ฟิล์มกระจก สายชาร์จ..." ขึ้นมาอันดับ 1

##### Workshop 2: ค้นหาข้อมูลสินค้าเฉพาะ
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "หูฟังไร้สายตัดเสียงรบกวน", "topK": "5"}'
```
> **คาดหวัง:** จะได้ข้อมูลสินค้า "หูฟัง True Wireless ตัดเสียงรบกวน ANC" จาก sample_product.csv

##### Workshop 3: Search แบบ Semantic (ใช้คำต่างกัน ความหมายเหมือน)
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "นโยบายคืนของ", "topK": "5"}'
```
> **คาดหวัง:** จะพบเนื้อหาเกี่ยวกับ "การเปลี่ยน/คืนสินค้า" แม้ไม่ได้ใช้คำเหมือนกันทุกคำ — นี่คือพลังของ Semantic Search

##### Workshop 4: Search แบบ Cross-language (ข้ามภาษา)
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "return policy", "topK": "5"}'
```
> **คาดหวัง:** จะพบเนื้อหาภาษาไทยเกี่ยวกับ "การเปลี่ยน/คืนสินค้า" แม้ค้นหาด้วยภาษาอังกฤษ — Embeddings เข้าใจความหมายข้ามภาษาได้

##### Workshop 5: ค้นหาข้อมูลบริษัท
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "ที่อยู่และเบอร์ติดต่อร้าน", "topK": "5"}'
```
> **คาดหวัง:** จะได้ข้อมูลจาก shop_info.txt (ที่อยู่บริษัท) และ CustomerFAQ.pdf (ช่องทางติดต่อ Line, Email, เบอร์โทร)

##### Workshop 6: ค้นหาข้อมูลราคาและโปรโมชั่น
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "มีส่วนลดหรือโปรโมชั่นอะไรบ้าง", "topK": "5"}'
```
> **คาดหวัง:** จะพบเนื้อหาเกี่ยวกับ "สมาชิกใหม่รับส่วนลด 10%" และ "ราคารวม VAT แล้ว"

##### Workshop 7: ค้นหาสินค้าตามหมวดหมู่
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "อุปกรณ์ชาร์จมือถือ", "topK": "5"}'
```
> **คาดหวัง:** จะได้สินค้าหลายรายการจาก CSV เช่น หัวชาร์จ PD 30W, สายชาร์จถักไนลอน, Power Bank

##### Workshop 8: ปรับ topK เพื่อดูผลลัพธ์ต่างกัน
```bash
# topK = 1 (ผลลัพธ์เดียวที่ตรงที่สุด)
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "วิธีสั่งซื้อสินค้า", "topK": "1"}'

# topK = 10 (ผลลัพธ์มากขึ้น ครอบคลุมกว่า)
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query": "วิธีสั่งซื้อสินค้า", "topK": "10"}'
```
> **สังเกต:** topK น้อย → ได้ผลลัพธ์ที่ตรงประเด็นที่สุด, topK มาก → ครอบคลุมแต่อาจมีผลลัพธ์ที่ไม่ค่อยตรงปนมา

#### 5.5 Tips การปรับปรุง Similarity Search

| ปัจจัย | คำแนะนำ |
|--------|--------|
| **chunkSize** | 300-500 ตัวอักษร เหมาะสำหรับ Q&A, 500-1000 เหมาะสำหรับเอกสารยาว |
| **matchThreshold** | 0.3 = ค่าขั้นต่ำ, 0.5+ = ตรงประเด็น, 0.7+ = เชื่อถือได้สูง |
| **CSV format** | แปลงเป็นภาษาธรรมชาติแทน JSON เพื่อให้ embedding เข้าใจความหมายได้ดี |
| **embeddingStr** | ต้องแปลง `number[]` เป็น string `[0.1,0.2,...]` ก่อนส่งให้ pgVector |
| **topK** | 3-5 สำหรับ Chatbot, 10-20 สำหรับ Search UI |

---

### สรุป Day 6

ในวันนี้เราได้เรียนรู้:

| หัวข้อ | รายละเอียด |
|--------|------------|
| **Embeddings** | การแปลงข้อความเป็นเวกเตอร์ตัวเลขด้วย OpenAI |
| **pgVector** | การตั้งค่าและใช้งาน Vector Database บน Neon PostgreSQL |
| **Document Processing** | การอ่านไฟล์ PDF/TXT และแบ่งเป็น Chunks |
| **Ingestion Pipeline** | Script อัตโนมัติสำหรับนำเอกสารเข้าสู่ Vector DB |
| **Similarity Search** | การค้นหาข้อมูลจากความหมาย (Semantic Search) |

**ไฟล์สำคัญที่สร้างในวันนี้:**
- `lib/openai.ts` — OpenAI Client & Embedding Generator
- `lib/document-loader.ts` — PDF/TXT Document Loader
- `lib/text-splitter.ts` — Text Chunking Utility
- `lib/vector-search.ts` — Similarity Search Function
- `scripts/ingest.ts` — Ingestion Pipeline Script
- `app/api/search/route.ts` — Search API Endpoint

> **Next:** ใน Day 7 เราจะสร้าง AI Chatbot API ด้วยเทคนิค RAG โดยนำ Similarity Search ที่สร้างไว้ มาประกอบกับ OpenAI Chat API เพื่อสร้าง Chatbot ที่ตอบคำถามจากเอกสารองค์กรได้

---

## เพิ่มเติม: การเปลี่ยนจาก OpenAI ไปใช้ Claude หรือ Gemini

### ภาพรวม

| Provider | AI Model | Embedding API | Embedding Dimensions |
|----------|----------|---------------|----------------------|
| **OpenAI** | `gpt-4o` | `text-embedding-3-small` | **1536** |
| **Claude (Anthropic)** | `claude-opus-4-5` | ❌ ไม่มี → ใช้ **Voyage AI** แทน | **1024** (voyage-3) |
| **Gemini (Google)** | `gemini-2.5-pro` | `text-embedding-004` | **768** |

> **สำคัญ:** Anthropic **ไม่มี Embedding API** ของตัวเอง ต้องใช้ [Voyage AI](https://www.voyageai.com) สำหรับ Embeddings (Anthropic เป็นนักลงทุนใน Voyage AI)

---

### ตัวเลือกที่ 1: เปลี่ยนเป็น Claude + Voyage AI

#### ขั้นตอนที่ 1: ติดตั้ง Packages

```bash
pnpm remove openai
pnpm add @anthropic-ai/sdk voyageai
```

#### ขั้นตอนที่ 2: อัปเดต `.env`

```env
# Claude (Anthropic)
ANTHROPIC_API_KEY="sk-ant-your-key"
CLAUDE_MODEL="claude-opus-4-5"

# Voyage AI (Embeddings)
VOYAGE_API_KEY="pa-your-voyage-key"
VOYAGE_EMBEDDING_MODEL="voyage-3"
```

#### ขั้นตอนที่ 3: แทนที่ `lib/openai.ts` → `lib/ai.ts`

```typescript
import Anthropic from "@anthropic-ai/sdk"
import VoyageAI from "voyageai"

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const voyage = new VoyageAI({
  apiKey: process.env.VOYAGE_API_KEY,
})

// ฟังก์ชันสร้าง Embedding ด้วย Voyage AI
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await voyage.embed({
    input: text,
    model: process.env.VOYAGE_EMBEDDING_MODEL || "voyage-3",
  })
  return response.data[0].embedding
}
```

#### ขั้นตอนที่ 4: อัปเดต Prisma Schema (1536 → 1024)

```prisma
model Document {
  embedding Unsupported("vector(1024)")? // Voyage AI voyage-3 = 1024 มิติ
}
```

```bash
pnpx prisma migrate dev --name change_to_voyage_embedding
```

---

### ตัวเลือกที่ 2: เปลี่ยนเป็น Gemini (Google)

#### ขั้นตอนที่ 1: ติดตั้ง Packages

```bash
pnpm remove openai
pnpm add @google/generative-ai
```

#### ขั้นตอนที่ 2: อัปเดต `.env`

```env
# Gemini (Google AI)
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy-your-key"
GEMINI_MODEL="gemini-2.5-pro"
GEMINI_EMBEDDING_MODEL="text-embedding-004"
```

#### ขั้นตอนที่ 3: แทนที่ `lib/openai.ts` → `lib/ai.ts`

```typescript
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(
  process.env.GOOGLE_GENERATIVE_AI_API_KEY!
)

export const gemini = genAI.getGenerativeModel({
  model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
})

// ฟังก์ชันสร้าง Embedding ด้วย Gemini
export async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingModel = genAI.getGenerativeModel({
    model: process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004",
  })
  const result = await embeddingModel.embedContent(text)
  return result.embedding.values
}
```

#### ขั้นตอนที่ 4: อัปเดต Prisma Schema (1536 → 768)

```prisma
model Document {
  embedding Unsupported("vector(768)")? // Gemini text-embedding-004 = 768 มิติ
}
```

```bash
pnpx prisma migrate dev --name change_to_gemini_embedding
```

---

### ไฟล์ที่ต้องเปลี่ยน vs ไม่ต้องเปลี่ยน

| ไฟล์ | OpenAI → Claude | OpenAI → Gemini | เหตุผล |
|------|:--------------:|:---------------:|--------|
| `lib/openai.ts` (หรือ `lib/ai.ts`) | ✅ เปลี่ยน | ✅ เปลี่ยน | เปลี่ยน client + embedding function |
| `prisma/schema.prisma` | ✅ เปลี่ยน | ✅ เปลี่ยน | ขนาด vector มิติต่างกัน |
| `.env` | ✅ เปลี่ยน | ✅ เปลี่ยน | เปลี่ยน API keys |
| `lib/vector-search.ts` | ❌ ไม่ต้องเปลี่ยน | ❌ ไม่ต้องเปลี่ยน | เรียก `generateEmbedding()` เหมือนเดิม |
| `scripts/ingest.ts` | ❌ ไม่ต้องเปลี่ยน | ❌ ไม่ต้องเปลี่ยน | เรียก `generateEmbedding()` เหมือนเดิม |
| `lib/document-loader.ts` | ❌ ไม่ต้องเปลี่ยน | ❌ ไม่ต้องเปลี่ยน | ไม่เกี่ยวกับ AI Provider |
| `lib/text-splitter.ts` | ❌ ไม่ต้องเปลี่ยน | ❌ ไม่ต้องเปลี่ยน | ไม่เกี่ยวกับ AI Provider |
| `app/api/search/route.ts` | ❌ ไม่ต้องเปลี่ยน | ❌ ไม่ต้องเปลี่ยน | ไม่เกี่ยวกับ AI Provider |

> **สรุปหลักการ:** เนื่องจากทุกไฟล์ import `generateEmbedding()` จาก `lib/openai.ts` (หรือ `lib/ai.ts`) เพียงไฟล์เดียว การเปลี่ยน AI Provider จึงแก้ไขแค่ไฟล์นั้นและ Prisma Schema เท่านั้น — นี่คือประโยชน์ของการออกแบบ **Abstraction Layer** ที่ดี