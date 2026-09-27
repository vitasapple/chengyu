/**
 * 本地进度存储（纯本地，无后端 / 无登录）
 *
 * 存储键：
 *   chengyu_progress  当前已解锁到的最大关卡 id（数字）
 *   chengyu_passed    已通关的关卡 id 数组
 *   chengyu_zhaocha   找茬达人进度 { progress, bestCoins }
 *   chengyu_lianlian  文字连连看进度 { best, total }
 *   chengyu_profile   用户资料 { avatar, nickname }
 *   chengyu_settings  设置项 { sound }
 */

const KEY_PROGRESS = 'chengyu_progress'
const KEY_PASSED = 'chengyu_passed'
const KEY_ZHAOCHA = 'chengyu_zhaocha'
const KEY_LIANLIAN = 'chengyu_lianlian'
const KEY_PROFILE = 'chengyu_profile'
const KEY_SETTINGS = 'chengyu_settings'

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

export default {
	getProgress, getPassed, isPassed, isUnlocked, completeLevel,
	getZhaochaState, recordZhaochaRun,
	getLianlianState, recordLianlianRun,
	getProfile, saveProfile, getSettings, saveSettings
}

/* ---------- 找茬达人 ---------- */

/**
 * 找茬进度
 * @returns {{ progress: number, bestCoins: number }} progress：下一次从第几题开始（累计解锁到的题号）
 */
export function getZhaochaState() {
	const v = uni.getStorageSync(KEY_ZHAOCHA) || {}
	return {
		progress: typeof v.progress === 'number' && v.progress > 0 ? v.progress : 1,
		bestCoins: typeof v.bestCoins === 'number' ? v.bestCoins : 0
	}
}

/**
 * 一局找茬结束：把题号进度向后推进，并记录单局最高金币
 * @param {number} passedInRun 本局过的题数
 * @param {number} coinsInRun 本局获得金币（含翻倍）
 * @returns {{ isBest: boolean, progress: number }} 是否刷新了单局金币纪录
 */
export function recordZhaochaRun(passedInRun, coinsInRun) {
	const s = getZhaochaState()
	const isBest = coinsInRun > s.bestCoins
	const next = {
		progress: s.progress + Math.max(0, passedInRun),
		bestCoins: Math.max(s.bestCoins, coinsInRun)
	}
	uni.setStorageSync(KEY_ZHAOCHA, next)
	return { isBest, progress: next.progress }
}

/* ---------- 文字连连看 ---------- */

/**
 * 连连看成绩
 * @returns {{ best: number, total: number }} best：单次连续完成的最多轮数；total：累计完成轮数
 */
export function getLianlianState() {
	const v = uni.getStorageSync(KEY_LIANLIAN) || {}
	return {
		best: typeof v.best === 'number' ? v.best : 0,
		total: typeof v.total === 'number' ? v.total : 0
	}
}

/**
 * 一局连连看结束（退出或全部消完时调用）
 * @param {number} rounds 本局连续完成的轮数
 */
export function recordLianlianRun(rounds) {
	const s = getLianlianState()
	const next = { best: Math.max(s.best, rounds), total: s.total + rounds }
	uni.setStorageSync(KEY_LIANLIAN, next)
	return next
}

/* ---------- 用户资料（仅本地） ---------- */

/** @returns {{ avatar: string, nickname: string }} */
export function getProfile() {
	const v = uni.getStorageSync(KEY_PROFILE) || {}
	return {
		avatar: typeof v.avatar === 'string' ? v.avatar : '',
		nickname: typeof v.nickname === 'string' ? v.nickname : ''
	}
}

/** 保存资料，只合并传入的字段 */
export function saveProfile(patch = {}) {
	const p = getProfile()
	const next = Object.assign(p, patch)
	uni.setStorageSync(KEY_PROFILE, next)
	return next
}

/* ---------- 设置项（仅本地） ---------- */

/** @returns {{ sound: boolean }} */
export function getSettings() {
	const v = uni.getStorageSync(KEY_SETTINGS) || {}
	return { sound: v.sound !== false }
}

/** 保存设置，只合并传入的字段 */
export function saveSettings(patch = {}) {
	const next = Object.assign(getSettings(), patch)
	uni.setStorageSync(KEY_SETTINGS, next)
	return next
}
