/**
 * 本地进度存储（纯本地，无后端 / 无登录）
 *
 * 存储键：
 *   chengyu_progress  当前已解锁到的最大关卡 id（数字）
 *   chengyu_passed    已通关的关卡 id 数组
 */

const KEY_PROGRESS = 'chengyu_progress'
const KEY_PASSED = 'chengyu_passed'

/** 已解锁的最大关卡 id，默认第 1 关 */
export function getProgress() {
	const v = uni.getStorageSync(KEY_PROGRESS)
	return typeof v === 'number' && v > 0 ? v : 1
}

/** 已通关的关卡 id 列表 */
export function getPassed() {
	const v = uni.getStorageSync(KEY_PASSED)
	return Array.isArray(v) ? v : []
}

/** 判断某关是否已通关 */
export function isPassed(id) {
	return getPassed().indexOf(id) !== -1
}

/** 判断某关是否可进入（<= 已解锁最大关卡） */
export function isUnlocked(id) {
	return id <= getProgress()
}

/**
 * 通关某一关：记录通关、解锁下一关。
 * @param {number} id 刚通过的关卡 id
 * @param {number} maxId 题库最大关卡 id（防止越界解锁）
 */
export function completeLevel(id, maxId) {
	const passed = getPassed()
	if (passed.indexOf(id) === -1) {
		passed.push(id)
		uni.setStorageSync(KEY_PASSED, passed)
	}

	const next = Math.min(id + 1, maxId)
	if (next > getProgress()) {
		uni.setStorageSync(KEY_PROGRESS, next)
	}
}

export default { getProgress, getPassed, isPassed, isUnlocked, completeLevel }
