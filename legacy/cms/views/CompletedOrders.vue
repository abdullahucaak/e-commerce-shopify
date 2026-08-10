<template>
    <div class="dashboard">
        <Navigation />
        <div class="dashboard-content">
            <div class="content-header">
                <h1>Tamamlanan Siparişler</h1>
            </div>
            <div class="orders-container">
                <div v-for="order in sortedOrders" :key="order.orderUniqueCode" class="order-card">
                    <div class="order-header">
                        <div class="order-number">Sipariş No: {{ order.orderUniqueCode }}</div>
                        <span class="order-date">{{ new Date(order.cartInformation.expirationDate).toLocaleDateString() }}</span>
                    </div>
                    <div class="customer-info">
                        <p>Müşteri: {{ order.shippingInfo.firstName }} {{ order.shippingInfo.lastName }}</p>
                        <p>Email: {{ order.shippingInfo.email }}</p>
                        <p>Telefon: {{ order.shippingInfo.phoneNumber }}</p>
                    </div>
                    <div class="shipping-info">
                        <p>Adres: {{ order.shippingInfo.shippingAddress }}</p>
                        <p>Şehir: {{ order.shippingInfo.city }}</p>
                        <p>Posta Kodu: {{ order.shippingInfo.zipCode }}</p>
                    </div>
                    <div class="order-items">
                        <div class="order-details">Sipariş Detayları</div>
                        <ul>
                            <li v-for="item in order.cartProducts" :key="item.id">
                                {{ item.name }} - {{ item.quantity }} adet - ${{ item.price }}
                            </li>
                        </ul>
                    </div>
                    <div class="order-total">
                        <p>Toplam Tutar: ${{ order.finalPrice }}</p>
                        <button class="view-details-btn" @click="router.push(`/cms/order/${order.orderUniqueCode}`)">
                            <i class="fas fa-eye"></i> Detayları Görüntüle
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useProductStore } from '../../stores/productStore'
import Navigation from '../../components/cms/Navigation.vue'

const router = useRouter()
const productStore = useProductStore()
const completedOrders = ref([])

onMounted(async () => {
    await productStore.getCompletedOrders()
    completedOrders.value = productStore.completedOrders
})

const sortedOrders = computed(() => {
    return [...completedOrders.value].sort((a, b) => b.id - a.id)
})
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
    margin-bottom: 2rem;
}

.content-header h1 {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-medium);
    opacity: 0.9;
}

.orders-container {
    display: grid;
    gap: 1.5rem;
}

.order-card {
    background: var(--color-surface);
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border-light);
}

.order-number {
    color: var(--color-brand-secondary);
}

.order-date {
    color: var(--color-text-secondary);
}

.customer-info, .shipping-info {
    margin-bottom: 1rem;
}

.customer-info p, .shipping-info p {
    margin: 0.5rem 0;
    opacity: 0.8;
}

.order-items {
    margin: 1rem 0;
}

.order-items h4 {
    margin-bottom: 0.5rem;
}

.order-items ul {
    list-style: none;
    padding: 0;
}

.order-items li {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--color-border-light);
}

.order-total {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border-light);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.view-details-btn {
    background-color: var(--color-brand-secondary);
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: var(--font-size-body-sm);
    transition: background-color 0.3s;
}

.view-details-btn:hover {
    background-color: var(--color-brand-hover);
}

.view-details-btn i {
    font-size: var(--font-size-body);
}

.order-total p {
    font-size: var(--font-size-lg);
    color: var(--color-brand-secondary);
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
        text-align: center;
    }

    .order-card {
        padding: 1rem;
    }

    .order-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }

    .customer-info p, .shipping-info p {
        font-size: var(--font-size-body-sm);
    }

    .order-total {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
    }

    .view-details-btn {
        width: 100%;
        justify-content: center;
    }
}

@media (max-width: 480px) {
    .content-header h1 {
        font-size: var(--font-size-heading-md);
    }

    .order-items li {
        font-size: var(--font-size-body-sm);
        padding: 0.75rem 0;
    }
}
</style>
