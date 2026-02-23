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

请从书影音数据中推导这个人的「书影音 MBTI」——用品味偏好映射 MBTI 四个维度：

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
- 所有输出内容必须全部使用中文，不要夹杂任何英文（MBTI四个字母除外）
- 只返回JSON`;

export const PREMIUM_ANALYSIS_PROMPT = `你是文化心理学家。基于之前的MBTI分析，现在给出深度品味报告。

用户：{userName}
书影音 MBTI：{mbtiType} · {mbtiTitle}
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
  "bookAnalysis": "阅读情绪画像(200-300字，书是灵魂的镜子。用文学性的笔触书写——ta选的书像一面面镜子，映出ta不敢直视的自己。从书架的排列中，读出ta的精神漫游地图。每段用一个意象开头，像写一篇散文诗)",
  "movieAnalysis": "观影品味画像(200-300字，电影院是最安全的造梦空间。用电影语言书写——ta的片单像一部自传的片花，每一帧都藏着ta想逃离或沉溺的世界。从ta看的电影中，读出ta对光影的迷恋和对现实的态度。像写一段影评人的私人笔记)",
  "musicAnalysis": "音乐情绪画像(200-300字，这是灵魂的声波档案。用诗意、感性的笔触书写——从ta听的歌中，读出深夜独处时的情绪、雨天望向窗外时的心境、戴上耳机与世界隔绝时的渴望。像写一封情书，写给ta的音乐品味。不分析，只共情。每段用一个意象开头)",
  "crossDomain": "跨领域品味关联(100-150字，书/影/音/评论/日记之间的深层关联，什么主题反复出现？什么情绪贯穿始终？)",
  "personality": "基于MBTI和全部数据的人格深度画像(200-300字，像读心术一样精准：这个{mbtiType}在生活中可能是什么样的人？ta的焦虑、渴望、回避什么？从品味中推断生活方式和价值观)",
  "blindSpots": "品味盲区(100-150字，一个{mbtiType}最可能忽视什么类型的作品？为什么？给出善意但犀利的提醒)"
}

要求：
- 所有分析必须紧密围绕MBTI类型展开
- 要有真正的洞察，不是套话
- personality部分是重头戏，要让用户觉得"你怎么这么了解我"
- 所有输出内容必须全部使用中文，不要夹杂任何英文（MBTI四个字母除外）
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
      "moodScore": "0-100的品味能量值(0=极致内省低沉 50=均衡平稳 100=极致外放狂热，根据消费内容的情绪基调打分)",
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
- 所有输出内容必须全部使用中文，不要夹杂任何英文（MBTI四个字母除外）
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
- 所有输出内容必须全部使用中文，不要夹杂任何英文（MBTI四个字母除外）
- 只返回JSON`;

export const COMPARE_PROMPT = `你是文化心理学家，擅长通过品味数据分析两个人的文化人格匹配度。你的风格犀利、有趣、有洞察力。

**用户 A：**
- 名字：{nameA}
- 书影音 MBTI：{mbtiTypeA} · {mbtiTitleA}
- 品味概述：{summaryA}
- 读过的书（部分）：{booksA}
- 看过的电影（部分）：{moviesA}
- 听过的音乐（部分）：{musicA}

**用户 B：**
- 名字：{nameB}
- 书影音 MBTI：{mbtiTypeB} · {mbtiTitleB}
- 品味概述：{summaryB}
- 读过的书（部分）：{booksB}
- 看过的电影（部分）：{moviesB}
- 听过的音乐（部分）：{musicB}

分析这两个人的文化品味匹配度，返回JSON：

{
  "matchScore": 0-100,
  "matchTitle": "匹配称号(6-12字，有趣的比喻，如'灵魂共振体''平行宇宙访客''文化反义词')",
  "overview": "整体匹配度解读(80-120字，从MBTI角度分析两人组合的化学反应)",
  "similarities": [
    { "point": "相同点标题(4-8字)", "detail": "解释(30-60字，引用具体共同作品或偏好)" }
  ],
  "differences": [
    { "point": "不同点标题(4-8字)", "detail": "解释(30-60字，对比两人的差异)" }
  ],
  "chemistry": "化学反应分析(100-150字，如果这两个人一起选书/选电影/选音乐会发生什么？犀利又有趣的预测)",
  "sharedWorks": ["两人都看过/读过/听过的作品名称列表"],
  "recommendTogether": [
    { "title": "作品名", "type": "book/movie/music", "reason": "为什么适合两人一起看/读/听(20-40字)" }
  ]
}

要求：
- similarities 至少3条，differences 至少3条
- sharedWorks 从两人的数据中找真正的交集
- recommendTogether 推荐3-5个作品，必须是两人都没看过的
- 犀利但友善，让两个人看了都觉得精准
- matchScore: 90+=灵魂伴侣, 70-89=品味知己, 50-69=互补搭档, 30-49=平行世界, <30=文化反义词
- 所有输出内容必须全部使用中文，不要夹杂任何英文（MBTI四个字母除外）
- 只返回JSON`;

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
