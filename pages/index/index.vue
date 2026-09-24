<template>
	<view class="page">
		<view class="header">
			<text class="title">看图猜成语</text>
			<text class="subtitle">已通关 {{passedCount}} / {{levels.length}}</text>
		</view>

		<view class="grid">
			<view
				v-for="item in levels"
				:key="item.id"
				class="cell"
				:class="cellClass(item)"
				@tap="enter(item)">
				<text class="cell-id">{{item.id}}</text>
				<text class="cell-state">{{stateText(item)}}</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { IDIOMS } from '@/common/idioms.js'
	import { isPassed, isUnlocked } from '@/common/storage.js'

	export default {
		data() {
			return {
				levels: IDIOMS
			}
		},
		computed: {
			passedCount() {
				return this.levels.filter(l => isPassed(l.id)).length
			}
		},
		onShow() {
			// 每次回到首页刷新解锁/通关状态
			this.$forceUpdate()
		},
		methods: {
			cellClass(item) {
				return {
					'is-locked': !isUnlocked(item.id),
					'is-passed': isPassed(item.id)
				}
			},
			stateText(item) {
				if (!isUnlocked(item.id)) return '🔒'
				if (isPassed(item.id)) return '✓'
				return ''
			},
			enter(item) {
				if (!isUnlocked(item.id)) {
					uni.showToast({ title: '请先通关前面的关卡', icon: 'none' })
					return
				}
				uni.navigateTo({ url: '/pages/game/game?id=' + item.id })
			}
		}
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 40rpx 30rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, #fdfbf5 0%, #f3eee1 100%);
	}

	.header {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 30rpx 0 40rpx;
	}

	.title {
		font-size: 52rpx;
		font-weight: bold;
		color: #6b4f2a;
		letter-spacing: 4rpx;
	}

	.subtitle {
		margin-top: 14rpx;
		font-size: 26rpx;
		color: #a08a68;
	}

	.grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-start;
	}

	.cell {
		width: 150rpx;
		height: 150rpx;
		margin: 15rpx;
		border-radius: 20rpx;
		background: #fff;
		box-shadow: 0 6rpx 16rpx rgba(150, 120, 70, 0.12);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	.cell-id {
		font-size: 44rpx;
		font-weight: bold;
		color: #6b4f2a;
	}

	.cell-state {
		position: absolute;
		top: 10rpx;
		right: 14rpx;
		font-size: 26rpx;
		color: #4caf50;
	}

	.is-passed {
		background: #eaf7ea;
	}

	.is-locked {
		background: #e6e2d8;
	}

	.is-locked .cell-id {
		color: #b3ab99;
	}

	.is-locked .cell-state {
		color: #b3ab99;
	}
</style>
