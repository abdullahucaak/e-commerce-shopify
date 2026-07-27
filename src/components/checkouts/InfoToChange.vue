<template>
    <div class="information-to-change">
        <div class="itc-inner">
            <div class="itc-grid contact">
                <div>Contact</div>
                <div>{{ email }}</div>
            </div>
            <div class="itc-grid ship-to">
                <div>Ship to</div>
                <div> {{ shippingAddress }} </div>
            </div>
            <div v-if="productStore.shippingMethodView" class="itc-grid payment">
                <div>Method</div>
                <div>{{ productStore.order.shippingMethod.name }} - {{ productStore.order.shippingMethod.price }}</div>
            </div>
        </div>
    </div>
</template>

<script setup>
/* pinia */
import { useProductStore } from '../../stores/productStore'
const productStore = useProductStore()


const email = productStore.order.shippingInfo.email
const shippingAddress = productStore.order.shippingInfo.shippingAddress
</script>

<style scoped>

 .information-to-change{
    border: solid 0.5px black;
    border-radius: 10px;
    margin-bottom: 30px;
}
 .itc-inner{
    margin: 10px;
    padding: 10px;
}
 .itc-inner .itc-grid{
    display: grid;
    grid-template-columns: 1fr 5fr;
    column-gap: 10px;
    font-size: var(--font-size-sm);
    border-bottom: solid black 0.5px;
    padding: 20px 0;
}
 .itc-inner .itc-grid:last-child{
    display: grid;
    grid-template-columns: 1fr 5fr;
    font-size: var(--font-size-sm);
    border-bottom: none;
    padding: 20px 0 0 0;
}
 .itc-inner .contact{
    padding: 0 0 20px 0;
}

 .itc-inner .itc-grid div:nth-child(2){
    font-weight: var(--font-weight-medium);
    font-size: var(--font-size-body-sm);
} 
@media (max-width: 490px) {
    .itc-inner .itc-grid{
        font-size: var(--font-size-2xs);
    }
    .itc-inner .itc-grid:last-child{
        font-size: var(--font-size-2xs);
    }
    .itc-inner .itc-grid div:nth-child(2){
        font-size: var(--font-size-2xs);
    } 
}

</style>