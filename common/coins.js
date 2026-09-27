/**
 * 金币 / 签到 / 每日一题（纯本地存储，无后端）
 *
 * 存储键：
 *   chengyu_coins   金币余额（数字）
 *   chengyu_sign    { last: 'YYYY-MM-DD', streak: number } 签到记录
 *   chengyu_daily   { date: 'YYYY-MM-DD', streak: number } 每日一题记录
 *
 * 设计约定（见玩法规则）：
 *   - 提示只能用广告换，金币买不到 —— 金币只消耗在跳过/保险上
 *   - 通关金币 = 首通 20 + 无提示加成 10，可看广告翻倍
 *   - 签到奖励 = 10 + (连签-1)*5，封顶 40，断签重新计算
 *   - 每日一题按日期确定性选题（全网同题），答对 +50，可翻倍
 */

const KEY_COINS = 'chengyu_coins'
const KEY_SIGN = 'chengyu_sign'
const KEY_DAILY = 'chengyu_daily'

/* 金额与消耗常量 */
export const REWARD = {
	FIRST_PASS: 20,    // 首次通关
	NO_HINT_BONUS: 10, // 全程未用提示加成
	DAILY: 50,         // 每日一题答对
	SKIP_COST: 100,    // 跳过一关
	INSURE_COST: 50    // 本关保险
}

/* ---------- 日期工具 ---------- */

function fmtDate(d) {
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${d.getFullYear()}-${m}-${day}`
}

/** 今天的 YYYY-MM-DD，offset 为天数偏移（昨天 = -1） */
function dateStr(offset = 0) {
	const d = new Date()
	d.setDate(d.getDate() + offset)
	return fmtDate(d)
}

export function isToday(str) {
	return str === dateStr()
}

/* ---------- 金币余额 ---------- */

export function getCoins() {
	const v = uni.getStorageSync(KEY_COINS)
	return typeof v === 'number' && v > 0 ? v : 0
}

export function addCoins(n) {
	const v = getCoins() + n
	uni.setStorageSync(KEY_COINS, v)
	return v
}

/** 尝试消费 n 金币，余额不足返回 false */
export function spendCoins(n) {
	const bal = getCoins()
	if (bal < n) return false
	uni.setStorageSync(KEY_COINS, bal - n)
	return true
}

/* ---------- 每日签到 ---------- */

/**
 * 签到信息（供首页展示）
 * @returns {{ signedToday: boolean, streak: number, nextReward: number }}
 */
export function getSignInfo() {
	const s = uni.getStorageSync(KEY_SIGN) || { last: '', streak: 0 }
	const signedToday = isToday(s.last)
	// 连签延续条件：上次签到是昨天
	const contStreak = isYesterday(s.last) ? s.streak : 0
	return {
		signedToday,
		streak: s.streak,
		nextReward: signReward(contStreak + 1)
	}
}

function isYesterday(str) {
	return str === dateStr(-1)
}

function signReward(streak) {
	return Math.min(10 + (streak - 1) * 5, 40)
}

/**
 * 执行签到。今天已签则返回 { ok: false }。
 * @returns {{ ok: boolean, coins?: number, streak?: number }}
 */
export function signIn() {
	const s = uni.getStorageSync(KEY_SIGN) || { last: '', streak: 0 }
	if (isToday(s.last)) return { ok: false }
	const streak = (isYesterday(s.last) ? s.streak : 0) + 1
	const coins = signReward(streak)
	uni.setStorageSync(KEY_SIGN, { last: dateStr(), streak })
	addCoins(coins)
	return { ok: true, coins, streak }
}

/* ---------- 每日一题 ---------- */

/**
 * 按日期确定性选题（同一日期所有玩家看到同一题）。
 * @param {Array} idioms 题库数组
 * @returns 关卡对象
 */
export function getDailyLevel(idioms) {
	const key = dateStr()
	let hash = 0
	for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 997
	return idioms[hash % idioms.length]
}

/**
 * 每日一题状态（供首页展示）
 * @returns {{ doneToday: boolean, streak: number }}
 */
export function getDailyInfo() {
	const d = uni.getStorageSync(KEY_DAILY) || { date: '', streak: 0 }
	return { doneToday: isToday(d.date), streak: d.streak }
}

/**
 * 完成今天的每日一题，返回新的连击天数。
 */
export function markDailyDone() {
	const d = uni.getStorageSync(KEY_DAILY) || { date: '', streak: 0 }
	if (isToday(d.date)) return d.streak
	const streak = (d.date === dateStr(-1) ? d.streak : 0) + 1
	uni.setStorageSync(KEY_DAILY, { date: dateStr(), streak })
	return streak
}

export default {
	REWARD, getCoins, addCoins, spendCoins,
	getSignInfo, signIn,
	getDailyLevel, getDailyInfo, markDailyDone
}
