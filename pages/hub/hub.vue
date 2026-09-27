<template>
	<view class="page">
		<view class="header">
			<text class="title">玩法合集</text>
			<text class="subtitle">换个玩法，换种手感</text>
			<view class="coin-pill">🪙 {{coins}}</view>
		</view>

		<!-- 玩法卡片 -->
		<view
			v-for="g in games"
			:key="g.key"
			class="card"
			@tap="enter(g)">
			<view class="card-icon">{{g.icon}}</view>
			<view class="card-body">
				<view class="card-title-row">
					<text class="card-title">{{g.name}}</text>
					<text v-if="g.tag" class="card-tag" :class="{'tag-done': g.done}">{{g.tag}}</text>
				</view>
				<text class="card-desc">{{g.desc}}</text>
			</view>
			<text class="card-arrow">›</text>
		</view>

		<text class="foot-tip">更多玩法打造中…</text>
	</view>
</template>

<script>
	import { getCoins, getDailyInfo, REWARD } from '@/common/coins.js'
	import { getZhaochaState, getLianlianState } from '@/common/storage.js'

	export default {
		data() {
			return {
				coins: 0,
				games: []
			}
		},
		onShow() {
			// tabBar 页常驻，每次回到本页刷新余额与各玩法状态
			this.refresh()
		},
		methods: {
			refresh() {
				this.coins = getCoins()
				const daily = getDailyInfo()
				const zhaocha = getZhaochaState()
				const lianlian = getLianlianState()
				this.games = [
					{
						key: 'daily',
						name: '每日一题',
						icon: '🔥',
						desc: `全网同题，答对 +${REWARD.DAILY} 金币`,
						tag: daily.doneToday ? `今日已完成 · 连击 ${daily.streak}` : `连击 ${daily.streak} 天`,
						done: daily.doneToday,
						url: '/pages/game/game?mode=daily'
					},
					{
						key: 'zhaocha',
						name: '找茬达人',
						icon: '🔍',
						desc: `60 秒里点出所有形近字，每过一题 +${REWARD.ZHAOCHA_PASS} 金币`,
						tag: `已挑战到第 ${zhaocha.progress} 题`,
						done: false,
						url: '/pages/zhaocha/zhaocha'
					},
					{
						key: 'lianlian',
						name: '文字连连看',
						icon: '🧩',
						desc: `按字序连着点出成语，一轮 +${REWARD.LIANLIAN_ROUND} 金币`,
						tag: lianlian.best > 0 ? `最高 ${lianlian.best} 轮` : '新手上路',
						done: false,
						url: '/pages/lianlian/lianlian'
					}
				]
			},
			enter(g) {
				if (g.key === 'daily' && g.done) {
					uni.showToast({ title: '今日挑战已完成，明天再来', icon: 'none' })
					return
				}
				uni.navigateTo({ url: g.url })
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
		padding: 20rpx 0 36rpx;
	}

	.title {
		font-size: 48rpx;
		font-weight: bold;
		color: #6b4f2a;
		letter-spacing: 4rpx;
	}

	.subtitle {
		margin-top: 12rpx;
		font-size: 26rpx;
		color: #a08a68;
	}

	.coin-pill {
		margin-top: 20rpx;
		font-size: 28rpx;
		font-weight: bold;
		color: #b8860b;
		background: #fff6dd;
		border: 2rpx solid #eeda9e;
		border-radius: 30rpx;
		padding: 8rpx 24rpx;
	}

	.card {
		display: flex;
		align-items: center;
		background: #fff;
		border-radius: 24rpx;
		padding: 30rpx 26rpx;
		margin-bottom: 26rpx;
		box-shadow: 0 8rpx 20rpx rgba(150, 120, 70, 0.12);
	}

	.card-icon {
		width: 96rpx;
		height: 96rpx;
		border-radius: 24rpx;
		background: #f7f0e0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 52rpx;
		flex-shrink: 0;
	}

	.card-body {
		flex: 1;
		margin-left: 24rpx;
		overflow: hidden;
	}

	.card-title-row {
		display: flex;
		align-items: center;
	}

	.card-title {
		font-size: 34rpx;
		font-weight: bold;
		color: #5a4324;
	}

	.card-tag {
		margin-left: 16rpx;
		font-size: 22rpx;
		color: #8a6d3b;
		background: #fff6dd;
		border-radius: 20rpx;
		padding: 4rpx 14rpx;
	}

	.tag-done {
		color: #4caf50;
		background: #eaf7ea;
	}

	.card-desc {
		display: block;
		margin-top: 10rpx;
		font-size: 24rpx;
		color: #a08a68;
		line-height: 1.5;
	}

	.card-arrow {
		font-size: 44rpx;
		color: #d5c8a8;
		margin-left: 10rpx;
	}

	.foot-tip {
		display: block;
		text-align: center;
		margin-top: 30rpx;
		font-size: 24rpx;
		color: #c2b595;
	}
</style>
