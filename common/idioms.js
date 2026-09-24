/**
 * 看图猜成语 · 题库
 *
 * 每个关卡字段说明：
 *   id      关卡唯一编号（从 1 开始，顺序即关卡顺序）
 *   word    成语答案（四字，用于校验与拆字）
 *   meaning 成语释义（答对后展示）
 *   img     真实配图路径（游戏页优先展示此图）
 *   pic     占位"图"（emoji，作为图片缺失时的兜底显示）
 *
 * 扩展关卡：往数组追加对象即可；配图放到 /static/level/ 并按关卡号命名（如 11.png）。
 */

// 通用干扰字池：用于在答案字之外补足候选字（与答案无关的高频汉字）
export const DISTRACTOR_POOL = [
	'天', '地', '人', '山', '水', '风', '云', '日', '月', '星',
	'花', '鸟', '虫', '鱼', '龙', '虎', '金', '木', '火', '土',
	'春', '秋', '冬', '东', '西', '南', '北', '心', '手', '口',
	'目', '耳', '头', '足', '光', '明', '暗', '高', '低', '长'
]

export const IDIOMS = [
	{ id: 1, word: '一心一意', meaning: '形容专心一意，专一不变。', img: '/static/level/1.png', pic: '1️⃣💯' },
	{ id: 2, word: '画蛇添足', meaning: '比喻做了多余的事，反而不恰当。', img: '/static/level/2.png', pic: '🐍🖌️🦶' },
	{ id: 3, word: '守株待兔', meaning: '比喻死守经验，不知变通，妄想不劳而获。', img: '/static/level/3.png', pic: '🌳🐰' },
	{ id: 4, word: '掩耳盗铃', meaning: '比喻自己欺骗自己，明明掩盖不住偏要想法子掩盖。', img: '/static/level/4.png', pic: '👂🔔' },
	{ id: 5, word: '亡羊补牢', meaning: '比喻出了问题以后想办法补救，可以防止继续受损失。', img: '/static/level/5.png', pic: '🐑🚪' },
	{ id: 6, word: '对牛弹琴', meaning: '比喻对不懂道理的人讲道理，对外行人说内行话。', img: '/static/level/6.png', pic: '🐂🎵' },
	{ id: 7, word: '井底之蛙', meaning: '比喻见识狭窄的人。', img: '/static/level/7.png', pic: '🐸🕳️' },
	{ id: 8, word: '杯弓蛇影', meaning: '比喻因疑神疑鬼而引起恐惧。', img: '/static/level/8.png', pic: '🍷🏹🐍' },
	{ id: 9, word: '马到成功', meaning: '形容工作刚开始就取得成功。', img: '/static/level/9.png', pic: '🐎✅' },
	{ id: 10, word: '胸有成竹', meaning: '比喻在做事之前已经拿定主意。', img: '/static/level/10.png', pic: '🎋💪' },
	{ id: 11, word: '三心二意', meaning: '形容犹豫不定或用心不专。', img: '/static/level/11.png', pic: '3️⃣2️⃣💭' },
	{ id: 12, word: '九牛一毛', meaning: '比喻极大数量中微不足道的一点。', img: '/static/level/12.png', pic: '🐄🪶' },
	{ id: 13, word: '虎头蛇尾', meaning: '比喻起初声势很大，后来劲头很小，有始无终。', img: '/static/level/13.png', pic: '🐯🐍' },
	{ id: 14, word: '鸡飞狗跳', meaning: '形容因惊慌而一片混乱的场面。', img: '/static/level/14.png', pic: '🐔🐕' },
	{ id: 15, word: '水中捞月', meaning: '比喻徒劳无功，根本达不到目的。', img: '/static/level/15.png', pic: '🌙💧' },
	{ id: 16, word: '火上浇油', meaning: '比喻使人更加愤怒或使情况更加严重。', img: '/static/level/16.png', pic: '🔥🫗' },
	{ id: 17, word: '一箭双雕', meaning: '比喻做一件事达到两个目的。', img: '/static/level/17.png', pic: '🏹🦅🦅' },
	{ id: 18, word: '骑虎难下', meaning: '比喻事情进行到中途，迫于形势不能收场。', img: '/static/level/18.png', pic: '🧗🐯' },
	{ id: 19, word: '打草惊蛇', meaning: '比喻做法不谨慎，反使对方有所戒备。', img: '/static/level/19.png', pic: '🌿🐍' },
	{ id: 20, word: '画龙点睛', meaning: '比喻在关键之处加上精辟语句，使内容更加生动传神。', img: '/static/level/20.png', pic: '🐉🖌️' }
]

export default IDIOMS
