<template>
	<view class="page">
		<!-- 顶部状态 -->
		<view class="topbar">
			<text class="tag">第 {{qNo}} 题</text>
			<text class="tag time" :class="{'time-urgent': phase === 'playing' && left <= 10}">⏱ {{left}}s</text>
			<text class="tag coin">🪙 {{coins}}</text>
		</view>

		<!-- 题干 -->
		<view class="question">
			<text class="q-tip">在下面的字里找出所有的</text>
			<text class="q-target">{{puzzle.pair.target}}</text>
			<text class="q-count">已找 {{foundCount}} / {{puzzle.targetCount}}</text>
		</view>

		<!-- 字格 -->
		<view class="board">
			<view
				v-for="(c, i) in puzzle.cells"
				:key="i"
				class="cell"
				:class="cellClass(c, i)"
				:style="cellStyle"
				@tap="tapCell(i)">
				<text class="cell-char" :class="fontClass">{{c.char}}</text>
			</view>
		</view>

		<!-- 底部操作 -->
		<view class="actions">
			<view class="btn btn-ad" @tap="onExtraTime">📺 看广告 +{{AD_TIME}}秒</view>
			<view class="btn btn-ghost" @tap="restart">重开本局</view>
		</view>

		<!-- 开始 / 结算 弹窗 -->
		<view v-if="phase !== 'playing'" class="mask">
			<view class="dialog">
				<block v-if="phase === 'ready'">
					<text class="dialog-title">找茬达人</text>
					<view class="dialog-lines">
						<text class="dialog-line">60 秒倒计时，点出全部目标字</text>
						<text class="dialog-line">点错扣 {{MISS_PENALTY}} 秒，过一题奖 {{RUN_BONUS_TIME}} 秒</text>
						<text class="dialog-line">每过一题 +{{REWARD_PASS}} 金币，可看广告翻倍</text>
					</view>
					<view class="btn btn-primary dialog-btn" @tap="start">开始挑战</view>
				</block>
				<block v-else>
					<text class="dialog-title">⏱ 时间到！</text>
					<view class="dialog-lines">
						<text class="dialog-line">本局过了 {{passedInRun}} 题，获得 {{runCoins}} 金币</text>
						<text v-if="isBest" class="dialog-line best">🏆 刷新单局金币纪录</text>
					</view>
					<view v-if="runCoins > 0 && !doubled" class="btn btn-double dialog-btn" @tap="onDouble">📺 看广告翻倍（+{{runCoins}}）</view>
					<view class="dialog-btns">
						<view class="btn btn-ghost" @tap="goHub">返回合集</view>
						<view class="btn btn-primary" @tap="start">再来一局</view>
					</view>
				</block>
			</view>
		</view>
	</view>
</template>

<script>
	import { buildZhaochaPuzzle } from '@/common/zhaocha.js'
	import { getCoins, addCoins, REWARD } from '@/common/coins.js'
	import { getZhaochaState, recordZhaochaRun } from '@/common/storage.js'
	import { showRewardAd } from '@/common/ad.js'

	const TOTAL_TIME = 60   // 开局秒数
	const MISS_PENALTY = 5  // 点错扣秒
	const RUN_BONUS_TIME = 8 // 过一题奖励秒数
	const AD_TIME = 15      // 看广告补时

	export default {
		data() {
			return {
				phase: 'ready', // ready | playing | over
				qNo: 1,
				puzzle: { pair: { base: '', target: '' }, cells: [], targetCount: 0, size: 4 },
				found: [],      // 与 cells 等长，标记已找到的下标
				left: TOTAL_TIME,
				coins: 0,
				passedInRun: 0,
				runCoins: 0,
				doubled: false,
				bestBefore: 0,
				recorded: true,
				badCell: -1,
				timer: null,
				TOTAL_TIME,
				MISS_PENALTY,
				RUN_BONUS_TIME,
				AD_TIME,
				REWARD_PASS: REWARD.ZHAOCHA_PASS
			}
		},
		computed: {
			foundCount() {
				return this.found.length
			},
			isBest() {
				return this.runCoins > this.bestBefore
			},
			cellStyle() {
				const pct = 100 / this.puzzle.size
				return `width: ${pct}%; padding-top: ${pct}%`
			},
			fontClass() {
				return this.puzzle.size >= 6 ? 'font-6' : (this.puzzle.size === 5 ? 'font-5' : 'font-4')
			}
		},
		onLoad() {
			this.coins = getCoins()
		},
		onUnload() {
			this.stopTimer()
			this.settle()
		},
		methods: {
			/* 开始一局：从已解锁的题号接着挑战 */
			start() {
				this.stopTimer()
				this.settle() // 先把上一局成绩落盘
				const s = getZhaochaState()
				this.qNo = s.progress
				this.bestBefore = s.bestCoins
				this.left = TOTAL_TIME
				this.passedInRun = 0
				this.runCoins = 0
				this.doubled = false
				this.recorded = false
				this.badCell = -1
				this.loadQuestion(this.qNo)
				this.phase = 'playing'
				this.startTimer()
			},

			loadQuestion(n) {
				const p = buildZhaochaPuzzle(n)
				this.puzzle = {
					pair: p.pair,
					size: p.size,
					targetCount: p.targetCount,
					cells: p.cells.map(ch => ({ char: ch }))
				}
				this.found = []
			},

			cellClass(c, i) {
				return {
					'cell-found': this.found.indexOf(i) !== -1,
					'cell-bad': this.badCell === i
				}
			},

			tapCell(i) {
				if (this.phase !== 'playing') return
				if (this.found.indexOf(i) !== -1) return
				const cell = this.puzzle.cells[i]
				if (!cell) return

				if (cell.char === this.puzzle.pair.target) {
					this.found.push(i)
					if (this.found.length >= this.puzzle.targetCount) {
						this.onQuestionCleared()
					}
				} else {
					this.left = Math.max(0, this.left - MISS_PENALTY)
					this.badCell = i
					setTimeout(() => { this.badCell = -1 }, 300)
					uni.showToast({ title: `看仔细，扣 ${MISS_PENALTY} 秒`, icon: 'none' })
				}
			},

			onQuestionCleared() {
				this.passedInRun += 1
				this.runCoins += REWARD.ZHAOCHA_PASS
				addCoins(REWARD.ZHAOCHA_PASS)
				this.coins = getCoins()
				this.left = Math.min(99, this.left + RUN_BONUS_TIME)
				uni.showToast({ title: `+${REWARD.ZHAOCHA_PASS}🪙 奖励 ${RUN_BONUS_TIME} 秒`, icon: 'none' })
				setTimeout(() => {
					if (this.phase !== 'playing') return
					this.qNo += 1
					this.loadQuestion(this.qNo)
				}, 500)
			},

			startTimer() {
				this.timer = setInterval(() => {
					this.left -= 1
					if (this.left <= 0) {
						this.left = 0
						this.over()
					}
				}, 1000)
			},

			stopTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},

			over() {
				this.stopTimer()
				this.phase = 'over'
			},

			/* 成绩落盘：每局只写一次（退出或开新局时触发，故翻倍后的金币也能计入） */
			settle() {
				if (this.recorded || this.passedInRun <= 0) return
				recordZhaochaRun(this.passedInRun, this.runCoins)
				this.recorded = true
			},

			/* 结算弹窗：看广告把本局金币翻倍 */
			onDouble() {
				uni.showLoading({ title: '广告加载中', mask: true })
				showRewardAd()
					.then((ok) => {
						uni.hideLoading()
						if (ok) {
							addCoins(this.runCoins)
							this.coins = getCoins()
							this.runCoins *= 2
							this.doubled = true
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

			/* 看广告补时 */
			onExtraTime() {
				if (this.phase !== 'playing') {
					uni.showToast({ title: '先开始一局吧', icon: 'none' })
					return
				}
				uni.showModal({
					title: '续命',
					content: `看一段广告即可 +${AD_TIME} 秒，确定吗？`,
					confirmText: '看广告',
					success: (res) => {
						if (!res.confirm) return
						uni.showLoading({ title: '广告加载中', mask: true })
						showRewardAd()
							.then((ok) => {
								uni.hideLoading()
								if (ok) {
									this.left = Math.min(99, this.left + AD_TIME)
									uni.showToast({ title: `+${AD_TIME} 秒，继续！`, icon: 'none' })
								} else {
									uni.showToast({ title: '未看完广告，无法补时', icon: 'none' })
								}
							})
							.catch(() => {
								uni.hideLoading()
								uni.showToast({ title: '广告出错了，稍后再试', icon: 'none' })
							})
					}
				})
			},

			restart() {
				this.settle()
				this.start()
			},

			goHub() {
				/* switchTab 不会卸页，onUnload 不触发，这里主动落盘成绩 */
				this.stopTimer()
				this.settle()
				uni.switchTab({ url: '/pages/hub/hub' })
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

	.tag {
		font-size: 28rpx;
		font-weight: bold;
		color: #6b4f2a;
	}

	.time {
		color: #b8860b;
	}

	.time-urgent {
		color: #e53935;
	}

	.coin {
		color: #b8860b;
		background: #fff6dd;
		border: 2rpx solid #eeda9e;
		border-radius: 26rpx;
		padding: 4rpx 18rpx;
	}

	.question {
		margin: 30rpx 0;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.q-tip {
		font-size: 26rpx;
		color: #a08a68;
	}

	.q-target {
		margin-top: 8rpx;
		font-size: 96rpx;
		font-weight: bold;
		line-height: 1.2;
		color: #4caf50;
	}

	.q-count {
		margin-top: 6rpx;
		font-size: 24rpx;
		color: #a08a68;
	}

	.board {
		display: flex;
		flex-wrap: wrap;
		width: 100%;
		max-width: 640rpx;
		margin: 0 auto;
		align-self: center;
	}

	.cell {
		box-sizing: border-box;
		position: relative;
	}

	.cell-char {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		transform: translateY(-50%);
		text-align: center;
		color: #5a4324;
		font-weight: bold;
	}

	.font-4 { font-size: 72rpx; }
	.font-5 { font-size: 60rpx; }
	.font-6 { font-size: 48rpx; }

	/* 内边距由 .cell 的百分比宽高决定，这里用伪边框做格子 */
	.cell::after {
		content: '';
		position: absolute;
		top: 8rpx;
		left: 8rpx;
		right: 8rpx;
		bottom: 8rpx;
		border-radius: 14rpx;
		background: #fff;
		box-shadow: 0 4rpx 10rpx rgba(150, 120, 70, 0.1);
		z-index: 0;
	}

	.cell-char { z-index: 1; }

	.cell-found::after {
		background: #eaf7ea;
		box-shadow: none;
		border: 2rpx solid #7bc47f;
	}

	.cell-found .cell-char {
		color: #4caf50;
	}

	.cell-bad::after {
		background: #fdecea;
	}

	.cell-bad .cell-char {
		color: #e53935;
	}

	.actions {
		margin-top: auto;
		display: flex;
		justify-content: space-around;
		padding: 40rpx 0 20rpx;
	}

	.btn {
		min-width: 240rpx;
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 30rpx;
	}

	.btn-ad {
		background: linear-gradient(90deg, #ffe082 0%, #ffb300 100%);
		color: #7a5200;
		font-weight: bold;
	}

	.btn-ghost {
		background: #f0ece0;
		color: #6b4f2a;
	}

	.btn-primary {
		background: #6b4f2a;
		color: #fff;
	}

	.btn-double {
		background: linear-gradient(90deg, #ffe082 0%, #ffb300 100%);
		color: #7a5200;
		font-weight: bold;
	}

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
		width: 580rpx;
		padding: 50rpx 40rpx;
		border-radius: 28rpx;
		background: #fff;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dialog-title {
		font-size: 42rpx;
		font-weight: bold;
		color: #6b4f2a;
	}

	.dialog-lines {
		margin-top: 24rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.dialog-line {
		font-size: 28rpx;
		line-height: 1.8;
		color: #7a6a52;
		text-align: center;
	}

	.best {
		color: #b8860b;
		font-weight: bold;
	}

	.dialog-btn {
		margin-top: 36rpx;
	}

	.dialog-btns {
		margin-top: 36rpx;
		display: flex;
		justify-content: space-around;
		width: 100%;
	}
</style>
