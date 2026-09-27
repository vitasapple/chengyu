/**
 * 文字连连看 · 网格生成与规则判定（纯函数，无状态）
 *
 * 玩法：6×4 网格铺 24 个字块 = 6 组成语各拆 4 字。
 *       玩家按成语字序依次点选，且相邻两次点击的字块必须在网格中相邻（含斜向），
 *       连满 4 个字则这组成语消除。
 *
 * 关键设计：开局用「随机漫步」把每个成语铺成一条 4 格的连通路径，
 *          因此每个成语天然可连；消除后原格子用新成语按同样的路径顺序补位，
 *          所以任意时刻棋盘都是可解的，不会出现死局。
 */

export const GRID_COLS = 6
export const GRID_ROWS = 4
export const WORD_LEN = 4

/* ---------- 网格工具 ---------- */

export function cellPos(idx) {
	return { r: Math.floor(idx / GRID_COLS), c: idx % GRID_COLS }
}

/** 两格是否相邻（含斜向，即切比雪夫距离为 1） */
export function isAdjacent(a, b) {
	if (a === b) return false
	const pa = cellPos(a)
	const pb = cellPos(b)
	return Math.abs(pa.r - pb.r) <= 1 && Math.abs(pa.c - pb.c) <= 1
}

function neighbors(idx) {
	const { r, c } = cellPos(idx)
	const out = []
	for (let dr = -1; dr <= 1; dr++) {
		for (let dc = -1; dc <= 1; dc++) {
			if (dr === 0 && dc === 0) continue
			const nr = r + dr
			const nc = c + dc
			if (nr < 0 || nr >= GRID_ROWS || nc < 0 || nc >= GRID_COLS) continue
			out.push(nr * GRID_COLS + nc)
		}
	}
	return out
}

const TOTAL = GRID_COLS * GRID_ROWS

/* ---------- 布局生成 ---------- */

/**
 * 把整个网格划分为 6 条长度为 4 的连通路径（每条路径放一个成语）。
 * 做法：先求一条遍历全部 24 格的随机哈密顿路径（Warnsdorff 启发 + 回溯），
 *      再按顺序切成 6 段 —— 天然不重叠、全覆盖，且段内相邻，形状比规则分块更随机。
 * @param {Function} rand 返回 [0,1) 的随机数函数
 * @returns {number[][]} 6 个数组，每个是 4 个格子下标，顺序即字序
 */
export function generateLayout(rand = Math.random) {
	const path = hamiltonPath(rand)
	const groups = []
	for (let i = 0; i + WORD_LEN <= path.length; i += WORD_LEN) {
		groups.push(path.slice(i, i + WORD_LEN))
	}
	return groups
}

/** 随机哈密顿路径：遍历网格每一格恰好一次 */
function hamiltonPath(rand) {
	const start = Math.floor(rand() * TOTAL)
	const order = [start]
	const visited = new Set([start])
	let steps = 0
	const MAX_STEPS = 20000 // 回溯上限，防病态情况下转太久

	/** 候选格在未访问邻居中的数量（Warnsdorff：优先选出口最少的） */
	const onward = (cell) => neighbors(cell).filter(n => !visited.has(n)).length

	function extend() {
		if (order.length === TOTAL) return true
		if (++steps > MAX_STEPS) return false
		const cur = order[order.length - 1]
		let opts = neighbors(cur).filter(n => !visited.has(n))
		// 打乱后按“后续出口数”升序，出口相同时保持随机
		opts = shuffle(opts, rand).sort((a, b) => onward(a) - onward(b))
		for (const next of opts) {
			order.push(next)
			visited.add(next)
			if (extend()) return true
			visited.delete(order.pop())
		}
		return false
	}

	if (extend()) return order
	// 兜底：行内蛇形路径（一定合法，只是形状规则）
	const snake = []
	for (let r = 0; r < GRID_ROWS; r++) {
		for (let c = 0; c < GRID_COLS; c++) {
			snake.push(r * GRID_COLS + (r % 2 === 0 ? c : GRID_COLS - 1 - c))
		}
	}
	return snake
}

function shuffle(arr, rand) {
	const a = arr.slice()
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1))
		a[i] = a[j]
		a[j] = a[i]
	}
	return a
}

/* ---------- 回合构建 ---------- */

/** 从题库随机抽 n 个成语（不足时循环补满） */
export function pickIdioms(idioms, n, rand = Math.random) {
	const pool = idioms.filter(l => typeof l.word === 'string' && l.word.length === WORD_LEN)
	const out = []
	const usedIdx = new Set()
	while (out.length < n && pool.length) {
		const i = Math.floor(rand() * pool.length)
		if (usedIdx.has(i)) {
			if (usedIdx.size >= pool.length) {
				usedIdx.clear()
				out.length = 0
			}
			continue
		}
		usedIdx.add(i)
		out.push(pool[i])
	}
	return out
}

/**
 * 构建一整轮棋盘。
 * @param {Array} idioms 题库（IDIOMS）
 * @returns {{ cells: Array, groups: Array }}
 *   cells：长度 24 的数组，元素为 { char, groupId, order, cleared }
 *   groups：{ id, word, meaning, cells:[4] } 列表
 */
export function buildRound(idioms, rand = Math.random) {
	const layout = generateLayout(rand)
	const words = pickIdioms(idioms, layout.length, rand)
	return fillGroups(layout, words)
}

/**
 * 补位：用新成语替换已消除的某一组，沿用该组原有的格子路径，保证仍可连。
 * @param {object} round buildRound 的结果（不改入参，返回新对象）
 * @param {number} groupId 被消除的组 id
 * @param {object} idiom 新成语
 */
export function refillGroup(round, groupId, idiom) {
	const cells = round.cells.map(c => Object.assign({}, c))
	const groups = round.groups.map(g => Object.assign({}, g))
	const group = groups.find(g => g.id === groupId)
	if (group && idiom) {
		group.word = idiom.word
		group.meaning = idiom.meaning
		group.cleared = false
		group.cells.forEach((cellIdx, order) => {
			const tile = cells[cellIdx]
			tile.char = idiom.word[order]
			tile.groupId = groupId
			tile.order = order
			tile.cleared = false
			tile.renew = true
		})
	}
	return { cells, groups }
}

function fillGroups(layout, words) {
	const cells = new Array(TOTAL).fill(null)
	const groups = layout.map((path, gi) => {
		const idiom = words[gi % words.length]
		path.forEach((cellIdx, order) => {
			cells[cellIdx] = {
				char: idiom.word[order],
				groupId: gi,
				order,
				cleared: false,
				renew: false
			}
		})
		return { id: gi, word: idiom.word, meaning: idiom.meaning, cells: path.slice(), cleared: false }
	})
	return { cells, groups }
}

/** 当前是否已全部消除（一轮结束） */
export function isRoundCleared(round) {
	return round.groups.every(g => g.cleared)
}

/**
 * 提示：随机挑一组尚未消除的成语，返回它的格子序列。
 * 因为每组在生成/补位时都是连通路径，所以任意未消除组都可连。
 * @returns {{ groupId: number, cells: number[] }|null}
 */
export function findHint(round, rand = Math.random) {
	const open = round.groups.filter(g => !g.cleared)
	if (!open.length) return null
	const g = open[Math.floor(rand() * open.length)]
	return { groupId: g.id, cells: g.cells.slice() }
}

/**
 * 判定一次点击是否可以接在当前链上。
 * @param {Array} chain 当前已选格子下标（按点击顺序）
 * @param {Array} cells 棋盘 cells
 * @param {number} idx 本次点击的格子下标
 * @returns {{ ok: boolean, reason?: string }}
 */
export function tryAppend(chain, cells, idx) {
	const tile = cells[idx]
	if (!tile || tile.cleared) return { ok: false, reason: 'empty' }
	if (chain.includes(idx)) return { ok: false, reason: 'same' }

	if (chain.length === 0) {
		// 必须从每个成语的第一个字起笔
		if (tile.order !== 0) return { ok: false, reason: 'start' }
		return { ok: true }
	}

	const head = cells[chain[chain.length - 1]]
	if (tile.groupId !== head.groupId) return { ok: false, reason: 'group' }
	if (tile.order !== head.order + 1) return { ok: false, reason: 'order' }
	if (!isAdjacent(chain[chain.length - 1], idx)) return { ok: false, reason: 'far' }
	return { ok: true }
}

/** 当前链是否已连满一组（4 个字） */
export function isChainDone(chain, cells) {
	if (chain.length !== WORD_LEN) return false
	const first = cells[chain[0]]
	return !!first && first.order === 0 && chain.every((i, o) => cells[i].order === o)
}

export default {
	GRID_COLS, GRID_ROWS, WORD_LEN,
	isAdjacent, generateLayout, buildRound, refillGroup,
	pickIdioms, tryAppend, isChainDone, isRoundCleared, findHint
}
