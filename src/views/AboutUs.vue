<template>
    <Navigation/>
<div class="main-container">
    <div class="main-inner-container">
        <div class="title">
            <h1>A note from our Founders</h1>
        </div>
        <div class="founders-img">

        </div>
        <div class="paragraph" style="text-align: center;">
            <p class="p1">Alaya comes from “Himalaya,” the region that inspired us to build a tea company. After growing up drinking chai and traversing this mountainous area in India’s Northeast, visiting small farmers and tea estates, we were keen to build a company that respects these communities and addresses the environmental challenges we face through agriculture.</p>
            <p class="p1">In the eastern Indian state of West Bengal, Darjeeling, a community famous for producing the Champagne of tea, sits amidst the Himalayas. Here, time unravels more slowly. An iconic train makes its way up the mountains, over hours, to this old British outpost. As the fog lifts, women can be seen hugging the sloping tea estates each morning, plucking two leaves and a bud, or tea, by hand. Meanwhile, they sing. It's magical.</p>
            <p class="p1">Nearby, fields of chamomile flowers grace the valleys. Mint grows abundantly. These are the bounties of nature, cultivated by women, resulting in the highest quality teas and herbs. Women are the backbone of agriculture in so many of these communities, be it in Darjeeling, Assam, or Uttar Pradesh. We are a company that celebrates the beauty of these women in the tea growing regions of the world.</p>
            <p class="p1">Thanks for coming along our journey,</p>
            <p class="p1">Esha Chhabra and Smita Satiani Co-founders, Alaya Tea</p>
            <p class="p1">Photo credit: Justin Bettman</p>
        </div>
    </div>
    <Footer/>
</div>
</template>
<script setup>
import Footer from '../components/Footer.vue'
import Navigation from '../components/Navigation.vue'
</script>
<style scoped>
.main-container{
    display: grid;
    width: 100%;
    height: auto;
}
.main-container .main-inner-container{
    display: grid;
    width: 70%;
    margin: 0 auto 50px;
    justify-content: center;
    align-items: center;
}
.main-container .main-inner-container .title{
    display: inline-block;
    margin: 50px auto;
}
.main-container .main-inner-container .title h1{
    display: inline-block;
    font-weight: var(--font-weight-light);
}
.main-container .main-inner-container .founders-img{
    aspect-ratio: 460/612;
    width: 460px;
    height: 612px;
    background-image: url(../assets/about_us.webp);
    background-size: contain;
    background-repeat: no-repeat; 
    margin: 0 auto;
}
.main-container .main-inner-container .paragraph{
    margin: 25px auto;
    width: 80%;
}
.p1{
    letter-spacing: 0.5px;
    line-height: 32px;
    font-weight: var(--font-weight-light);
    margin-bottom: 20px;
}

@media (max-width:500px){
    .main-container .main-inner-container{
        width: 100%;
        overflow: hidden;
    }
    .main-container .main-inner-container .title h1{
        font-size: var(--font-size-heading-sm);
}
@media (max-width:340px){
    .main-container .main-inner-container{
        display: grid;
        width: 100%;
        margin: 0 auto 50px;
        justify-content: center;
        align-items: center;
        font-size: var(--font-size-sm);
    }
    .main-container .main-inner-container .paragraph{
        margin: 25px auto;
        width: 50%;
    }
    .p1{
    letter-spacing: 0.5px;
    line-height: 24px;
    font-weight: var(--font-weight-light);
    margin-bottom: 20px;
}
}
}
</style>


