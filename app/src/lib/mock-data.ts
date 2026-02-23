/**
 * Dev mock data — set NEXT_PUBLIC_DEV_MOCK=true in .env.local to skip LLM calls.
 */

export const MOCK_ANALYZE = {
  id: "mock-001",
  createdAt: new Date().toISOString(),
  doubanName: "内测用户",
  mbti: {
    type: "INFJ",
    title: "孤独的灵魂考古者",
    dimensions: {
      ie: { letter: "I", score: 72, evidence: "偏爱独处式的文艺消费，深夜刷片、安静读书是你的精神充电方式" },
      ns: { letter: "N", score: 81, evidence: "你的片单和书架都指向一个方向：抽象、隐喻、多重解读" },
      tf: { letter: "F", score: 65, evidence: "虽然你看推理片，但最后打动你的永远是角色的情感弧光" },
      jp: { letter: "J", score: 58, evidence: "你有自己的品味体系，但偶尔也会被一部意外的佳作打破计划" },
    },
    summary: "你的品味像一座私人博物馆——每件藏品都经过精心挑选，陈列着你对世界的理解。你不追热门，但你追的东西往往在几年后变成经典。",
  },
  roast: "你的豆瓣主页就是一部《我很有品味但我不说》的默片。书架上全是让人望而生畏的大部头，片单里一半是没人听过的小众片，音乐品味更是像在参加一场只有你一个人的音乐节。恭喜你，你是文化荒漠里最孤独的绿洲。",
  radarData: { wenqing: 88, emo: 76, shekong: 82, kaogu: 61, shangtou: 73 },
  summary: "一个被文字和光影喂养长大的灵魂，在深度和独特性上远超同龄人，但偶尔也该走出舒适区看看烂片，毕竟生活不只是艺术。",
  isPremium: false,
  input: {
    doubanId: "mock-user",
    doubanName: "内测用户",
    books: [
      { title: "百年孤独", rating: 5, date: "2025-12-15", comment: "马尔克斯构建了一个完整的宇宙" },
      { title: "卡拉马佐夫兄弟", rating: 5, date: "2025-11-20" },
      { title: "挪威的森林", rating: 4, date: "2026-01-05" },
      { title: "人类简史", rating: 4, date: "2025-10-10" },
      { title: "小径分岔的花园", rating: 5, date: "2025-09-22" },
    ],
    movies: [
      { title: "花样年华", rating: 5, date: "2025-12-01" },
      { title: "银翼杀手2049", rating: 5, date: "2026-01-10" },
      { title: "燃烧", rating: 4, date: "2025-11-15" },
      { title: "寄生虫", rating: 4, date: "2025-10-25" },
      { title: "春光乍泄", rating: 5, date: "2026-02-01" },
    ],
    music: [
      { title: "OK Computer - Radiohead", rating: 5, date: "2025-12-20" },
      { title: "无条件 - 陈奕迅", rating: 4, date: "2026-01-15" },
      { title: "To Pimp a Butterfly", rating: 5, date: "2025-11-01" },
      { title: "Blonde - Frank Ocean", rating: 5, date: "2025-10-05" },
    ],
    reviews: [],
    diaries: [],
    statuses: [],
    source: "douban" as const,
  },
  sampleCount: 14,
  realCounts: { books: 5, movies: 5, music: 4 },
  bookCount: 5,
  movieCount: 5,
  musicCount: 4,
  itemCount: 14,
};

export const MOCK_EXPAND = {
  bookAnalysis:
    "一盏台灯下，你的书架像一面棱镜，折射出你灵魂深处对秩序与混沌的双重迷恋。马尔克斯的魔幻现实是你的精神故乡——你相信现实比虚构更荒诞，所以你选择在虚构中寻找真实。博尔赫斯的迷宫是你的思维游乐场，你在无限分岔的路径中获得别人在过山车上才有的快感。村上春树是你偶尔放纵的甜品——你知道它没有陀思妥耶夫斯基那么沉重，但你需要那种温柔的忧伤来平衡灵魂的重量。你的书架不是图书馆，是一部自传。",
  movieAnalysis:
    "暗下来的影院是你最安全的藏身之所。王家卫的氤氲镜头是你的情感母语——那些欲言又止的凝视、擦肩而过的遗憾，你在银幕上看到自己不敢在现实中表达的一切。维伦纽瓦的宏大叙事满足了你对未知世界的渴望，你在赛博朋克的废墟里看到了人类最本质的孤独。李沧东的《燃烧》让你坐立不安——因为你在那个找不到谷仓的年轻人身上看到了自己：永远在追问，永远得不到答案。你的片单是一封写给孤独的情书。",
  musicAnalysis:
    "深夜两点的耳机里，你的世界只剩下声波和呼吸。Radiohead 的电子噪音是你焦虑的外化——你在 Thom Yorke 的颤抖中听到自己午夜三点的心跳。Frank Ocean 的温柔是你藏在冷漠外壳下的秘密花园，每一句低吟都像在抚摸你不愿示人的伤口。陈奕迅的粤语歌是你和自己和解的仪式，你不需要听懂每个字，你只需要那个旋律带你回到某个特定的雨天。你的歌单不是音乐，是一本用声波写成的日记。",
  timelineMonths: [
    {
      month: "2025-09",
      books: ["小径分岔的花园"],
      movies: [],
      music: [],
      mood: "沉浸在博尔赫斯的迷宫里",
      moodScore: 35,
      tasteShift: "开始了一段深度阅读期",
      roast: "九月的你活在平行宇宙里，现实世界请留言",
    },
    {
      month: "2025-10",
      books: ["人类简史"],
      movies: ["寄生虫"],
      music: ["Blonde - Frank Ocean"],
      mood: "从宏大叙事到阶级焦虑",
      moodScore: 55,
      tasteShift: "从纯文学转向社会议题",
      roast: "看完人类简史又看寄生虫，你是在做阶级斗争主题研究吗",
    },
    {
      month: "2025-11",
      books: ["卡拉马佐夫兄弟"],
      movies: ["燃烧"],
      music: ["To Pimp a Butterfly"],
      mood: "存在主义危机高峰期",
      moodScore: 28,
      tasteShift: "品味能量降到谷底，但深度达到巅峰",
      roast: "陀思妥耶夫斯基+李沧东+Kendrick，你是想把自己虐到什么程度",
    },
    {
      month: "2025-12",
      books: ["百年孤独"],
      movies: ["花样年华"],
      music: ["OK Computer - Radiohead"],
      mood: "在孤独中寻找浪漫",
      moodScore: 48,
      tasteShift: "从存在焦虑转向情感探索",
      roast: "百年孤独配花样年华，你的十二月是一部一个人的文艺电影",
    },
    {
      month: "2026-01",
      books: ["挪威的森林"],
      movies: ["银翼杀手2049"],
      music: ["无条件 - 陈奕迅"],
      mood: "温柔与科幻的奇妙混搭",
      moodScore: 62,
      tasteShift: "品味开始回暖，出现流行元素",
      roast: "村上春树救了你一命，否则你可能还沉在陀思妥耶夫斯基的深渊里",
    },
    {
      month: "2026-02",
      books: [],
      movies: ["春光乍泄"],
      music: [],
      mood: "王家卫式的暧昧忧伤",
      moodScore: 42,
      tasteShift: "回归王家卫的情感宇宙",
      roast: "二月只看了一部春光乍泄，你是不是在等一个人",
    },
  ],
  timelineText:
    "你的品味轨迹像一条深海潜水曲线——十一月探到最深处，然后缓缓上浮。你在存在主义的谷底待了太久，身体本能地开始寻找温暖的东西来平衡。村上春树和陈奕迅是你的救生圈。\n\n下个月你可能会突然迷上一部轻松的喜剧或者一张电子专辑——不是因为你变肤浅了，而是你的灵魂需要喘口气。",
};

export const MOCK_SHARE_UNLOCK = {
  crossDomain:
    "你的书影音之间有一条隐秘的红线：孤独。百年孤独的布恩迪亚家族、花样年华里错过的梁朝伟和张曼玉、Frank Ocean 在 Blonde 里的低语——它们都在讲述同一个故事：人与人之间那道无法跨越的距离。你被这个主题反复吸引，不是因为你享受孤独，而是因为你想确认：这种感觉是不是只有你有。",
  personality:
    "作为一个 INFJ，你的品味暴露了一个矛盾的灵魂：你渴望深度连接，却总是选择独处。你的书架上没有社交技巧类的书，你的片单里没有欢乐喜剧，你的歌单在凌晨三点循环播放——这说明你的内心世界比外在表现丰富一百倍。你在生活中可能是那个「看起来很好但其实想很多」的人。你的焦虑来自于对意义的执着追问，你的渴望是被真正理解而不是被表面认可。你回避轻松的社交，因为你觉得大部分对话是在浪费时间。你的品味是你的盔甲，也是你的软肋——它让你与众不同，也让你更加孤独。",
  blindSpots:
    "你的品味地图上有一大片空白：喜剧和商业大片。作为 INFJ，你本能地觉得轻松的东西「不够深刻」，但有时候一部好莱坞爆米花电影比一部文艺片更能揭示人性。试试看《疯狂动物城》或者听一张泰勒·斯威夫特，你可能会发现：浅不代表没有深度，深也不代表就是好的。",
  recommendations: [
    { title: "索拉里斯星", type: "book", reason: "作为 INFJ，你会在莱姆的科幻哲学中找到灵魂共振——这本书问的问题和你每晚问自己的一模一样", matchScore: 95, alreadyConsumed: false },
    { title: "完美的日子", type: "movie", reason: "维姆·文德斯拍了一部关于孤独之美的电影，每一帧都像是为 INFJ 定制的冥想", matchScore: 92, alreadyConsumed: false },
    { title: "For Emma, Forever Ago", type: "music", reason: "Bon Iver 在小木屋里录的这张专辑，是你冬夜灵魂的完美配乐", matchScore: 90, alreadyConsumed: false },
    { title: "刺猬的优雅", type: "book", reason: "一个门房老太太的内心独白，你会在她的孤独和骄傲中看到自己的影子", matchScore: 87, alreadyConsumed: false },
    { title: "之后的我们", type: "movie", reason: "岩井俊二的光影诗学遇上中国式的错过，是你的审美舒适区", matchScore: 84, alreadyConsumed: false },
  ],
};
