# Token 消耗审计

## 一、消耗 Token 的 API（会调 LLM）

| API | 调用的 LLM 函数 | 次数/场景 | 是否有缓存 |
|-----|----------------|-----------|------------|
| `POST /api/analyze` | `generateBasicReport` | 1 次/每个新用户分析 | ✅ 有（按 doubanId，7 天） |
| `POST /api/expand/[id]` | `generatePremiumReport` + `generateTimeline` | 2 次并行/加载完整分析 | ✅ 有（按 doubanId，7 天） |
| `POST /api/share-unlock/[id]` | `generatePremiumReport` + `generateRecommendations` | 2 次并行/分享解锁深度 | ✅ 有（按 doubanId，7 天） |
| `POST /api/compare` | `generateComparison` | 1 次/每次新对比 | ✅ 有（按 doubanIdA+doubanIdB 对，30 天） |

### 不消耗 Token 的 API

- `GET /api/compare/[id]`：从 Redis 读已生成的对比，不调 LLM
- `GET /api/report/[id]`：读报告，不调 LLM
- `POST /api/share-card`、`/api/share-report`、`/api/share-analysis`、`/api/share-compare`：服务端渲染图片，不调 LLM
- `POST /api/invite`：写入 KV，不调 LLM

---

## 二、各模块预估 Token 量（单次请求）

> 中英混排约 2 字符/token 估算。实际以模型计费为准。

| 模块 | 输入 Token | 输出 Token | 小计 | 说明 |
|------|-----------|-----------|------|------|
| **analyze** (generateBasicReport) | ~4 500 | ~1 200 | ~5 700 | 系统 prompt ~300 + 用户数据 2k–8k + 输出 |
| **expand - Premium** (generatePremiumReport) | ~5 500 | ~1 800 | ~7 300 | 6 个分析段落输出 |
| **expand - Timeline** (generateTimeline) | ~1 500 | ~700 | ~2 200 | 月度数据较精简 |
| **share-unlock - Premium** | ~5 500 | ~1 800 | ~7 300 | 与 expand 的 Premium **重复生成** |
| **share-unlock - Recommendations** | ~2 000 | ~900 | ~2 900 | 10 个推荐 + 理由 |
| **compare** (generateComparison) | ~4 000 | ~1 500 | ~5 500 | 双人数据 + 趣味彩蛋 |

---

## 三、用户「全点一遍」的 Token 消耗

假设：**首次使用、无缓存**，所有功能各触发一次。

| 步骤 | 动作 | LLM 调用 | Token 消耗 |
|------|------|----------|------------|
| 1 | 输入豆瓣 ID，点击分析 | analyze | ~5 700 |
| 2 | 支付/解锁后加载完整分析 | expand (Premium + Timeline) | ~9 500 |
| 3 | 分享后解锁深度解读 | share-unlock (Premium + Recommendations) | ~10 200 |
| 4 | 发起 1 次双人对比 | compare | ~5 500 |
| **合计** | | **7 次 LLM 调用** | **~30 900** |

> share-unlock 会再次调用 `generatePremiumReport`，与 expand 重复生成 crossDomain / personality / blindSpots。

---

## 四、费用估算（gpt-4o-mini 默认）

定价（$/百万 Token）：
- 输入：$0.15
- 输出：$0.60

| 场景 | 输入 Token | 输出 Token | 费用（USD） |
|------|-----------|-----------|-------------|
| analyze | 4 500 | 1 200 | ~0.0014 |
| expand | 7 000 | 2 500 | ~0.0026 |
| share-unlock | 7 500 | 2 700 | ~0.0029 |
| compare | 4 000 | 1 500 | ~0.0013 |
| **全点一遍总计** | **~23 000** | **~7 900** | **~0.0082** |

**约 $0.008 / 用户（≈ ¥0.06）**

（若用 DeepSeek：输入 $0.14、输出 $0.28，约 $0.004/用户。）

---

## 五、缓存与二次请求

| 数据 | 存储位置 | 二次请求是否耗 Token |
|------|----------|----------------------|
| analyze 结果 | Redis `analyze:{doubanId}` | ❌ 不耗，直接读缓存 |
| expand 结果 | Redis `expand:{doubanId}` | ❌ 不耗，直接读缓存 |
| share-unlock 结果 | Redis `share-unlock:{doubanId}` | ❌ 不耗，直接读缓存 |
| compare 生成 | Redis `compare-gen:{idA}:{idB}` | ❌ 同两人二次对比不耗 Token |
| compare 结果 | Redis `compare:{compareId}` | `GET /api/compare/{id}` 读 KV，不耗 |

结论：
1. **analyze**：同豆瓣 ID 二次分析不耗 Token
2. **expand**：同用户二次加载不耗 Token
3. **share-unlock**：同豆瓣 ID 二次解锁不耗 Token
4. **compare**：同一对用户（doubanIdA + doubanIdB）再次对比不耗 Token；首次或换人则耗

---

## 六、已完成优化

1. **share-unlock 缓存**：已实现，按 doubanId 缓存 7 天
2. **compare 缓存**：已实现，按 doubanIdA + doubanIdB 对缓存 30 天（客户端需传 doubanIdA/doubanIdB）

## 七、后续可优化

1. **避免 Premium 重复生成**：expand 已产出 crossDomain / personality / blindSpots，share-unlock 可优先从 expand 缓存取，只额外生成 recommendations
2. **增加 Token 使用日志**：在生产环境打印 `_usage`，便于按模型和接口做成本分析
