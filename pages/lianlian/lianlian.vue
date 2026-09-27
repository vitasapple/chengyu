<template>
	<view class="page">
		<!-- 顶部状态 -->
		<view class="topbar">
			<text class="tag">第 {{roundNo}} 轮</text>
			<text class="tag">⏱ {{seconds}}s</text>
			<text class="tag coin">🪙 {{coins}}</text>
		</view>

		<!-- 规则提示 -->
		<view class="hint">
			<text class="hint-line">从某一组成语的第一个字起笔，依次连着点（可走斜角）</text>
			<text class="hint-line">本轮已消 {{clearedCount}} / {{GROUP_NEED}} 组</text>
		</view>

		<!-- 当前链 -->
		<view class="chain">
			<view v-for="(idx, i) in chain" :key="i" class="chain-cell" @tap="undoLast(i)">
				<text class="chain-char">{{round.cells[idx].char}}</text>
			</view>
			<text v-if="chain.length === 0" class="chain-empty">未选择 · 点字块起笔</text>
		</view>

		<!-- 字块网格 -->
		<view class="board">
			<view
				v-for="(t, i) in round.cells"
				:key="i"
				class="tile"
				:class="tileClass(t, i)"
				@tap="tapTile(i)">
				<text class="tile-char">{{t.cleared ? '' : t.char}}</text>
				<text v-if="chain.indexOf(i) !== -1" class="tile-step">{{chain.indexOf(i) + 1}}</text>
			</view>
		</view>

		<!-- 底部操作 -->
		<view class="actions">
			<view class="btn btn-ad" @tap="onHint">💡 看广告提示一组</view>
			<view class="btn btn-ghost" @tap="clearChain">清空选择</view>
		</view>

		<!-- 开始 / 轮次结算 -->
		<view v-if="phase !== 'playing'" class="mask">
			<view class="dialog">
				<block v-if="phase === 'ready'">
					<text class="dialog-title">文字连连看</text>
					<view class="dialog-lines">
						<text class="dialog-line">24 个字块里藏着 6 组成语</text>
						<text class="dialog-line">按字序一笔画连出即可消除，消完 6 组为一轮</text>
						<text class="dialog-line">每完成一轮 +{{REWARD_ROUND}} 金币，可看广告翻倍</text>
					</view>
					<view class="btn btn-primary dialog-btn" @tap="startRun">开始</view>
				</block>
				<block v-else>
					<text class="dialog-title">🎉 第 {{roundNo}} 轮完成！</text>
					<view class="dialog-lines">
						<text class="dialog-line">用时 {{seconds}} 秒，获得 {{roundCoins}} 金币</text>
						<text v-if="isBest" class="dialog-line best">🏆 刷新最长连轮纪录</text>
					</view>
					<view v-if="roundCoins > 0 && !doubled" class="btn btn-double dialog-btn" @tap="onDouble">📺 看广告翻倍（+{{roundCoins}}）</view>
					<view class="dialog-btns">
						<view class="btn btn-ghost" @tap="goHub">见好就收</view>
						<view class="btn btn-primary" @tap="nextRound">下一轮</view>
					</view>
				</block>
			</view>
		</view>
	</view>
</template>

<script>
	import { IDIOMS } from '@/common/idioms.js'
	import {
		buildRound, refillGroup, pickIdioms,
		tryAppend, isChainDone, findHint
	} from '@/common/lianlian.js'
	import { getCoins, addCoins, REWARD } from '@/common/coins.js'
	import { getLianlianState, recordLianlianRun } from '@/common/storage.js'
	import { showRewardAd } from '@/common/ad.js'

	const GROUP_NEED = 6 // 消满 6 组算一轮

	export default {
		data() {
			return {
				phase: 'ready', // ready | playing | over
				round: { cells: [], groups: [] },
				chain: [],
				hintCells: [],
				roundNo: 1,
				clearedCount: 0,
				seconds: 0,
				coins: 0,
				roundCoins: 0,
				doubled: false,
				roundsInRun: 0,
				bestBefore: 0,
				recorded: true,
				timer: null,
				GROUP_NEED,
				REWARD_ROUND: REWARD.LIANLIAN_ROUND
			}
		},
		computed: {
			isBest() {
				return (this.roundsInRun + 1) > this.bestBefore
			}
		},
		onLoad() {
			this.coins = getCoins()
			this.round = buildRound(IDIOMS)
		},
		onUnload() {
			this.stopTimer()
			this.settle()
		},
		methods: {
			/* 开新局 */
			startRun() {
				this.settle()
				const s = getLianlianState()
				this.bestBefore = s.best
				this.roundNo = 1
				this.roundsInRun = 0
				this.recorded = false
				this.beginRound()
			},

			beginRound() {
				this.stopTimer()
				this.round = buildRound(IDIOMS)
				this.chain = []
				this.hintCells = []
				this.clearedCount = 0
				this.seconds = 0
				this.roundCoins = 0
				this.doubled = false
				this.phase = 'playing'
				this.startTimer()
			},

			nextRound() {
				this.roundsInRun += 1
				this.roundNo += 1
				this.beginRound()
			},

			startTimer() {
				this.timer = setInterval(() => { this.seconds += 1 }, 1000)
			},

			stopTimer() {
				if (this.timer) {
					clearInterval(this.timer)
					this.timer = null
				}
			},

			tileClass(t, i) {
				return {
					'tile-cleared': t.cleared,
					'tile-on': this.chain.indexOf(i) !== -1,
					'tile-hint': this.hintCells.indexOf(i) !== -1,
					'tile-renew': !!t.renew
				}
			},

			tapTile(i) {
				if (this.phase !== 'playing') return
				const cells = this.round.cells
				const tile = cells[i]
				if (!tile || tile.cleared) return

				// 再点一次已选的末尾字：撤销这一步
				if (this.chain.length && this.chain[this.chain.length - 1] === i) {
					this.chain.pop()
					return
				}

				const res = tryAppend(this.chain, cells, i)
				if (res.ok) {
					this.chain.push(i)
					this.hintCells = []
					if (isChainDone(this.chain, cells)) this.clearGroup(tile.groupId)
					return
				}

				// 中途改主意：点中另一组的起笔字，直接换一条新链
				if (!tile.cleared && tile.order === 0 && (res.reason === 'group' || this.chain.length === 0)) {
					this.chain = [i]
					this.hintCells = []
					return
				}

				this.chain = []
				uni.showToast({ title: this.reasonText(res.reason, tile), icon: 'none' })
			},

			reasonText(reason, tile) {
				if (reason === 'start') return '要从成语的第一个字起笔'
				if (reason === 'group') return '没接上这组成语，选择已清空'
				if (reason === 'order') return '要按成语的字序一个一个点'
				if (reason === 'far') return '要和上一步的字相邻（可走斜角）'
				return '再试试'
			},

			/* 消除一组：置空字块 -> 计时 -> 原位补一个新成语 */
			clearGroup(groupId) {
				const group = this.round.groups.find(g => g.id === groupId)
				const cells = this.round.cells.map(c => Object.assign({}, c))
				const groups = this.round.groups.map(g => Object.assign({}, g))
				groups.forEach(g => {
					if (g.id !== groupId) return
					g.cleared = true
					g.cells.forEach(idx => {
						cells[idx].cleared = true
						cells[idx].renew = false
					})
				})
				this.round = { cells, groups }
				this.chain = []
				this.clearedCount += 1
				if (group) {
					uni.showToast({ title: `${group.word} · ${group.meaning}`, icon: 'none', duration: 1600 })
				}

				if (this.clearedCount >= GROUP_NEED) {
					this.onRoundDone()
					return
				}
				// 稍后再补位，让消除动效看得清
				setTimeout(() => this.refill(groupId), 900)
			},

			refill(groupId) {
				if (this.phase !== 'playing') return
				// 尽量避开盘面上已有的成语，防止同字混淆
				const onBoard = this.round.groups.map(g => g.word)
				const pool = IDIOMS.filter(l => onBoard.indexOf(l.word) === -1)
				const fresh = pickIdioms(pool.length ? pool : IDIOMS, 1, Math.random)
				if (!fresh.length) return
				this.round = refillGroup(this.round, groupId, fresh[0])
			},

			onRoundDone() {
				this.stopTimer()
				this.roundCoins = REWARD.LIANLIAN_ROUND
				addCoins(this.roundCoins)
				this.coins = getCoins()
				this.phase = 'over'
			},

			/* 本局连续完成轮数落盘 */
			settle() {
				if (this.recorded) return
				this.recorded = true
				const rounds = this.roundsInRun + (this.phase === 'over' ? 1 : 0)
				if (rounds > 0) recordLianlianRun(rounds)
			},

			onDouble() {
				uni.showLoading({ title: '广告加载中', mask: true })
				showRewardAd()
					.then((ok) => {
						uni.hideLoading()
						if (ok) {
							addCoins(this.roundCoins)
							this.coins = getCoins()
							this.roundCoins *= 2
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

			/* 看广告高亮一组可连成语 */
			onHint() {
				if (this.phase !== 'playing') {
					uni.showToast({ title: '先开始一轮吧', icon: 'none' })
					return
				}
				uni.showModal({
					title: '提示一组',
					content: '看一段广告即可高亮一组成语的连法，确定吗？',
					confirmText: '看广告',
					success: (res) => {
						if (!res.confirm) return
						uni.showLoading({ title: '广告加载中', mask: true })
						showRewardAd()
							.then((ok) => {
								uni.hideLoading()
								if (!ok) {
									uni.showToast({ title: '未看完广告，无法提示', icon: 'none' })
									return
								}
								const hint = findHint(this.round)
								if (!hint) return
								this.hintCells = hint.cells
								setTimeout(() => { this.hintCells = [] }, 3000)
							})
							.catch(() => {
								uni.hideLoading()
								uni.showToast({ title: '广告出错了，稍后再试', icon: 'none' })
							})
					}
				})
			},

			clearChain() {
				this.chain = []
			},

			undoLast(i) {
				this.chain.splice(i)
			},

			goHub() {
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

	.coin {
		color: #b8860b;
		background: #fff6dd;
		border: 2rpx solid #eeda9e;
		border-radius: 26rpx;
		padding: 4rpx 18rpx;
	}

	.hint {
		margin: 24rpx 0 16rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.hint-line {
		font-size: 24rpx;
		line-height: 1.7;
		color: #a08a68;
		text-align: center;
	}

	/* 当前链 */
	.chain {
		height: 88rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 10rpx;
	}

	.chain-cell {
		width: 64rpx;
		height: 64rpx;
		margin: 0 6rpx;
		border-radius: 12rpx;
		background: #fff3cd;
		border: 2rpx solid #e8c86a;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chain-char {
		font-size: 36rpx;
		font-weight: bold;
		color: #7a5200;
	}

	.chain-empty {
		font-size: 24rpx;
		color: #c2b595;
	}

	/* 网格：6 列 × 4 行 */
	.board {
		display: flex;
		flex-wrap: wrap;
		width: 660rpx;
		margin: 0 auto;
	}

	.tile {
		width: 100rpx;
		height: 100rpx;
		margin: 5rpx;
		box-sizing: border-box;
		border-radius: 16rpx;
		background: #fff;
		box-shadow: 0 4rpx 12rpx rgba(150, 120, 70, 0.12);
		display: flex;
		align-items: center;
		justify-content: center;
		position: relative;
		border: 2rpx solid transparent;
	}

	.tile-char {
		font-size: 52rpx;
		font-weight: bold;
		color: #5a4324;
	}

	.tile-on {
		background: #fff3cd;
		border-color: #e8c86a;
	}

	.tile-hint {
		background: #eaf7ea;
		border-color: #7bc47f;
	}

	.tile-cleared {
		background: transparent;
		box-shadow: none;
	}

	.tile-renew {
		animation: drop-in 0.35s ease-out;
	}

	@keyframes drop-in {
		from { transform: translateY(-40rpx); opacity: 0.2; }
		to { transform: translateY(0); opacity: 1; }
	}

	.tile-step {
		position: absolute;
		top: 4rpx;
		right: 8rpx;
		font-size: 20rpx;
		color: #b8860b;
	}

	.actions {
		margin-top: auto;
		display: flex;
		justify-content: space-around;
		padding: 30rpx 0 20rpx;
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
