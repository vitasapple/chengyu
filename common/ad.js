/**
 * 激励视频广告封装（微信小程序 · 流量主）
 *
 * 使用说明：
 * 1. 在微信公众平台「流量主」后台新建「激励视频广告位」，拿到 adUnitId 填到下方。
 * 2. 开发态 / 未配置广告位时自动走兜底：直接 resolve(true) 模拟看完发奖，
 *    这样本地和开发者工具无需真实广告即可跑通完整流程。
 * 3. 只有用户「看完」广告（res.isEnded === true）才算发奖成功；中途退出不发奖。
 */

// TODO: 上线前替换为你的激励视频广告位 ID（形如 'adunit-xxxxxxxxxx'）
const AD_UNIT_ID = ''

// 广告位未配置 => 视为开发态，走模拟发奖
const isMock = () => !AD_UNIT_ID

let rewardedAd = null

/**
 * 创建（并复用）激励视频广告实例。仅 MP-WEIXIN 生效。
 */
function ensureAd() {
	// #ifdef MP-WEIXIN
	if (!rewardedAd && !isMock()) {
		rewardedAd = uni.createRewardedVideoAd({ adUnitId: AD_UNIT_ID })
		rewardedAd.onError(err => {
			console.error('[ad] 激励视频加载/展示出错：', err)
		})
	}
	// #endif
}

/**
 * 展示激励视频广告。
 * @returns {Promise<boolean>} true=看完可发奖；false=中途关闭/失败不发奖。
 *
 * 开发态兜底：resolve(true) 直接发奖，方便本地跑通。
 */
export function showRewardAd() {
	// 开发态 / 未配置广告位：模拟发奖
	if (isMock()) {
		console.log('[ad] 未配置广告位，走模拟发奖（开发态）')
		return Promise.resolve(true)
	}

	// #ifdef MP-WEIXIN
	return new Promise((resolve) => {
		ensureAd()
		if (!rewardedAd) {
			resolve(false)
			return
		}

		const onClose = (res) => {
			// 解绑一次性回调，避免重复触发
			rewardedAd.offClose(onClose)
			// res.isEnded：是否观看完整；旧基础库可能返回 undefined，视为已看完
			const finished = res && (res.isEnded === undefined || res.isEnded === true)
			resolve(!!finished)
		}

		rewardedAd.onClose(onClose)

		rewardedAd.show().catch(() => {
			// 失败重试一次：先 load 再 show
			rewardedAd.load()
				.then(() => rewardedAd.show())
				.catch(err => {
					console.error('[ad] show 失败：', err)
					rewardedAd.offClose(onClose)
					resolve(false)
				})
		})
	})
	// #endif

	// #ifndef MP-WEIXIN
	// 非微信小程序端暂不支持该广告，直接模拟发奖，保证流程可跑
	return Promise.resolve(true)
	// #endif
}

export default { showRewardAd }
