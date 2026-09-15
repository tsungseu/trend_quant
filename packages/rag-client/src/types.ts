// 共享类型：前端（apps/terminal、apps/admin）与后端（apps/api）共用。
// 后端导入此包以保证响应形状与前端一致。

export type DocumentStatus = 'pending' | 'parsing' | 'embedding' | 'indexed' | 'failed'

export interface KbDocument {
  id: string
  userId: string
  filename: string
  contentType: string
  sizeBytes: number
  status: DocumentStatus
  /** 解析/索引失败时的错误摘要（不暴露内部路径） */
  error?: string
  /** OCR 置信度低时置 true，供前端提示用户 */
  lowConfidence?: boolean
  chunkCount?: number
  createdAt: string
  updatedAt: string
}

export interface SearchHit {
  docId: string
  chunkIdx: number
  text: string
  score: number
  /** 来源文件名，便于引用展示 */
  filename?: string
}

export interface UploadResponse {
  document: KbDocument
}

export interface QueryResponse {
  hits: SearchHit[]
}

/** /chat 流式事件：后端逐条发送，前端拼装 */
export type ChatStreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'citations'; hits: SearchHit[] }
  | { type: 'done' }
  | { type: 'error'; message: string }
