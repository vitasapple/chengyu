<template>
	<view class="page">
		<view class="header">
			<text class="title">看图猜成语</text>
			<text class="subtitle">已通关 {{passedCount}} / {{levels.length}}</text>

			<!-- 金币栏：余额入口交给「我的」，首页只展示 -->
			<view class="coinbar" @tap="goMe">
				<text class="coin-pill">🪙 {{coins}}</text>
				<text class="coin-more">签到 / 战绩 ›</text>
			</view>
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
	import { isPassed, isUnlocked, getPassed } from '@/common/storage.js'
	import { getCoins } from '@/common/coins.js'

	export default {
		data() {
			return {
				levels: IDIOMS,
				coins: 0,
				passedCount: 0
			}
		},
		onShow() {
			// 每次回到首页刷新解锁/通关状态与金币余额
			this.refresh()
		},
		methods: {
			refresh() {
				this.coins = getCoins()
				// 通关与解锁都存于本地 storage，非响应式，取完强制重渲染
				this.passedCount = getPassed().length
				this.$forceUpdate()
			},
			goMe() {
				uni.switchTab({ url: '/pages/me/me' })
			},
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

	/* 金币栏 */
	.coinbar {
		margin-top: 24rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16rpx;
	}

	.coin-pill {
		font-size: 28rpx;
		font-weight: bold;
		color: #b8860b;
		background: #fff6dd;
		border: 2rpx solid #eeda9e;
		border-radius: 30rpx;
		padding: 8rpx 24rpx;
	}

	.coin-more {
		font-size: 24rpx;
		color: #a08a68;
	}

	.grid {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-start;
	}

	.cell {
		/* 一行 4 列：25% 减去左右 margin，4 个正好占满一行 */
		width: calc(25% - 24rpx);
		margin: 12rpx;
		/* 用 padding-top 保持正方形 */
		height: 0;
		padding-top: calc(25% - 24rpx);
		box-sizing: border-box;
		border-radius: 20rpx;
		background: #fff;
		box-shadow: 0 6rpx 16rpx rgba(150, 120, 70, 0.12);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		position: relative;
	}

	/* padding-top 撑高度时，内容需要绝对定位居中 */
	.cell-id {
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		transform: translateY(-50%);
		text-align: center;
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
