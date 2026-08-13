<template>
    <Navigation/>
    <div 
        class="home-container"
    >
        <div
            class="content c-banner"
            :style="{ backgroundImage: `url(${brand.content.home.heroImageUrl})` }"
        >
            <!-- Picture -->
            <div class="banner-message">
                <div class="bm-inner">
                    <div class="bm-title text-hero-title">
                        {{ brand.content.home.heroTitle }}
                    </div>
                    <div class="bm-content text-hero-copy">
                        {{ brand.content.home.heroSubtitle }}
                    </div>
                    <RouterLink :to="{ name: 'shop' }"><button class="btn bm-btn button button-primary">SHOP NOW</button></RouterLink>
                </div>
            </div>
        </div>
        <div class="content c-message text-body">
            {{ brand.content.home.statement }}
        </div>
        <div class="content c-best-selling">
            <div class="bs-title text-section-title">Best Selling Products:</div>
            <div class="bs-item-container">
                <Product
                    v-for="product in productStore.bestSellingProducts"
                    :key="product.id"
                    :product="product"
                />
            </div>
            <div class="bs-footer">
                <RouterLink :to="{name:'shop' }"><button class="btn bs-btn button button-outline">VIEW ALL</button></RouterLink>
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
    import { brand } from '../config/brand'

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
     font-size: var(--font-size-2xl);
     text-shadow: 2px 2px 4px rgba(0, 0, 0, 1);
}
.home-container .c-banner .banner-message .bm-inner .bm-btn{
     --bm-padding-inline: 60px;
     color: var(--color-brand-quinary, var(--color-brand-contrast));
     font-size: var(--font-size-body);
     font-weight: var(--font-weight-light);
     padding: 15px var(--bm-padding-inline);
     border-radius: 2px;
     margin-top: 20px;
}
.home-container .c-banner .banner-message .bm-inner .bm-btn:hover{
     background-color: var(--color-brand-secondary);
     padding-right: calc(var(--bm-padding-inline) + clamp(8px, 1.5vw, 15px));
}

.home-container .c-message{
    justify-self: center;
    align-self: center;
    padding: 0 20%;
    text-align: center;
    font-weight: var(--font-weight-light);
    font-size: var(--font-size-2xl);
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
    font-size: var(--font-size-xl);
    text-transform: uppercase;
    margin-bottom: 20px;
}
.home-container .c-best-selling .bs-item-container{
    display: grid;
    grid-template-rows: 1fr 1fr;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: var(--card-gap);
    width: min(
      calc(100% - (2 * var(--page-padding-inline))),
      var(--product-grid-max-width)
    );
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
    color: var(--color-brand-secondary);
    background-color: var(--color-surface);
    padding: 13px 70px;
    border: 0.5px var(--color-brand-secondary) solid;
    border-radius: 0px;
    transition: 0.3s;
}
.bs-btn:hover{
    color: var(--color-brand-secondary);
    background-color: var(--color-surface);
    padding: 13px 75px;
    border: 0.5px var(--color-brand-secondary) solid;
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
        font-size: var(--font-size-heading-sm);
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
        font-size: var(--font-size-3xl);
    }  
    .home-container .c-banner .banner-message .bm-inner .bm-content{
        font-size: var(--font-size-body);
        font-weight: var(--font-weight-medium);
    }  
    .home-container .c-banner .banner-message .bm-inner .bm-btn{
        --bm-padding-inline: 50px;
        font-size: var(--font-size-body);
        padding: 10px var(--bm-padding-inline);
    }  
    .home-container .c-message{
        justify-self: center;
        align-self: center;
        padding: 0 20%;
        text-align: center;
        font-weight: var(--font-weight-light);
        font-size: var(--font-size-heading-sm);
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
@media (min-width: 393px) and (max-width: 524px){
    .home-container .c-banner .banner-message .bm-inner .bm-title{
        font-size: 1.65rem;
        line-height: 1.25;
    }

    .home-container .c-banner .banner-message .bm-inner .bm-content{
        font-size: var(--font-size-body-sm);
        line-height: 1.5;
    }

    .home-container .c-banner .banner-message .bm-inner .bm-btn{
        font-size: var(--font-size-sm-relaxed);
    }

    .home-container .c-message{
        font-size: var(--font-size-body);
        line-height: 1.55;
    }

    .home-container .c-best-selling .bs-title{
        font-size: var(--font-size-body-large);
    }

    .home-container .c-best-selling .bs-footer .bs-btn{
        font-size: var(--font-size-sm-relaxed);
    }
}
@media (max-width: 392px){
    .home-container .c-best-selling .bs-footer{
        margin-bottom: 15px;
    }
    .home-container .c-message{
        font-size: var(--font-size-body);
        line-height: 1.55;
    }
}
@media (max-width: 362px){
    .home-container .c-banner .banner-message .bm-inner .bm-title{
        font-size: 1.4rem;
    }  
    .home-container .c-banner .banner-message .bm-inner .bm-content{
        font-size: var(--font-size-body-sm);
        font-weight: var(--font-weight-medium);
    }
    .home-container .c-message{
        font-size: var(--font-size-body);
        line-height: 1.55;
    }

}
</style>
