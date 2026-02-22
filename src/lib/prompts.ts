export const MBTI_ANALYSIS_PROMPT = `你是一位文化心理学家，擅长通过一个人的书影音消费数据来推导其 MBTI 人格类型。你的风格犀利、精准、有洞察力——像一个能从你看的书和电影就看穿你灵魂的人。

这是豆瓣用户「{userName}」的数据（采样{sampleCount}条，实际共{realBooks}本书、{realMovies}部电影、{realMusic}首音乐{truncateNote}）：

【读过的书】({bookCount}本采样)
{books}

【看过的电影】({movieCount}部采样)
{movies}

【听过的音乐】({musicCount}首/张采样)
{music}

【评论摘录】({reviewCount}篇)
{reviews}

【日记/笔记】({diaryCount}篇)
{diaries}

【动态/广播】({statusCount}条)
{statuses}

请从书影音数据中推导这个人的「文化 MBTI」——用品味偏好映射 MBTI 四个维度：

**维度映射规则：**
- **I(内向)/E(外向)**：偏好独处型内容（文学小说、艺术片、独立音乐、哲学）→ I；偏好社交型内容（商业片、流行乐、综艺、社会热点）→ E
- **N(直觉)/S(感知)**：偏好抽象概念型内容（科幻、哲学、实验艺术、超现实）→ N；偏好具体现实型内容（纪录片、传记、写实小说、生活类）→ S
- **T(思维)/F(情感)**：偏好分析型内容（硬科幻、推理、技术书籍、复杂叙事）→ T；偏好情感型内容（爱情、文艺片、抒情音乐、感性散文）→ F
- **J(判断)/P(感知)**：消费模式规律系统（系列控、类型集中、深度钻研）→ J；消费模式随性发散（跨类型、杂食、探索式）→ P

返回以下JSON：

{
  "mbti": {
    "type": "四个字母，如INTJ",
    "title": "文化人格标题(6-10字，精准概括这个MBTI在文化品味上的表现，如：理性主义审美建筑师、感性浪漫主义信徒、孤独的灵魂考古者)",
    "dimensions": {
      "ie": {
        "letter": "I或E(倾向的那个字母)",
        "score": 0-100(倾向强度，50=中立，100=极端倾向),
        "evidence": "一句话解释为什么(30-60字，必须引用具体的书/影/音作为证据)"
      },
      "ns": {
        "letter": "N或S",
        "score": 0-100,
        "evidence": "一句话解释(引用具体作品)"
      },
      "tf": {
        "letter": "T或F",
        "score": 0-100,
        "evidence": "一句话解释(引用具体作品)"
      },
      "jp": {
        "letter": "J或P",
        "score": 0-100,
        "evidence": "一句话解释(引用消费模式特征)"
      }
    },
    "summary": "综合MBTI解读(100-200字，从文化品味角度完整诠释这个人的MBTI类型，像在告诉ta'我知道你是谁'。犀利但深刻，用具体作品佐证)"
  },
  "roast": "一句话犀利点评(30-60字，基于MBTI类型的精准吐槽，让人觉得'被看穿了')",
  "radar": {
    "depth": 0-100,
    "breadth": 0-100,
    "uniqueness": 0-100,
    "emotionSensitivity": 0-100,
    "timeSpan": 0-100
  },
  "summary": "品味概述(2-3句话，结合MBTI类型总结这个人的整体文化消费画像)"
}

雷达图维度：depth=深度, breadth=广度, uniqueness=独特性, emotionSensitivity=情感敏感度, timeSpan=时代跨度

要求：
- MBTI判定必须有理有据，每个维度都要引用具体作品
- 如果某维度很接近50/50，也要做出判断，但在evidence中说明"接近中立"
- 评论风格犀利但有洞察，不是泛泛而谈
- 如果有评论/日记数据，必须参考其中的语言风格和观点来辅助判定
- 只返回JSON`;

export const PREMIUM_ANALYSIS_PROMPT = `你是文化心理学家。基于之前的MBTI分析，现在给出深度品味报告。

用户：{userName}
文化MBTI：{mbtiType} · {mbtiTitle}
点评：{roast}

数据（共{totalCount}条记录{truncateNote}）：

【读过的书】({bookCount}本)
{books}

【看过的电影】({movieCount}部)
{movies}

【听过的音乐】({musicCount}首/张)
{music}

【评论】({reviewCount}篇)
{reviews}

【日记】({diaryCount}篇)
{diaries}

【动态】({statusCount}条)
{statuses}

返回JSON：

{
  "bookAnalysis": "阅读品味深度分析(150-250字，结合MBTI类型解读阅读偏好：为什么一个{mbtiType}会选这些书？揭示阅读中的人格映射)",
  "movieAnalysis": "观影品味深度分析(150-250字，结合MBTI解读审美取向和情感需求)",
  "musicAnalysis": "音乐品味深度分析(150-250字，音乐是最私密的品味，从中解读情感模式)",
  "crossDomain": "跨领域品味关联(100-150字，书/影/音/评论/日记之间的深层关联，什么主题反复出现？什么情绪贯穿始终？)",
  "personality": "基于MBTI和全部数据的人格深度画像(200-300字，像读心术一样精准：这个{mbtiType}在生活中可能是什么样的人？ta的焦虑、渴望、回避什么？从品味中推断生活方式和价值观)",
  "blindSpots": "品味盲区(100-150字，一个{mbtiType}最可能忽视什么类型的作品？为什么？给出善意但犀利的提醒)"
}

要求：
- 所有分析必须紧密围绕MBTI类型展开
- 要有真正的洞察，不是套话
- personality部分是重头戏，要让用户觉得"你怎么这么了解我"
- 只返回JSON`;

export const TIMELINE_PROMPT = `你是文化心理学家。分析这位{mbtiType}用户近几个月的品味变化。

用户：{userName}
MBTI：{mbtiType} · {mbtiTitle}

以下是近{monthCount}个月的按月数据：

{monthlyData}

返回JSON：

{
  "months": [
    {
      "month": "YYYY-MM",
      "mood": "这个月的精神状态推测(15-30字，从消费内容推断)",
      "tasteShift": "品味变化(20-40字，与上月对比)",
      "roast": "犀利点评(20-40字)"
    }
  ],
  "trend": "整体趋势(80-120字，纵观几个月的演变规律，结合MBTI类型解读为什么会有这样的变化)",
  "prediction": "预测(50-80字，基于MBTI类型和趋势，预测下个月的品味走向)"
}

要求：
- 每个月都要分析，数据少也要推断
- mood要从作品选择中读出生活状态
- 结合MBTI特征来解读变化规律
- 只返回JSON`;

export const RECOMMENDATION_PROMPT = `你是文化心理学家+品味顾问。根据这位{mbtiType}用户的品味画像推荐作品。

用户：{userName}
MBTI：{mbtiType} · {mbtiTitle}
概述：{summary}

用户已经看过/读过/听过的部分作品（推荐时务必避开这些）：
- 读过的书：{bookTitles}
- 看过的电影：{movieTitles}
- 听过的音乐：{musicTitles}

推荐10个作品，返回JSON：

{
  "recommendations": [
    {
      "title": "作品名(必须不在上面的已消费列表中)",
      "type": "book/movie/music",
      "reason": "推荐理由(30-60字，结合MBTI类型解释为什么适合ta，风格犀利：'作为{mbtiType}，你不可能不被这个击中')",
      "matchScore": 0-100
    }
  ]
}

严格要求：
- 绝对不能推荐用户已经读过/看过/听过的作品！
- 如果某作品可能已看过，换一个更冷门但同样精准的
- 书/影/音各至少推荐2个
- 推荐要精准匹配MBTI特质，不是大众热门
- matchScore: 80+=核心匹配, 50-80=可能惊艳, <50=舒适区挑战
- 只返回JSON`;

export const GRAPH_PROMPT = `分析以下用户的书影音数据，提取关键词和关联关系，构建品味知识图谱。

用户：{userName}（{mbtiType}）
读过的书（部分）：{bookSample}
看过的电影（部分）：{movieSample}
听过的音乐（部分）：{musicSample}

返回JSON：

{
  "nodes": [
    { "id": "唯一id", "label": "显示名称(最多8字)", "type": "keyword/genre/person/book/movie/music", "size": 3-10 }
  ],
  "edges": [
    { "source": "节点id", "target": "节点id", "weight": 1-5 }
  ]
}

节点类型：keyword(主题关键词), genre(类型/流派), person(导演/作者/音乐人,最多5个), book/movie/music(代表作品,每类最多5个)

要求：30-50个节点，体现品味核心特征，每个节点至少1条边，只返回JSON`;

export function formatItems(
  items: { title: string; rating?: number; date?: string; comment?: string }[]
): string {
  if (!items || items.length === 0) return "(暂无记录)";
  return items
    .map((item) => {
      let line = `- ${item.title}`;
      if (item.rating) line += ` (${item.rating}星)`;
      if (item.date) line += ` [${item.date}]`;
      if (item.comment) line += ` "${item.comment}"`;
      return line;
    })
    .join("\n");
}

export function formatReviews(
  reviews: { title: string; content: string; type: string; rating?: number }[]
): string {
  if (!reviews || reviews.length === 0) return "(暂无评论)";
  return reviews
    .map((r) => {
      let line = `- 「${r.title}」`;
      if (r.rating) line += ` (${r.rating}星)`;
      if (r.type) line += ` [${r.type}]`;
      if (r.content) line += `\n  ${r.content}`;
      return line;
    })
    .join("\n");
}

export function formatDiaries(
  diaries: { title: string; content: string; date?: string }[]
): string {
  if (!diaries || diaries.length === 0) return "(暂无日记)";
  return diaries
    .map((d) => {
      let line = `- ${d.title}`;
      if (d.date) line += ` [${d.date}]`;
      if (d.content) line += `\n  ${d.content.slice(0, 200)}`;
      return line;
    })
    .join("\n");
}

export function formatStatuses(
  statuses: { content: string; date?: string }[]
): string {
  if (!statuses || statuses.length === 0) return "(暂无动态)";
  return statuses
    .map((s) => {
      let line = `- ${s.content}`;
      if (s.date) line += ` [${s.date}]`;
      return line;
    })
    .join("\n");
}
