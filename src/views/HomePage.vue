<template>
    <Navigation/>
    <div 
        class="home-container"
    >
        <div class="content c-banner">
            <!-- Picture -->
            <div class="banner-message">
                <div class="bm-inner">
                    <div class="bm-title">
                        Meet Assam Golden Tippy
                    </div>
                    <div class="bm-content">
                        A new, limited quantity, golden tipped black tea for the spring.
                    </div>
                    <RouterLink :to="{name: 'shop'}"><button class="btn bm-btn"> SHOP NOW </button></RouterLink>
                </div>
            </div>
        </div>
        <div class="content c-message">
            We source organic and biodynamic teas, directly from people and planet-friendly farms in India.
        </div>
        <div class="content c-best-selling">
            <div class="bs-title">Best Selling Products:</div>
            <div class="bs-item-container">
                <Product
                    v-for="product in productStore.bestSellingProducts"
                    :key="product.id"
                    :product="product"
                />
            </div>
            <div class="bs-footer">
                <RouterLink :to="{name:'shop' }"><button class="btn bs-btn">VIEW ALL</button></RouterLink>
            </div>
        </div> 
        <Footer/>
    </div>
</template>

<script setup>
    import Footer from '../components/Footer.vue'
    import Navigation from '../components/Navigation.vue'
    import Product from '../components/Product.vue'
    import { useProductStore } from '../stores/productStore'

    const productStore = useProductStore()
</script>

<style scoped>
body{
    background-color: aliceblue;
}
.home-container{
    display: grid;
    grid-template-rows: 3fr 1fr 3fr;
    grid-template-columns: 1fr;
    width: 100%;
}
.home-container .c-banner{
    background-image: url(../assets/banner-tea-plantation.jpg);
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
    overflow: clip;
}
.home-container .c-banner .banner-message{
    padding: 20px;
    width: 50%;
    z-index: 1;
    margin-top: 35%;
    margin-left: 10%;
}
.home-container .c-banner .banner-message .bm-inner{
     color: whitesmoke;
}
.home-container .c-banner .banner-message .bm-inner .bm-title{
     font-size: 3.5rem;
     text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
.home-container .c-banner .banner-message .bm-inner .bm-content{
     margin-top: 10px;
     font-size: 1.5rem;
     text-shadow: 2px 2px 4px rgba(0, 0, 0, 1);
}
.home-container .c-banner .banner-message .bm-inner .bm-btn{
     font-size: 1rem;
     font-weight: 300;
     padding: 15px 60px;
     border-radius: 2px;
     margin-top: 20px;
}

.home-container .c-message{
    justify-self: center;
    align-self: center;
    padding: 0 20%;
    text-align: center;
    font-weight: 300;
    font-size: 1.5rem;
    font-style: italic;
}
.home-container .c-best-selling{
    display: grid;
    grid-template-rows: 1fr 11fr 2.5fr;
    grid-template-columns: 1fr;
}
.home-container .c-best-selling .bs-title{
    text-align: center;
    align-self: center;
    font-size: 1.3rem;
    text-transform: uppercase;
    margin-bottom: 20px;
}
.home-container .c-best-selling .bs-item-container{
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    grid-gap: 10px;
    width: 1197px;
    margin: 0 auto;
    overflow: visible;
} 
.home-container .c-best-selling .bs-item-container .bs-item{
    width: 100%;
    margin-top: 10px;
}
.home-container .c-best-selling .bs-footer{
    justify-self: center;
    align-self: center;
}
.bs-btn{
    color: #1B9C85;
    background-color: white;
    padding: 13px 70px;
    border: 0.5px #1B9C85 solid;
    border-radius: 0px;
    transition: 0.3s;
}
.bs-btn:hover{
    color: #1B9C85;
    background-color: white;
    padding: 13px 75px;
    border: 0.5px #1B9C85 solid;
    transition: 0.3s;
}
/* responsive | banner-message */
@media (min-width: 1171px) and (max-width: 1543px){
    .home-container .c-banner .banner-message{
        padding: 20px;
        width: 80%;
        z-index: 1;
        margin-top: 500px;
        margin-left: 150px;
    }   
}
@media (min-width: 805px) and (max-width: 1170px){
    .home-container .c-banner .banner-message{
        padding: 20px;
        width: 80%;
        z-index: 1;
        margin-top: 500px;
        margin-left: 150px;
    }
    .home-container .c-banner .banner-message .bm-inner .bm-title{
        font-size: 2.5rem;
    }  
    .home-container .c-banner .banner-message .bm-inner .bm-content{
        font-size: 1.2rem;
    }  
}
/* responsive | stop shrinking */
@media (max-width: 1200px){
    .home-container .c-best-selling .bs-item-container{
        display: grid;
        grid-template-rows: 1fr 1fr;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-gap: 10px;
        width: 95%;
        margin: 0 auto;
        overflow: visible;
    } 
}
/* smart phone responsive */
@media (max-width: 804px){
    
    .home-container{
        display: grid;
        grid-template-rows: 500px 250px 3fr;
        grid-template-columns: 1fr;
        width: 100%;
    }
    /* banner-message */
    .home-container .c-banner .banner-message{
        padding: 20px;
        width: 100%;
        height: 100px;
        z-index: 1;
        margin-top: 250px;
        margin-left: 0px;
    }   
    .home-container .c-banner .banner-message .bm-inner{
        padding: 20px;
        background-color: rgba(199, 215, 134, 0.3);
        border-radius: 10px;
    }   
    .home-container .c-banner .banner-message .bm-inner .bm-title{
        font-size: 2rem;
    }  
    .home-container .c-banner .banner-message .bm-inner .bm-content{
        font-size: 1rem;
        font-weight: 500;
    }  
    .home-container .c-banner .banner-message .bm-inner .bm-btn{
        font-size: 1rem;
        padding: 10px 50px;
    }  
    .home-container .c-message{
        justify-self: center;
        align-self: center;
        padding: 0 20%;
        text-align: center;
        font-weight: 300;
        font-size: 1.2rem;
        font-style: italic;
    }
    .home-container .c-best-selling{
        display: grid;
        grid-template-rows: 1fr 12fr 1fr;
        grid-template-columns: 1fr;
        align-items: start;
    }
    .home-container .c-best-selling .bs-item-container{
        display: grid;
        grid-template-rows: 1fr 1fr 1fr 1fr;
        grid-template-columns: 1fr 1fr;
        grid-gap: 10px;
        width: 90%;
        margin: 0 auto;
        overflow: visible;
    } 
}
@media (max-width: 340px){
    .home-container .c-banner .banner-message .bm-inner .bm-title{
        font-size: 1.4rem;
    }  
    .home-container .c-banner .banner-message .bm-inner .bm-content{
        font-size: 0.8rem;
        font-weight: 500;
    }
}
</style>