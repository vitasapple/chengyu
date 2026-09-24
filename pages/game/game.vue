<template>
	<view class="page">
		<!-- 顶部：关卡信息 -->
		<view class="topbar">
			<text class="level-tag">第 {{level.id}} 关</text>
			<text class="progress-tag">通关 {{passedCount}}/{{total}}</text>
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
				<view class="dialog-btns">
					<view class="btn btn-ghost" @tap="goHome">返回首页</view>
					<view v-if="hasNext" class="btn btn-primary" @tap="goNext">下一关</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { IDIOMS, DISTRACTOR_POOL } from '@/common/idioms.js'
	import { isPassed, completeLevel } from '@/common/storage.js'
	import { showRewardAd } from '@/common/ad.js'

	const DISTRACTOR_COUNT = 4 // 额外干扰字数量

	export default {
		data() {
			return {
				level: {},
				answerChars: [],
				slots: [],       // { char, from, locked }
				candidates: [],  // { char, used }
				modal: { show: false, title: '' },
				imgError: false
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
			const id = Number(option.id) || 1
			this.loadLevel(id)
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
				this.candidates = this.buildCandidates(this.answerChars)
				this.modal = { show: false, title: '' }
			},

			/* 答案字 + 随机干扰字，打乱后生成候选（含重复字实例） */
			buildCandidates(answerChars) {
				const extra = this.shuffle(DISTRACTOR_POOL).slice(0, DISTRACTOR_COUNT)
				const all = this.shuffle(answerChars.concat(extra))
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
				} else {
					uni.showToast({ title: '不对哦，再试试', icon: 'none' })
					setTimeout(() => this.clearUnlocked(), 500)
				}
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
				completeLevel(this.level.id, IDIOMS.length)
				this.modal = { show: true, title: '🎉 答对了！' }
			},

			goHome() {
				uni.reLaunch({ url: '/pages/index/index' })
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

	.dialog-btns {
		margin-top: 40rpx;
		display: flex;
		justify-content: space-around;
		width: 100%;
	}
</style>
