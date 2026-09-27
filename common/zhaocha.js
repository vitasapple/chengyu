/**
 * 找茬达人 · 题库与出题（形近字找茬）
 *
 * 玩法：给出一个"目标字"（如 已），网格中铺满其形近字（如 己），
 *       混入少量目标字，玩家在限定时间内点出所有目标字。
 *
 * 字段说明：
 *   base    背景字（网格大部分由它铺满）
 *   target  目标字（需要被点出来的形近字）
 *   label   题目里的口语叫法
 *
 * 出题进度全局统一：第 N 题由 N 确定性生成（mulberry32 种子随机），
 * 同一题号所有玩家看到同一盘，与每日一题的确定性选题思路一致。
 */

// 形近字对池（微信生态常见找茬对，纯文字渲染零美术成本）
export const ZHAOCHA_PAIRS = [
	{ base: '己', target: '已', label: '已' },
	{ base: '已', target: '己', label: '己' },
	{ base: '曰', target: '日', label: '日' },
	{ base: '日', target: '曰', label: '曰' },
	{ base: '未', target: '末', label: '末' },
	{ base: '末', target: '未', label: '未' },
	{ base: '戍', target: '戌', label: '戌' },
	{ base: '戊', target: '戍', label: '戍' },
	{ base: '壁', target: '璧', label: '璧' },
	{ base: '折', target: '拆', label: '拆' },
	{ base: '拆', target: '折', label: '折' },
	{ base: '侯', target: '候', label: '候' },
	{ base: '候', target: '侯', label: '侯' }
]

// 过滤掉非法条目（单字校验），避免脏数据进入出题
const PAIRS = ZHAOCHA_PAIRS.filter(p => p.base && p.target && p.base.length === 1 && p.target.length === 1 && p.base !== p.target)

/* ---------- 确定性随机 ---------- */

/** mulberry32：种子随机数生成器，同种子同序列 */
function mulberry32(seed) {
	let a = seed >>> 0
	return function () {
		a |= 0
		a = (a + 0x6D2B79F5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/* ---------- 出题 ---------- */

/**
 * 生成第 n 题（n 从 1 开始）的题目。
 * 难度梯度：1-4 题 4×4 / 2-3 个目标；5-9 题 5×5 / 3-4 个；10 题起 6×6 / 4-5 个。
 * @param {number} n 全局题号
 * @returns {{ pair: object, size: number, cells: string[], targetCount: number }}
 */
export function buildZhaochaPuzzle(n) {
	const rand = mulberry32(1000 + n * 131)
	const pair = PAIRS[(n - 1) % PAIRS.length]

	let size, targetCount
	if (n <= 4) {
		size = 4
		targetCount = 2 + (rand() < 0.5 ? 0 : 1)
	} else if (n <= 9) {
		size = 5
		targetCount = 3 + (rand() < 0.5 ? 0 : 1)
	} else {
		size = 6
		targetCount = 4 + (rand() < 0.5 ? 0 : 1)
	}

	const total = size * size
	// 确定性撒点：随机取 targetCount 个不重复下标放目标字
	const positions = new Set()
	while (positions.size < targetCount) {
		positions.add(Math.floor(rand() * total))
	}
	const cells = []
	for (let i = 0; i < total; i++) {
		cells.push(positions.has(i) ? pair.target : pair.base)
	}

	return { pair, size, cells, targetCount }
}

export default { ZHAOCHA_PAIRS, buildZhaochaPuzzle }
