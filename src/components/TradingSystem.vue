<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '../stores/gameStore'
import { ElMessage } from 'element-plus'
import type { Merchant, MerchantSellItem, MerchantBuyItem, SpecialTrade, ResourceAmounts } from '../types/game'

const gameStore = useGameStore()

// 交易标签页
const tradeTab = ref<string | number>('buy')

// 当前选中的商人
const activeMerchant = ref<Merchant | null>(null)

// 选择商人
const selectMerchant = (merchant: Merchant) => {
	activeMerchant.value = merchant
	tradeTab.value = 'buy' // 默认显示购买标签页
}

// 商人可售物品
const merchantSellItems = computed(() => {
	if (!activeMerchant.value) return []
	return activeMerchant.value.sellItems
})

// 玩家可售物品
const playerSellableItems = computed(() => {
	if (!activeMerchant.value) return []
	return activeMerchant.value.buyItems.filter(item => {
		return gameStore.resources[item.resourceId] > 0
	})
})

// 格式化价格显示
const formatPrice = (priceObj: ResourceAmounts) => {
	return Object.entries(priceObj)
		.map(([resource, amount]) => {
			if (resource === 'health' || resource === 'energy') return `${resource === 'health' ? '健康' : '体力'} ${amount}`
			return `${gameStore.getResourceName(resource)} ${amount}`
		})
		.join(', ')
}

// 检查是否能负担价格
const canAfford = (priceObj: ResourceAmounts) => {
	for (const [resource, amount] of Object.entries(priceObj)) {
		if (gameStore.resources[resource] < amount) return false
	}
	return true
}

// 购买物品
const buyItem = (item: MerchantSellItem) => {
	if (!activeMerchant.value) return
	// 检查库存
	if (item.stock <= 0) {
		ElMessage.error('该物品已售罄')
		return
	}
	// 检查是否能负担价格
	if (!canAfford(item.buyPrice)) {
		ElMessage.error('资源不足')
		return
	}
	// 再次检查资源是否充足（双重保险）
	for (const [resource, amount] of Object.entries(item.buyPrice)) {
		if (gameStore.resources[resource] < amount) {
			ElMessage.error(`${gameStore.getResourceName(resource)}不足`)
			return
		}
	}
	// 扣除资源
	for (const [resource, amount] of Object.entries(item.buyPrice)) {
		gameStore.resources[resource] -= amount
	}
	// 添加物品到玩家资源，如果有amount属性则添加指定数量，否则添加1
	const resourceAmount = item.amount || 1
	gameStore.addResource(item.resourceId, resourceAmount)
	// 减少库存
	item.stock--
	// 记录交易日志
	const amountText = resourceAmount > 1 ? `${resourceAmount}单位` : ''
	gameStore.addToEventLog(`从${activeMerchant.value.name}处购买了${item.name}${amountText}`)
	ElMessage.success(`成功购买${item.name}${amountText}`)
}

// 出售物品
const sellItem = (item: MerchantBuyItem) => {
	if (!activeMerchant.value) return
	// 检查玩家是否有该物品
	if (gameStore.resources[item.resourceId] <= 0) {
		ElMessage.error('你没有足够的物品')
		return
	}
	// 扣除玩家物品
	gameStore.resources[item.resourceId]--
	// 添加资源
	for (const [resource, amount] of Object.entries(item.sellPrice)) {
		if (resource === 'health') gameStore.player.health = Math.min(gameStore.player.health + amount, gameStore.player.maxHealth)
		else if (resource === 'energy') gameStore.player.energy = Math.min(gameStore.player.energy + amount, gameStore.player.maxEnergy)
		else gameStore.addResource(resource, amount)
	}
	// 记录交易日志
	gameStore.addToEventLog(`向${activeMerchant.value.name}出售了${item.name}`)
	ElMessage.success(`成功出售${item.name}`)
}

// 检查是否可以执行特殊交易
const canExecuteSpecialTrade = (trade: SpecialTrade) => {
	for (const [resource, amount] of Object.entries(trade.inputs)) {
		if (resource === 'health') {
			if (gameStore.player.health < amount) return false
		} else if (resource === 'energy') {
			if (gameStore.player.energy < amount) return false
		} else if (gameStore.resources[resource] < amount) {
			return false
		}
	}
	return true
}

// 执行特殊交易
const executeSpecialTrade = (trade: SpecialTrade) => {
	if (!activeMerchant.value) return
	// 再次检查资源是否充足
	if (!canExecuteSpecialTrade(trade)) {
		ElMessage.error('资源不足')
		return
	}
	// 扣除输入资源
	for (const [resource, amount] of Object.entries(trade.inputs)) {
		if (resource === 'health') {
			// 确保健康不会变为负数
			if (gameStore.player.health < amount) {
				ElMessage.error('健康不足')
				return
			}
			gameStore.player.health -= amount
		} else if (resource === 'energy') {
			// 确保体力不会变为负数
			if (gameStore.player.energy < amount) {
				ElMessage.error('体力不足')
				return
			}
			gameStore.player.energy -= amount
		} else {
			// 确保资源不会变为负数
			if (gameStore.resources[resource] < amount) {
				ElMessage.error(`${gameStore.getResourceName(resource)}不足`)
				return
			}
			gameStore.resources[resource] -= amount
		}
	}
	// 添加输出资源
	for (const [resource, amount] of Object.entries(trade.outputs)) {
		if (resource === 'exp') {
			// 直接增加经验值并检查升级
			gameStore.player.exp += amount
		} else if (resource === 'maxHealth') {
			gameStore.player.maxHealth += amount
			gameStore.player.health = Math.min(gameStore.player.health + amount, gameStore.player.maxHealth)
		} else if (resource === 'maxEnergy') {
			gameStore.player.maxEnergy += amount
			gameStore.player.energy = Math.min(gameStore.player.energy + amount, gameStore.player.maxEnergy)
		} else {
			gameStore.addResource(resource, amount)
		}
	}
	// 记录交易日志
	gameStore.addToEventLog(`与${activeMerchant.value.name}完成了特殊交易: ${trade.name}`)
	ElMessage.success(`成功完成交易: ${trade.name}`)
}
</script>

<template>
	<div class="trading-system">
		<div v-if="!activeMerchant" class="merchant-selection">
			<h4>可用商人</h4>
			<el-empty v-if="gameStore.availableMerchants().length === 0" description="暂无商人可交易"></el-empty>
			<div v-else class="merchant-list">
				<div v-for="merchant in gameStore.availableMerchants()" :key="merchant.id" class="merchant-card"
					@click="selectMerchant(merchant)">
					<div class="merchant-icon">{{ merchant.icon }}</div>
					<div class="merchant-info">
						<div class="merchant-name">{{ merchant.name }}</div>
						<div class="merchant-description">{{ merchant.description }}</div>
					</div>
				</div>
			</div>
		</div>
		<div v-else class="trading-interface">
			<div class="merchant-header">
				<div class="merchant-avatar">{{ activeMerchant.icon }}</div>
				<div class="merchant-details">
					<h4>{{ activeMerchant.name }}</h4>
					<p>{{ activeMerchant.greeting }}</p>
				</div>
				<el-button @click="activeMerchant = null" size="small">返回</el-button>
			</div>
			<el-tabs v-model="tradeTab">
				<el-tab-pane label="购买" name="buy">
					<div class="trade-items">
						<el-empty v-if="merchantSellItems.length === 0" description="商人没有可出售的物品"></el-empty>
						<div v-else class="item-grid">
							<div v-for="item in merchantSellItems" :key="item.id" class="trade-item">
								<div class="item-icon">{{ item.icon || '📦' }}</div>
								<div class="item-details">
									<div class="item-name">{{ item.name }}</div>
									<div class="item-price">价格: {{ formatPrice(item.buyPrice) }}</div>
									<div class="item-stock" :class="{ 'low-stock': item.stock < 5 }">库存: {{ item.stock }}</div>
									<div v-if="item.amount && item.amount > 1" class="item-amount">获得: {{ item.amount }}单位</div>
								</div>
								<el-button @click="buyItem(item)"
									:disabled="!canAfford(item.buyPrice) || item.stock <= 0 || gameStore.gameState !== 'playing'"
									size="small">
									购买
								</el-button>
							</div>
						</div>
					</div>
				</el-tab-pane>
				<el-tab-pane label="出售" name="sell">
					<div class="trade-items">
						<el-empty v-if="playerSellableItems.length === 0" description="你没有可出售的物品"></el-empty>
						<div v-else class="item-grid">
							<div v-for="item in playerSellableItems" :key="item.id" class="trade-item">
								<div class="item-icon">{{ item.icon || '📦' }}</div>
								<div class="item-details">
									<div class="item-name">{{ item.name }}</div>
									<div class="item-price">价格: {{ formatPrice(item.sellPrice) }}</div>
									<div class="item-stock">拥有: {{ gameStore.resources[item.resourceId] }}</div>
								</div>
								<el-button @click="sellItem(item)"
									:disabled="gameStore.resources[item.resourceId] <= 0 || gameStore.gameState !== 'playing'"
									size="small">
									出售
								</el-button>
							</div>
						</div>
					</div>
				</el-tab-pane>
				<el-tab-pane label="特殊交易" name="special"
					v-if="activeMerchant.specialTrades && activeMerchant.specialTrades.length">
					<div class="special-trades">
						<div v-for="trade in activeMerchant.specialTrades" :key="trade.id" class="special-trade-item">
							<div class="trade-description">
								<div class="trade-title">{{ trade.name }}</div>
								<div class="trade-details">{{ trade.description }}</div>
							</div>
							<div class="trade-resources">
								<div class="trade-inputs">
									<div class="resource-label">需要:</div>
									<div v-for="(amount, resource) in trade.inputs" :key="resource" class="resource-item"
										:class="{ 'insufficient': gameStore.resources[resource] < amount }">
										{{ gameStore.getResourceName(resource) }}: {{ amount }}/{{ gameStore.resources[resource] }}
									</div>
								</div>
								<div class="trade-arrow">→</div>
								<div class="trade-outputs">
									<div class="resource-label">获得:</div>
									<div v-for="(amount, resource) in trade.outputs" :key="resource" class="resource-item">
										{{ gameStore.getResourceName(resource) }}: {{ amount }}
									</div>
								</div>
							</div>
							<el-button @click="executeSpecialTrade(trade)"
								:disabled="!canExecuteSpecialTrade(trade) || gameStore.gameState !== 'playing'" size="small">
								交易
							</el-button>
						</div>
					</div>
				</el-tab-pane>
			</el-tabs>
		</div>
	</div>
</template>

<style scoped>
.trading-system {
	padding: 10px;
}

.merchant-selection {
	margin-bottom: 20px;
}

.merchant-list {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
	gap: 15px;
	margin-top: 10px;
}

.merchant-card {
	display: flex;
	align-items: center;
	padding: 10px;
	border-radius: 4px;
	background-color: var(--el-bg-color-overlay);
	cursor: pointer;
	transition: all 0.3s;
}

.merchant-card:hover {
	transform: translateY(-2px);
	box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.merchant-icon {
	font-size: 2rem;
	margin-right: 10px;
}

.merchant-info {
	flex: 1;
}

.merchant-name {
	font-weight: bold;
	margin-bottom: 5px;
}

.merchant-description {
	font-size: 0.9rem;
	color: var(--el-text-color-secondary);
}

.trading-interface {
	background-color: var(--el-bg-color-overlay);
	border-radius: 4px;
	padding: 15px;
}

.merchant-header {
	display: flex;
	align-items: center;
	margin-bottom: 20px;
}

.merchant-avatar {
	font-size: 2.5rem;
	margin-right: 15px;
}

.merchant-details {
	flex: 1;
}

.merchant-details h4 {
	margin: 0 0 5px 0;
}

.merchant-details p {
	margin: 0;
	color: var(--el-text-color-secondary);
	font-style: italic;
}

.item-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
	gap: 15px;
	margin-top: 10px;
}

.trade-item {
	display: flex;
	flex-direction: column;
	padding: 10px;
	border-radius: 4px;
	background-color: var(--el-fill-color-light);
}

.item-icon {
	font-size: 2rem;
	margin-bottom: 10px;
	text-align: center;
}

.item-details {
	flex: 1;
	margin-bottom: 10px;
}

.item-name {
	font-weight: bold;
	margin-bottom: 5px;
}

.item-price,
.item-stock {
	font-size: 0.9rem;
	color: var(--el-text-color-secondary);
}

.low-stock {
	color: var(--el-color-danger);
}

.special-trade-item {
	display: flex;
	flex-direction: column;
	padding: 15px;
	margin-bottom: 15px;
	border-radius: 4px;
	background-color: var(--el-fill-color-light);
}

.trade-title {
	font-weight: bold;
	margin-bottom: 5px;
}

.trade-details {
	margin-bottom: 10px;
	color: var(--el-text-color-secondary);
}

.trade-resources {
	display: flex;
	align-items: center;
	margin-bottom: 15px;
}

.trade-inputs,
.trade-outputs {
	flex: 1;
}

.resource-label {
	font-weight: bold;
	margin-bottom: 5px;
}

.resource-item {
	margin-bottom: 3px;
}

.insufficient {
	color: var(--el-color-danger);
}

.trade-arrow {
	margin: 0 15px;
	font-size: 1.5rem;
	color: var(--el-text-color-secondary);
}

@media (max-width: 768px) {

	.merchant-list,
	.item-grid {
		grid-template-columns: 1fr;
	}

	.trade-resources {
		flex-direction: column;
		align-items: flex-start;
	}

	.trade-arrow {
		transform: rotate(90deg);
		margin: 10px 0;
	}
}
</style>
