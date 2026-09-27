<template>
	<view class="page">
		<!-- 顶部：关卡信息 -->
		<view class="topbar">
			<text class="level-tag">{{isDaily ? '每日一题' : '第 ' + level.id + ' 关'}}</text>
			<text class="coin-tag">🪙 {{coins}}</text>
			<text v-if="!isDaily" class="progress-tag">通关 {{passedCount}}/{{total}}</text>
		</view>

		<!-- 看图区 -->
		<view class="picture">
			<image
				v-if="level.img && !imgError"
				class="picture-img"
				:src="level.img"
				mode="aspectFit"
				@error="imgError = true"></image>
			<text v-else class="picture-emoji">{{level.pic}}</text>
		</view>

		<!-- 答案槽 -->
		<view class="slots">
			<view
				v-for="(s, i) in slots"
				:key="i"
				class="slot"
				:class="{'slot-locked': s.locked, 'slot-filled': !!s.char}"
				@tap="tapSlot(i)">
				<text class="slot-char">{{s.char}}</text>
			</view>
		</view>

		<!-- 候选字 -->
		<view class="candidates">
			<view
				v-for="(c, i) in candidates"
				:key="i"
				class="cand"
				:class="{'cand-used': c.used}"
				@tap="tapCandidate(i)">
				<text class="cand-char">{{c.char}}</text>
			</view>
		</view>

		<!-- 道具栏：保险 / 跳过 -->
		<view class="props">
			<view v-if="!insured && !solved" class="prop-btn" @tap="buyInsure">🧧 买保险（{{INSURE_COST}}币）</view>
			<text v-else-if="insured" class="prop-on">🧧 保险已生效</text>
			<view v-if="!isDaily && !solved" class="prop-btn" @tap="onSkip">⏭️ 跳过本关</view>
		</view>

		<!-- 底部操作 -->
		<view class="actions">
			<view class="btn btn-reset" @tap="resetAnswer">重来</view>
			<view class="btn btn-hint" @tap="onHint">💡 灵感提示</view>
		</view>

		<!-- 结果弹窗 -->
		<view v-if="modal.show" class="mask">
			<view class="dialog">
				<text class="dialog-title">{{modal.title}}</text>
				<text class="dialog-word">{{level.word}}</text>
				<text class="dialog-meaning">{{level.meaning}}</text>
				<text v-if="rewardCoins > 0" class="dialog-coins">🪙 获得 {{rewardCoins}} 金币</text>
				<view v-if="rewardCoins > 0 && !doubled" class="btn btn-double" @tap="onDouble">📺 看广告翻倍（+{{rewardCoins}}）</view>
				<view class="dialog-btns">
					<view class="btn btn-ghost" @tap="goHome">返回首页</view>
					<view v-if="!isDaily && hasNext" class="btn btn-primary" @tap="goNext">下一关</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { IDIOMS, DISTRACTOR_POOL } from '@/common/idioms.js'
	import { isPassed, completeLevel } from '@/common/storage.js'
	import { showRewardAd } from '@/common/ad.js'
	import { REWARD, getCoins, addCoins, spendCoins, getDailyLevel, markDailyDone } from '@/common/coins.js'

	const DISTRACTOR_COUNT = 4 // 额外干扰字数量（前 20 关）
	const DISTRACTOR_COUNT_HARD = 6 // 进阶关（21 关起）干扰字数量

	export default {
		data() {
			return {
				level: {},
				answerChars: [],
				slots: [],       // { char, from, locked }
				candidates: [],  // { char, used }
				modal: { show: false, title: '' },
				imgError: false,
				/* 金币与道具 */
				isDaily: false,
				coins: 0,
				usedHint: false,
				insured: false,
				solved: false,
				rewardCoins: 0,
				doubled: false,
				INSURE_COST: REWARD.INSURE_COST
			}
		},
		computed: {
			total() {
				return IDIOMS.length
			},
			passedCount() {
				return IDIOMS.filter(l => isPassed(l.id)).length
			},
			hasNext() {
				return this.level.id < IDIOMS.length
			}
		},
		onLoad(option) {
			this.isDaily = option.mode === 'daily'
			if (this.isDaily) {
				// 每日一题：按日期确定性选题，不影响闯关进度
				this.loadLevel(getDailyLevel(IDIOMS).id)
			} else {
				const id = Number(option.id) || 1
				this.loadLevel(id)
			}
		},
		methods: {
			/* 洗牌（Fisher-Yates，返回新数组） */
			shuffle(arr) {
				const a = arr.slice()
				for (let i = a.length - 1; i > 0; i--) {
					const j = Math.floor(Math.random() * (i + 1))
					;[a[i], a[j]] = [a[j], a[i]]
				}
				return a
			},

			/* 加载指定关卡，构建答案槽与候选字 */
			loadLevel(id) {
				const level = IDIOMS.find(l => l.id === id) || IDIOMS[0]
				this.level = level
				this.imgError = false
				this.answerChars = level.word.split('')
				this.slots = this.answerChars.map(() => ({ char: '', from: -1, locked: false }))
				this.candidates = this.buildCandidates(level, this.answerChars)
				this.modal = { show: false, title: '' }
				// 每关重置道具与奖励状态
				this.usedHint = false
				this.insured = false
				this.solved = false
				this.rewardCoins = 0
				this.doubled = false
				this.coins = getCoins()
			},

			/* 答案字 + 混淆字（形近/音近）+ 随机干扰字，打乱后生成候选 */
			buildCandidates(level, answerChars) {
				const confuse = (level.confuse || []).filter(c => !answerChars.includes(c))
				const base = level.id > 20 ? DISTRACTOR_COUNT_HARD : DISTRACTOR_COUNT
				// 随机干扰字排除答案字与混淆字，避免重复
				const pool = DISTRACTOR_POOL.filter(c => !answerChars.includes(c) && !confuse.includes(c))
				const extra = this.shuffle(pool).slice(0, Math.max(0, base - confuse.length))
				const all = this.shuffle(answerChars.concat(confuse, extra))
				return all.map(char => ({ char, used: false }))
			},

			/* 点候选字 -> 填入第一个空闲（未锁定）槽 */
			tapCandidate(i) {
				const cand = this.candidates[i]
				if (!cand || cand.used) return
				const slot = this.slots.find(s => !s.locked && s.char === '')
				if (!slot) {
					uni.showToast({ title: '没有空位了', icon: 'none' })
					return
				}
				slot.char = cand.char
				slot.from = i
				cand.used = true
				this.maybeValidate()
			},

			/* 点答案槽 -> 撤回该字（锁定的不可撤） */
			tapSlot(i) {
				const s = this.slots[i]
				if (!s || s.locked || !s.char) return
				if (s.from >= 0 && this.candidates[s.from]) {
					this.candidates[s.from].used = false
				}
				s.char = ''
				s.from = -1
			},

			/* 全部填满后校验 */
			maybeValidate() {
				if (this.slots.some(s => s.char === '')) return
				const joined = this.slots.map(s => s.char).join('')
				if (joined === this.level.word) {
					this.onCorrect()
				} else if (this.insured) {
					// 保险生效：锁住填对的字，只清掉填错的，每关仅一次
					this.insured = false
					this.keepCorrect()
					uni.showToast({ title: '🧧 保险生效：填对的字已保留', icon: 'none' })
				} else {
					uni.showToast({ title: '不对哦，再试试', icon: 'none' })
					setTimeout(() => this.clearUnlocked(), 500)
				}
			},

			/* 保险生效：把位置上填对的槽锁定，清掉填错的 */
			keepCorrect() {
				this.slots.forEach((s, i) => {
					if (s.locked) return
					if (s.char === this.answerChars[i]) {
						s.locked = true
						s.from = -1
					} else {
						if (s.from >= 0 && this.candidates[s.from]) this.candidates[s.from].used = false
						s.char = ''
						s.from = -1
					}
				})
			},

			/* 清空所有未锁定的槽 */
			clearUnlocked() {
				this.slots.forEach((s, i) => {
					if (!s.locked && s.char) {
						if (s.from >= 0 && this.candidates[s.from]) this.candidates[s.from].used = false
						s.char = ''
						s.from = -1
					}
				})
			},

			resetAnswer() {
				this.clearUnlocked()
			},

			onCorrect() {
				this.solved = true
				if (this.isDaily) {
					// 每日一题：固定奖励 + 连击天数，不写闯关进度
					const streak = markDailyDone()
					this.rewardCoins = REWARD.DAILY
					addCoins(this.rewardCoins)
					this.modal = { show: true, title: '🎉 今日挑战完成！连击 ' + streak + ' 天' }
				} else {
					const first = !isPassed(this.level.id)
					completeLevel(this.level.id, IDIOMS.length)
					let c = 0
					if (first) c += REWARD.FIRST_PASS
					if (!this.usedHint) c += REWARD.NO_HINT_BONUS
					this.rewardCoins = c
					if (c > 0) addCoins(c)
					this.modal = { show: true, title: '🎉 答对了！' }
				}
				this.coins = getCoins()
			},

			/* 结算弹窗：看广告把本关金币奖励翻倍 */
			onDouble() {
				uni.showLoading({ title: '广告加载中', mask: true })
				showRewardAd()
					.then((ok) => {
						uni.hideLoading()
						if (ok) {
							addCoins(this.rewardCoins)
							this.doubled = true
							this.coins = getCoins()
							uni.showToast({ title: '金币已翻倍 🪙', icon: 'none' })
						} else {
							uni.showToast({ title: '未看完广告，无法翻倍', icon: 'none' })
						}
					})
					.catch(() => {
						uni.hideLoading()
						uni.showToast({ title: '广告出错了，稍后再试', icon: 'none' })
					})
			},

			/* 买保险：本关第一次答错时，填对的字不重置 */
			buyInsure() {
				uni.showModal({
					title: '本关保险',
					content: `花 ${REWARD.INSURE_COST} 金币买保险：本关第一次填错时，位置上填对的字会保留，只清掉填错的。`,
					confirmText: `花${REWARD.INSURE_COST}币买`,
					cancelText: '不需要',
					success: (res) => {
						if (!res.confirm) return
						if (spendCoins(REWARD.INSURE_COST)) {
							this.insured = true
							this.coins = getCoins()
							uni.showToast({ title: '🧧 保险已生效', icon: 'none' })
						} else {
							uni.showToast({ title: '金币不足，去签到或通关赚金币吧', icon: 'none' })
						}
					}
				})
			},

			/* 跳过本关：100 金币 或 看一次广告 */
			onSkip() {
				uni.showModal({
					title: '跳过本关',
					content: `花 ${REWARD.SKIP_COST} 金币直接跳过；或点「看广告」免费跳过。跳过后本关不计入无提示奖励。`,
					confirmText: `${REWARD.SKIP_COST}金币`,
					cancelText: '看广告',
					success: (res) => {
						if (res.confirm) {
							if (spendCoins(REWARD.SKIP_COST)) {
								this.skipLevel()
							} else {
								uni.showToast({ title: '金币不足，可选看广告免费跳过', icon: 'none' })
							}
							return
						}
						// 取消按钮 = 看广告免费跳过
						uni.showLoading({ title: '广告加载中', mask: true })
						showRewardAd()
							.then((ok) => {
								uni.hideLoading()
								if (ok) this.skipLevel()
								else uni.showToast({ title: '未看完广告，无法跳过', icon: 'none' })
							})
							.catch(() => {
								uni.hideLoading()
								uni.showToast({ title: '广告出错了，稍后再试', icon: 'none' })
							})
					}
				})
			},

			/* 执行跳过：视为通关但不发金币，直接进入下一关 */
			skipLevel() {
				completeLevel(this.level.id, IDIOMS.length)
				uni.showToast({ title: '已跳过本关', icon: 'none' })
				if (this.hasNext) {
					setTimeout(() => this.loadLevel(this.level.id + 1), 600)
				} else {
					setTimeout(() => this.goHome(), 600)
				}
			},

			/* 首页是 tabBar 页，必须用 switchTab */
			goHome() {
				uni.switchTab({ url: '/pages/index/index' })
			},

			goNext() {
				const nextId = this.level.id + 1
				if (nextId <= IDIOMS.length) {
					this.loadLevel(nextId)
				} else {
					this.goHome()
				}
			},

			/* 灯泡：弹确认框 -> 看激励视频 -> 发一个字的提示 */
			onHint() {
				uni.showModal({
					title: '灵感提示',
					content: '看一段广告即可获得一个字的提示，确定吗？',
					confirmText: '看广告',
					cancelText: '取消',
					success: (res) => {
						if (!res.confirm) return
						uni.showLoading({ title: '广告加载中', mask: true })
						showRewardAd()
							.then((ok) => {
								uni.hideLoading()
								if (ok) {
									this.revealHint()
								} else {
									uni.showToast({ title: '未看完广告，无法获得提示', icon: 'none' })
								}
							})
							.catch(() => {
								uni.hideLoading()
								uni.showToast({ title: '广告出错了，稍后再试', icon: 'none' })
							})
					}
				})
			},

			/* 随机挑一个未锁定的槽，填入正确字并锁定 */
			revealHint() {
				this.usedHint = true
				const openIdx = this.slots
					.map((s, i) => ({ s, i }))
					.filter(o => !o.s.locked)
				if (openIdx.length === 0) {
					uni.showToast({ title: '已经全是提示啦', icon: 'none' })
					return
				}
				const target = openIdx[Math.floor(Math.random() * openIdx.length)]
				const idx = target.i
				const desired = this.answerChars[idx]

				// 先清掉目标槽已有的字（若之前是手动填的）
				if (target.s.char && target.s.from >= 0 && this.candidates[target.s.from]) {
					this.candidates[target.s.from].used = false
				}

				// 消耗一个正确字的候选实例；不够时从别的未锁定槽腾出一个
				if (!this.consumeCandidate(desired)) {
					const other = this.slots.findIndex((s, j) => j !== idx && !s.locked && s.char === desired)
					if (other !== -1) {
						const s = this.slots[other]
						if (s.from >= 0 && this.candidates[s.from]) this.candidates[s.from].used = false
						s.char = ''
						s.from = -1
						this.consumeCandidate(desired)
					}
				}

				this.slots[idx] = { char: desired, from: -1, locked: true }
				this.maybeValidate()
			},

			consumeCandidate(ch) {
				const i = this.candidates.findIndex(c => !c.used && c.char === ch)
				if (i >= 0) {
					this.candidates[i].used = true
					return true
				}
				return false
			}
		}
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 30rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, #fdfbf5 0%, #f3eee1 100%);
		display: flex;
		flex-direction: column;
	}

	.topbar {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.level-tag {
		font-size: 30rpx;
		font-weight: bold;
		color: #6b4f2a;
	}

	.coin-tag {
		font-size: 28rpx;
		font-weight: bold;
		color: #b8860b;
		background: #fff6dd;
		border: 2rpx solid #eeda9e;
		border-radius: 26rpx;
		padding: 4rpx 18rpx;
	}

	.progress-tag {
		font-size: 26rpx;
		color: #a08a68;
	}

	/* 看图 */
	.picture {
		margin: 30rpx 0;
		height: 360rpx;
		border-radius: 24rpx;
		background: #fff;
		box-shadow: 0 8rpx 20rpx rgba(150, 120, 70, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.picture-img {
		width: 90%;
		height: 90%;
	}

	.picture-emoji {
		font-size: 140rpx;
	}

	/* 答案槽 */
	.slots {
		display: flex;
		justify-content: center;
		margin-bottom: 40rpx;
	}

	.slot {
		width: 120rpx;
		height: 120rpx;
		margin: 0 12rpx;
		border-radius: 16rpx;
		border: 2rpx dashed #cbb994;
		background: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.slot-filled {
		border-style: solid;
		border-color: #d8b878;
	}

	.slot-locked {
		background: #eaf7ea;
		border-color: #7bc47f;
	}

	.slot-char {
		font-size: 60rpx;
		font-weight: bold;
		color: #5a4324;
	}

	/* 候选字 */
	.candidates {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
	}

	.cand {
		width: 104rpx;
		height: 104rpx;
		margin: 12rpx;
		border-radius: 16rpx;
		background: #fff;
		box-shadow: 0 4rpx 12rpx rgba(150, 120, 70, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.cand-used {
		opacity: 0.3;
	}

	.cand-char {
		font-size: 54rpx;
		color: #5a4324;
	}

	/* 道具栏 */
	.props {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20rpx;
		margin-bottom: 10rpx;
	}

	.prop-btn {
		padding: 12rpx 28rpx;
		border-radius: 30rpx;
		background: #fff;
		border: 2rpx solid #e3d6bc;
		font-size: 26rpx;
		color: #8a6d3b;
	}

	.prop-on {
		font-size: 26rpx;
		color: #4caf50;
		padding: 12rpx 28rpx;
	}

	/* 操作按钮 */
	.actions {
		margin-top: auto;
		display: flex;
		justify-content: space-around;
		padding: 40rpx 0 20rpx;
	}

	.btn {
		min-width: 220rpx;
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
	}

	.btn-reset {
		background: #fff;
		color: #a08a68;
		border: 2rpx solid #e3d6bc;
	}

	.btn-hint {
		background: linear-gradient(90deg, #ffcf5c 0%, #ff9f43 100%);
		color: #fff;
		font-weight: bold;
	}

	.btn-primary {
		background: #6b4f2a;
		color: #fff;
	}

	.btn-ghost {
		background: #f0ece0;
		color: #6b4f2a;
	}

	/* 弹窗 */
	.mask {
		position: fixed;
		left: 0;
		top: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.45);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.dialog {
		width: 560rpx;
		padding: 50rpx 40rpx;
		border-radius: 28rpx;
		background: #fff;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dialog-title {
		font-size: 40rpx;
		font-weight: bold;
		color: #4caf50;
	}

	.dialog-word {
		margin-top: 20rpx;
		font-size: 52rpx;
		font-weight: bold;
		letter-spacing: 6rpx;
		color: #5a4324;
	}

	.dialog-meaning {
		margin-top: 20rpx;
		font-size: 28rpx;
		line-height: 1.6;
		color: #7a6a52;
		text-align: center;
	}

	.dialog-coins {
		margin-top: 20rpx;
		font-size: 30rpx;
		font-weight: bold;
		color: #b8860b;
	}

	.btn-double {
		margin-top: 20rpx;
		width: 100%;
		background: linear-gradient(90deg, #ffe082 0%, #ffb300 100%);
		color: #7a5200;
		font-weight: bold;
		font-size: 28rpx;
	}

	.dialog-btns {
		margin-top: 40rpx;
		display: flex;
		justify-content: space-around;
		width: 100%;
	}
</style>
