<template>
    <div class="dashboard">
        <Navigation />
        <div class="dashboard-content">
            <div class="content-header">
                <div class="header-left">
                    <button class="back-btn" @click="router.push('/cms/completed-orders')">
                        <i class="fas fa-arrow-left"></i> Geri
                    </button>
                    <h1>Sipariş Detayları</h1>
                </div>
                <div class="status-badge">Tamamlandı</div>
            </div>
            
            <div v-if="order" class="order-details-container">
                <div class="order-info-card">
                    <h2>Sipariş Bilgileri</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Sipariş No</label>
                            <p>{{ order.orderUniqueCode }}</p>
                        </div>
                        <div class="info-item">
                            <label>Tarih</label>
                            <p>{{ new Date(order.cartInformation.expirationDate).toLocaleDateString() }}</p>
                        </div>
                        <div class="info-item">
                            <label>Toplam Tutar</label>
                            <p class="price">${{ order.finalPrice }}</p>
                        </div>
                    </div>
                </div>

                <div class="customer-info-card">
                    <h2>Müşteri Bilgileri</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Ad Soyad</label>
                            <p>{{ order.shippingInfo.firstName }} {{ order.shippingInfo.lastName }}</p>
                        </div>
                        <div class="info-item">
                            <label>Email</label>
                            <p>{{ order.shippingInfo.email }}</p>
                        </div>
                        <div class="info-item">
                            <label>Telefon</label>
                            <p>{{ order.shippingInfo.phoneNumber }}</p>
                        </div>
                    </div>
                </div>

                <div class="shipping-info-card">
                    <h2>Teslimat Bilgileri</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <label>Adres</label>
                            <p>{{ order.shippingInfo.shippingAddress }}</p>
                        </div>
                        <div class="info-item">
                            <label>Şehir</label>
                            <p>{{ order.shippingInfo.city }}</p>
                        </div>
                        <div class="info-item">
                            <label>Posta Kodu</label>
                            <p>{{ order.shippingInfo.zipCode }}</p>
                        </div>
                    </div>
                </div>

                <div class="products-card">
                    <h2>Ürünler</h2>
                    <div class="products-list">
                        <div v-for="item in order.cartProducts" :key="item.id" class="product-item">
                            <div class="product-image" :style="{ 'background-image': `url(/images/${item.photo})` }"></div>
                            <div class="product-details">
                                <h3>{{ item.name }}</h3>
                                <div class="product-info">
                                    <div class="info-row">
                                        <span class="label">Birim Fiyat:</span>
                                        <span class="value price">${{ item.price }}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="label">Adet:</span>
                                        <span class="value">{{ item.quantity }}</span>
                                    </div>
                                    <div class="info-row">
                                        <span class="label">Toplam:</span>
                                        <span class="value price">${{ (item.price * item.quantity).toFixed(2) }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="order-summary">
                        <div class="summary-row">
                            <span>Ara Toplam:</span>
                            <span class="price">${{ calculateSubtotal() }}</span>
                        </div>
                        <div class="summary-row">
                            <span>Kargo:</span>
                            <span class="price">${{ order.shippingMethod?.price || '0.00' }}</span>
                        </div>
                        <div class="summary-row total">
                            <span>Toplam:</span>
                            <span class="price">${{ order.finalPrice }}</span>
                        </div>
                    </div>
                </div>
            </div>
            <div v-else class="loading">
                Yükleniyor...
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useProductStore } from '../../stores/productStore'
import Navigation from '../../components/cms/Navigation.vue'

const router = useRouter()
const route = useRoute()
const productStore = useProductStore()
const order = ref(null)

onMounted(async () => {
    if (!localStorage.getItem('isAdmin')) {
        router.push('/cms/login')
        return
    }
    
    await productStore.getCompletedOrders()
    order.value = productStore.completedOrders.find(o => o.orderUniqueCode === route.params.id)
    
    if (!order.value) {
        router.push('/cms/completed-orders')
    }
})

const calculateSubtotal = () => {
    if (!order.value?.cartProducts) return '0.00'
    return order.value.cartProducts
        .reduce((sum, item) => sum + (item.price * item.quantity), 0)
        .toFixed(2)
}
</script>

<style scoped>
.dashboard {
    display: grid;
    grid-template-columns: 250px 1fr;
    min-height: 100vh;
}

.dashboard-content {
    padding: 2rem;
    background-color: var(--color-surface-subtle);
}

.content-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.back-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--font-size-body);
    padding: 0.5rem;
    border-radius: 4px;
    transition: background-color 0.3s;
}

.back-btn:hover {
    background-color: #e9ecef;
}

.content-header h1 {
    font-size: var(--font-size-heading-sm);
    opacity: 0.8;
    font-weight: var(--font-weight-medium);
    margin: 0;
}

.status-badge {
    background-color: var(--color-brand-secondary);
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-size: var(--font-size-body-sm);
}

.order-details-container {
    display: grid;
    gap: 1.5rem;
}

.order-info-card,
.customer-info-card,
.shipping-info-card,
.products-card {
    background: var(--color-surface);
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h2 {
    font-size: var(--font-size-heading-sm);
    font-weight: var(--font-weight-medium);
    margin: 0 0 1rem 0;
    color: var(--color-text-primary);
    opacity: 0.8;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
}

.info-item label {
    display: block;
    font-size: var(--font-size-body-sm);
    color: var(--color-text-secondary);
    margin-bottom: 0.25rem;
}

.info-item p {
    margin: 0;
    opacity: 0.8;
    font-size: var(--font-size-body);
    color: var(--color-text-primary);
}

.price {
    color: var(--color-brand-secondary);
    font-weight: var(--font-weight-medium);
}

.products-list {
    display: grid;
    gap: 1.5rem;
}

.product-item {
    display: flex;
    gap: 1.5rem;
    padding: 1.5rem;
    border: 1px solid var(--color-border-light);
    border-radius: 8px;
    background-color: var(--color-surface);
}

.product-image {
    width: 120px;
    height: 120px;
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
    background-color: var(--color-surface-muted);
    border-radius: 8px;
    border: 1px solid var(--color-border-light);
}

.product-details {
    flex: 1;
}

.product-details h3 {
    margin: 0 0 1rem 0;
    font-size: var(--font-size-heading-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-primary);
    opacity: 0.8;
}

.product-info {
    display: grid;
    gap: 0.5rem;
}

.info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border-light);
}

.info-row:last-child {
    border-bottom: none;
}

.label {
    color: var(--color-text-secondary);
    font-size: var(--font-size-body-sm);
}

.value {
    font-weight: var(--font-weight-medium);
}

.order-summary {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 2px solid var(--color-border-light);
}

.summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    font-size: var(--font-size-body);
    opacity: 0.8;
}

.summary-row.total {
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 2px solid var(--color-border-light);
    font-size: var(--font-size-heading-sm);
    font-weight: var(--font-weight-medium);
}

.loading {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary);
}

@media (max-width: 768px) {
    .dashboard {
        grid-template-columns: 1fr;
    }
    
    .dashboard-content {
        padding: 1rem;
        padding-bottom: 5rem;
    }

    .content-header {
        margin-bottom: 1rem;
    }

    .header-left {
        width: 100%;
        justify-content: space-between;
    }

    .order-status {
        margin-top: 1rem;
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .order-info-card,
    .customer-info-card,
    .shipping-info-card,
    .products-card {
        padding: 1rem;
    }

    .info-grid {
        grid-template-columns: 1fr;
        gap: 0.75rem;
    }

    .product-item {
        flex-direction: column;
        padding: 1rem;
    }

    .product-image {
        width: 100%;
        height: 200px;
        margin-bottom: 1rem;
    }

    .product-info {
        padding: 0;
    }

    .info-row {
        padding: 0.75rem 0;
    }

    .order-summary {
        margin-top: 1.5rem;
    }
}

@media (max-width: 480px) {
    .content-header {
        flex-direction: column;
        align-items: stretch;
        gap: 1rem;
    }

    .back-btn {
        width: 100%;
        justify-content: center;
    }

    .content-header h1 {
        font-size: var(--font-size-heading-md);
        text-align: center;
    }

    .status-badge {
        width: 100%;
        text-align: center;
    }

    .info-item label {
        font-size: var(--font-size-sm);
    }

    .info-item p {
        font-size: var(--font-size-body-compact);
    }

    .product-details h3 {
        font-size: var(--font-size-lg);
    }

    .summary-row {
        font-size: var(--font-size-body-compact);
    }

    .summary-row.total {
        font-size: var(--font-size-lg);
    }
}
</style> 