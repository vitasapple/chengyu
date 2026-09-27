<template>
	<view class="page">
		<!-- 资料卡 -->
		<view class="profile">
			<button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
				<image v-if="form.avatar" class="avatar-img" :src="form.avatar" mode="aspectFill"></image>
				<text v-else class="avatar-ph">👤</text>
			</button>
			<view class="profile-info">
				<input
					class="nick-input"
					type="nickname"
					placeholder="点击设置昵称"
					:value="form.nickname"
					@blur="onNickBlur"
					@confirm="onNickBlur" />
				<text class="coin-line">🪙 {{coins}} 金币</text>
			</view>
		</view>

		<!-- 签到 -->
		<view class="card">
			<view class="row">
				<view class="row-main">
					<text class="row-title">每日签到</text>
					<text class="row-desc">连签 {{sign.streak}} 天 · 明天可领 {{sign.nextReward}} 金币</text>
				</view>
				<view class="act" :class="{'act-off': sign.signedToday}" @tap="onSign">
					{{sign.signedToday ? '今日已签' : '签到 +' + sign.nextReward}}
				</view>
			</view>
		</view>

		<!-- 进度统计 -->
		<text class="group-title">我的进度</text>
		<view class="card">
			<view class="row" @tap="goTab('/pages/index/index')">
				<text class="row-ico">🏯</text>
				<view class="row-main">
					<text class="row-title">看图猜成语</text>
					<text class="row-desc">已通关 {{passedCount}} / {{totalLevels}}</text>
				</view>
				<text class="row-val">{{levelPercent}}%</text>
			</view>
			<view class="divider"></view>
			<view class="row" @tap="goPage('/pages/zhaocha/zhaocha')">
				<text class="row-ico">🔍</text>
				<view class="row-main">
					<text class="row-title">找茬达人</text>
					<text class="row-desc">已挑战到第 {{zhaocha.progress}} 题</text>
				</view>
				<text class="row-val">🪙 {{zhaocha.bestCoins}}</text>
			</view>
			<view class="divider"></view>
			<view class="row" @tap="goPage('/pages/lianlian/lianlian')">
				<text class="row-ico">🧩</text>
				<view class="row-main">
					<text class="row-title">文字连连看</text>
					<text class="row-desc">最长 {{lianlian.best}} 轮 · 累计 {{lianlian.total}} 轮</text>
				</view>
				<text class="row-val">›</text>
			</view>
			<view class="divider"></view>
			<view class="row" @tap="goDaily">
				<text class="row-ico">🔥</text>
				<view class="row-main">
					<text class="row-title">每日一题</text>
					<text class="row-desc">{{daily.doneToday ? '今日已完成' : '今日还没做'}}</text>
				</view>
				<text class="row-val">连击 {{daily.streak}}</text>
			</view>
		</view>

		<!-- 设置 -->
		<text class="group-title">设置</text>
		<view class="card">
			<view class="row">
				<text class="row-ico">🔊</text>
				<view class="row-main">
					<text class="row-title">音效</text>
					<text class="row-desc">暂未接入音频资源，开关先行保留</text>
				</view>
				<switch :checked="settings.sound" color="#7bc47f" @change="onToggleSound" />
			</view>
			<view class="divider"></view>
			<view class="row" @tap="onAbout">
				<text class="row-ico">ℹ️</text>
				<view class="row-main">
					<text class="row-title">关于与玩法</text>
					<text class="row-desc">版本 {{version}}</text>
				</view>
				<text class="row-val">›</text>
			</view>
		</view>

		<text class="foot-tip">进度与金币仅保存在本机，换机不会同步</text>
	</view>
</template>

<script>
	import { IDIOMS } from '@/common/idioms.js'
	import { getPassed, getZhaochaState, getLianlianState, getProfile, saveProfile, getSettings, saveSettings } from '@/common/storage.js'
	import { getCoins, getSignInfo, signIn, getDailyInfo } from '@/common/coins.js'

	export default {
		data() {
			return {
				coins: 0,
				sign: { signedToday: false, streak: 0, nextReward: 10 },
				daily: { doneToday: false, streak: 0 },
				zhaocha: { progress: 1, bestCoins: 0 },
				lianlian: { best: 0, total: 0 },
				form: { avatar: '', nickname: '' },
				settings: { sound: true },
				passedCount: 0,
				version: '1.1.0'
			}
		},
		computed: {
			totalLevels() {
				return IDIOMS.length
			},
			levelPercent() {
				return Math.round((this.passedCount / this.totalLevels) * 100)
			}
		},
		onShow() {
			this.refresh()
		},
		methods: {
			refresh() {
				this.coins = getCoins()
				this.sign = getSignInfo()
				this.daily = getDailyInfo()
				this.zhaocha = getZhaochaState()
				this.lianlian = getLianlianState()
				this.form = getProfile()
				this.settings = getSettings()
				// 通关数不是响应式数据，手动取一次再触发重渲染
				this.passedCount = getPassed().filter(id => IDIOMS.some(l => l.id === id)).length
				this.$forceUpdate()
			},
			onSign() {
				const res = signIn()
				if (res.ok) {
					uni.showToast({ title: `签到成功 +${res.coins}🪙（连签${res.streak}天）`, icon: 'none' })
					this.refresh()
				} else {
					uni.showToast({ title: '今天已经签过啦，明天再来', icon: 'none' })
				}
			},
			/* 微信头像昵称填写能力：头像拿到的是临时路径，落本地后再保存 */
			onChooseAvatar(e) {
				const url = e && e.detail && e.detail.avatarUrl
				if (!url) return
				uni.saveFile({
					tempFilePath: url,
					success: (res) => this.saveProf({ avatar: res.savedFilePath || url }),
					fail: () => this.saveProf({ avatar: url })
				})
			},
			onNickBlur(e) {
				const v = (e && e.detail && e.detail.value) || ''
				this.saveProf({ nickname: v.trim() })
			},
			saveProf(patch) {
				this.form = saveProfile(patch)
				this.$forceUpdate()
			},
			onToggleSound(e) {
				this.settings = saveSettings({ sound: !!(e && e.detail && e.detail.value) })
			},
			goTab(url) {
				uni.switchTab({ url })
			},
			goPage(url) {
				uni.navigateTo({ url })
			},
			goDaily() {
				if (this.daily.doneToday) {
					uni.showToast({ title: '今日挑战已完成，明天再来', icon: 'none' })
					return
				}
				uni.navigateTo({ url: '/pages/game/game?mode=daily' })
			},
			onAbout() {
				uni.showModal({
					title: `看图猜成语 ${this.version}`,
					content: '闯关：看图填出四字成语，通关解锁下一关。\n合集：每日一题、找茬达人、文字连连看。\n金币：签到、通关、答题可得，可换跳过与保险。\n提示类功能只能用广告兑换。',
					showCancel: false,
					confirmText: '知道啦'
				})
			}
		}
	}
</script>

<style>
	.page {
		min-height: 100vh;
		padding: 30rpx 30rpx 60rpx;
		box-sizing: border-box;
		background: linear-gradient(180deg, #fdfbf5 0%, #f3eee1 100%);
	}

	/* 资料头 */
	.profile {
		display: flex;
		align-items: center;
		padding: 30rpx 20rpx 40rpx;
	}

	.avatar-btn {
		width: 140rpx;
		height: 140rpx;
		padding: 0;
		margin: 0;
		border-radius: 50%;
		background: #fff;
		box-shadow: 0 8rpx 20rpx rgba(150, 120, 70, 0.15);
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		line-height: 1;
	}

	/* 去掉 button 默认边框 */
	.avatar-btn::after {
		border: none;
	}

	.avatar-img {
		width: 140rpx;
		height: 140rpx;
	}

	.avatar-ph {
		font-size: 60rpx;
		color: #d5c8a8;
	}

	.profile-info {
		flex: 1;
		margin-left: 28rpx;
		display: flex;
		flex-direction: column;
	}

	.nick-input {
		font-size: 36rpx;
		font-weight: bold;
		color: #5a4324;
		height: 60rpx;
		line-height: 60rpx;
	}

	.coin-line {
		margin-top: 12rpx;
		font-size: 28rpx;
		color: #b8860b;
	}

	.group-title {
		display: block;
		margin: 20rpx 8rpx 16rpx;
		font-size: 26rpx;
		color: #a08a68;
	}

	.card {
		background: #fff;
		border-radius: 24rpx;
		padding: 8rpx 26rpx;
		margin-bottom: 26rpx;
		box-shadow: 0 8rpx 20rpx rgba(150, 120, 70, 0.1);
	}

	.row {
		display: flex;
		align-items: center;
		padding: 26rpx 0;
	}

	.row-ico {
		font-size: 36rpx;
		width: 48rpx;
		text-align: center;
	}

	.row-main {
		flex: 1;
		margin-left: 18rpx;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.row-title {
		font-size: 30rpx;
		color: #5a4324;
		font-weight: bold;
	}

	.row-desc {
		margin-top: 8rpx;
		font-size: 24rpx;
		color: #a08a68;
	}

	.row-val {
		font-size: 26rpx;
		color: #8a6d3b;
		margin-left: 12rpx;
	}

	.divider {
		height: 2rpx;
		background: #f2ece0;
	}

	.act {
		font-size: 26rpx;
		font-weight: bold;
		color: #fff;
		background: linear-gradient(90deg, #ffcf5c 0%, #ff9f43 100%);
		border-radius: 30rpx;
		padding: 12rpx 26rpx;
	}

	.act-off {
		background: #d9d2c0;
		color: #8a8371;
	}

	.foot-tip {
		display: block;
		text-align: center;
		margin-top: 10rpx;
		font-size: 22rpx;
		color: #c2b595;
	}
</style>
