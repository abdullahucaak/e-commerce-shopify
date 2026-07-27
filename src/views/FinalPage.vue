<template>
    <div class="wrapper">
        <div class="header">
            <div class="header-inner">
                <img src="../assets/Alaya-Logo_300x300.jpg" alt="Logo">
            </div>
        </div>
        <div class="cards">
            <div v-if="loading" class="loading">
                Sipariş bilgileri yükleniyor...
            </div>
            <div v-else-if="currentOrderIndex === -1" class="error">
                Sipariş bulunamadı!
            </div>
            <div v-else-if="productStore.completedOrders[currentOrderIndex]" class="cards-inner">
                <div class="card left">
                    <div class="card-inner">
                        <div class="c-header">
                            <div class="icon paid">
                                <i class="fa-regular fa-circle-check"></i>
                            </div>
                            <div class="paid" >
                                Thank you {{productStore.completedOrders[currentOrderIndex]?.shippingInfo?.firstName || 'N/A' }}.
                            </div>
                        </div>
                        <div class="c-informing"> 
                            "Your order has been successfully completed."
                        </div>
                        <div class="c-customer-details">
                            <div class="ccd-header">
                                Details:
                            </div>
                            <div class="customer-email">
                                {{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.email || 'N/A' }}
                            </div>
                            <div class="customer-name">
                                <span class="capitalize">{{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.firstName || 'N/A' }} </span>  <span class="capitalize">{{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.lastName || 'N/A' }} </span>
                            </div>
                            <div class="customer-shipping-address">
                                {{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.shippingAddress || 'N/A' }}
                            </div>
                            <div class="customer-city">
                                <span class="capitalize"> {{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.city || 'N/A'  }} </span> / <span class="capitalize"> {{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.country || 'N/A' }} </span>
                                
                            </div>
                            <div class="customer-zip-code">
                                {{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.zipCode || 'N/A'  }} (Zipcode)
                                
                            </div>
                            <div class="customer-phone-number">
                                {{ productStore.completedOrders[currentOrderIndex]?.shippingInfo?.phoneNumber || 'N/A'  }}

                            </div>
                            <div class="customer-order-code">
                                <h5>
                                    Order Number
                                </h5>
                                <span class="order-unique-code">
                                    {{ productStore.completedOrders[currentOrderIndex]?.orderUniqueCode || 'N/A'  }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div 
                    v-if="productStore.completedOrders[currentOrderIndex].cartProducts.length <= 2"
                    class="card right"
                >
                    <div class="card-inner">
                        <div class="c-header">
                            Order Summary
                        </div>
                        <div v-for="chosenProduct in productStore.completedOrders[currentOrderIndex]?.cartProducts || 'N/A' " class="chosen-product">
                            <ChosenProduct :chosenProduct="chosenProduct"/>
                        </div>
                        <div class="total-price-wrapper">
                            <div class="tp-item">Subtotal</div>
                            <div class="tp-item tp-right">
                                <span 
                                    v-if="productStore.completedOrders[currentOrderIndex].priceBeforeDiscount" 
                                    class="old-price"
                                >
                                    $ {{ productStore.completedOrders[currentOrderIndex].priceBeforeDiscount }}
                                </span>
                                $ {{ (parseFloat(productStore.completedOrders[currentOrderIndex]?.finalPrice || 'N/A' ) - parseFloat(productStore.completedOrders[currentOrderIndex]?.shippingMethod?.price || 'N/A' )).toFixed(2) }}
                            </div>
                            <div class="tp-item">Shipping</div>
                            <div class="tp-item tp-right"><small>${{ productStore.completedOrders[currentOrderIndex]?.shippingMethod?.price || 'N/A'  }}</small></div>
                            <div class="tp-item paid">Paid</div>
                            <div class="tp-item tp-right paid">$ {{ productStore.completedOrders[currentOrderIndex]?.finalPrice || 'N/A'  }}</div>
                        </div>
                    </div>    
                </div>
                <div 
                    v-else
                    class="card right row-span-4"
                >
                    <div class="card-inner">
                        <div class="c-header">
                            Order Summary
                        </div>
                        <div v-for="chosenProduct in productStore.completedOrders[currentOrderIndex]?.cartProducts || 'N/A' " class="chosen-product">
                            <ChosenProduct :chosenProduct="chosenProduct"/>
                        </div>
                        <div class="total-price-wrapper">
                            <div class="tp-item">Subtotal</div>
                            <div class="tp-item tp-right">
                                <span 
                                    v-if="productStore.completedOrders[currentOrderIndex].priceBeforeDiscount" 
                                    class="old-price"
                                >
                                    $ {{ productStore.completedOrders[currentOrderIndex].priceBeforeDiscount }}
                                </span>
                                $ {{ (parseFloat(productStore.completedOrders[currentOrderIndex]?.finalPrice || 'N/A' ) - parseFloat(productStore.completedOrders[currentOrderIndex]?.shippingMethod?.price || 'N/A' )).toFixed(2) }}
                            </div>
                            <div class="tp-item">Shipping</div>
                            <div class="tp-item tp-right"><small>${{ productStore.completedOrders[currentOrderIndex]?.shippingMethod?.price || 'N/A'  }}</small></div>
                            <div class="tp-item paid">Paid</div>
                            <div class="tp-item tp-right paid">$ {{ productStore.completedOrders[currentOrderIndex]?.finalPrice || 'N/A'  }}</div>
                        </div>
                    </div>    
                </div>
                <div class="button">
                    <RouterLink :to="{name:'home'}">
                        <button>
                            Alışverişe Devam Et
                        </button>
                    </RouterLink>
                </div>
                <div class="customer-service">
                    {{ productStore.completedOrders[currentOrderIndex].orderUniqueCode }} numaralı siparişiniz ile ilgili müşteri hizmetlerimizi <bold>'+90 555 395 77 57'</bold> numaralı telefondan arayarak bilgi alabilirsiniz.
                </div>
            </div>
            <div v-else class="error">
                Sipariş bilgileri yüklenemedi. Lütfen daha sonra tekrar deneyin.
            </div>
        </div>
    </div>
</template>

<script setup>
console.log("FINAL PAGE ONLINE")
import { ref, onMounted, watch } from 'vue';
/* components */
import ChosenProduct from '../components/checkouts/ChosenProduct.vue'

/* pinia */
import { useProductStore } from '../stores/productStore';
const productStore = useProductStore()

/* router */
import { useRoute } from "vue-router";
const route = useRoute()

const currentOrderIndex = ref(null)
const loading = ref(true)

onMounted(async () => {
    try {
        loading.value = true
        console.log('Loading completed orders...')
        await productStore.getCompletedOrders()
        
        const orderId = route.params.id
        console.log('Looking for order:', orderId)
        
        if (productStore.completedOrders && productStore.completedOrders.length > 0) {
            currentOrderIndex.value = productStore.completedOrders.findIndex(order => order.orderUniqueCode === orderId)
            console.log('Found order at index:', currentOrderIndex.value)
            
            if (currentOrderIndex.value === -1) {
                console.error('Order not found!')
            }
        } else {
            console.error('No completed orders found!')
        }
    } catch (error) {
        console.error('Error loading order:', error)
    } finally {
        loading.value = false
    }
})

// İzle route.params.id değişikliklerini
watch(() => route.params.id, async (newId) => {
    if (newId && productStore.completedOrders) {
        currentOrderIndex.value = productStore.completedOrders.findIndex(order => order.orderUniqueCode === newId)
    }
})
</script>

<style scoped>
     body{
         background-color: #F5F5F5;
     }
     .wrapper{
         width: 100%;
     }
     .header-inner{
         padding-left: 80px;
     }
     .header .header-inner img{
         width: 200px;
         height: 147px;
     }

     .cards .cards-inner{
         display: grid;
         grid-template-columns: 1fr 1fr;
         align-items: start;
         width: 1539px;
         margin: 0 auto;
     }
     .card{
         width: 95%;
         margin: 0 auto;
         padding: 40px;
         box-shadow: 0px 50px 100px rgba(0, 0, 0, 0.7);
         border-radius: 3px;
         text-shadow: 0px 3px 10px rgba(0, 0, 0, 0.5);
     }
     .left{
         user-select: none;
     }

     .left .card-inner .c-header{
         display: grid;
         grid-template-columns: max-content 9fr;
         font-size: 30px;
     }
     .left .card-inner .c-header .icon{
         display: inline-block;
         margin-right: 10px;
     }
     .left .c-informing{
         margin-top: 20px;
     }
     .left .c-customer-details{
         margin-top: 40px;
     }
     .left .c-customer-details div{
         margin-top: 8px;
     }
     .left .c-customer-details div:nth-child(1){
         font-weight: var(--font-weight-semibold);
     }
     .left .c-customer-details div:not(:first-child){
         color: gray;
         text-shadow: 0px 0px 10px rgba(0, 0, 0, 0.3);
     }
     .left .c-customer-details div:last-child{
         color: var(--color-brand-primary);
         font-size: 24px;
         margin-top: 10px;
     }
     .capitalize{
         text-transform: capitalize;
     }

     .row-span-4{
         grid-row: span 4;
     }

     .right .card-inner .c-header{
         font-size: 30px;
         opacity: 0.9;
     }
     .right .card-inner .chosen-product{
         display: grid;
         grid-template-columns: 1fr 5fr 1fr;
         align-items: center;
         margin-top: 15px;
     }
     .right .card-inner .chosen-product:last-child{
         border-bottom: 0.5px solid gray;
         padding-bottom: 20px;
     }
     .total-price-wrapper{
         display: grid;
         grid-template-columns: 1fr 1fr;
         margin-top: 20px;
         border-top: 0.5px solid gray;
     }
     .total-price-wrapper .tp-item{
         margin-top: 10px;
     }
     .total-price-wrapper .tp-item:nth-child(5),
     .total-price-wrapper .tp-item:nth-child(6){
         font-weight: var(--font-weight-semibold);
     }

     .total-price-wrapper .tp-right{
         justify-self: end;
     }
     .total-price-wrapper .tp-right .old-price{
         color: rgb(230, 69, 69);
         text-decoration:line-through;
         font-weight: var(--font-weight-semibold);
         margin-right: 10px;
     }

     .paid{
         color: var(--color-brand-primary);
     }
     .old-price{
         color: rgb(230, 69, 69);
         text-decoration:line-through;
         font-weight: bold;
         margin-right: 10px;
     }

     div.button{
         text-align: center;
     }
     
     button{
         width: 95%;
         background-color: #1c1c1c;
         color: white;
         padding: 30px 20px;
         border-radius: 3px;
         font-size: 14px;
         letter-spacing: 3px;
         transition: 0.3s;
     }
     button:hover{
             background-color: #000;
             transition: 0.3s;
             box-shadow: 0px 10px 20px rgba(0, 0, 0, 0.2);
     }
     .customer-service{
         width: 95%;
         margin: 20px auto 0;
         text-align: justify;
         text-shadow: 0px 3px 10px rgba(0, 0, 0, 0.4);
     }

     @media (max-width:1539px){
         .cards .cards-inner{
             width: 99%;
         }
     }
     @media (max-width:1193px){
         .customer-order-code h5,
         .customer-order-code span{
             font-size: 16px;
         }
     }
     @media (max-width:999px){
         .header-inner{
             padding-left: 80px;
         }
         .cards .cards-inner{
             display: grid;
             grid-template-columns: 1fr;
             width: 80%;
             margin: 0 auto;
         }

         .card{
             margin-bottom: 20px;
         }

         .customer-service{
             font-size: 12px;
             margin-bottom: 20px;
         }
     }
     @media (max-width:780px){
         .header-inner{
             padding-left: 20px;
         }
         .header .header-inner img{
             width: 150px;
             height: 110px;
         }
         .cards .cards-inner{
             display: grid;
             grid-template-columns: 1fr;
             width: 99%;
             margin: 0 auto;
         }

         .card{
             margin-bottom: 20px;
         }

         .customer-service{
             font-size: 12px;
             margin-bottom: 20px;
         }
     }
     @media (max-width:501px){
         .cards-inner{
             width: 100%;
         }
         .card{
             padding: 20px;
             width: 100%;

            box-shadow: 0px 5px 100px rgba(0, 0, 0, 0.1);
            text-shadow: 0px 3px 10px rgba(0, 0, 0, 0.5);
         }

         .c-header div{
             font-size: 26px;
         }
         .c-informing{
             font-size: 16px;
         }
         .c-customer-details{
             font-size: 12px;
         }
     }
</style>