<template>
    <Navigation/>
<div class="main-container">
    <div class="main-inner-container">
        <div class="title">
            <h1>{{ brand.content.about.title }}</h1>
        </div>
        <div class="founders-img" role="img" :aria-label="brand.content.about.imageAlt" :style="{ backgroundImage: `url('${brand.content.about.imageUrl}')` }">

        </div>
        <div class="paragraph" style="text-align: center;">
            <p v-for="(paragraph, index) in aboutParagraphs" :key="index" class="p1">{{ paragraph }}</p>
        </div>
    </div>
    <Footer/>
</div>
</template>
<script setup>
import { computed } from 'vue'
import Footer from '../components/Footer.vue'
import Navigation from '../components/Navigation.vue'
import { brand } from '../config/brand'

const aboutParagraphs = computed(() => brand.content.about.body
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean))
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

