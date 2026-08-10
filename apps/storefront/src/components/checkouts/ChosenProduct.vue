<template>
    <div class="cp-img"
    :style="{ 'background-image':`url(/images/${chosenProduct.photo}`}">

        <div class="cp-count">
            <div class="cp-count-inner">
                {{ chosenProduct.quantity }}
            </div>
        </div>
    </div>
    <div class="cp-name">
        {{ chosenProduct.name }}
    </div>
    <div class="cp price">
        ${{ chosenProduct.totalPrice }}
    </div>
</template>
<script setup>
/* computed */

    const props = defineProps({
        chosenProduct:{
            type: Object,
            required: false
        }
    })

</script>
<style scoped>
.cp-img{
      aspect-ratio: 1/1;
      width: 100%;
      height: auto;
      /* background-image: url(../assets/products/assam-black-600x600.webp); */
      background-size: contain;
      background-repeat: no-repeat;
      border-radius: 10px;
      position: relative;
    }
    .cp-count{
        width: 19px;
        height: 19px;
        background-color: #4c4cad;
        border-radius: 50%;
        position: absolute;
        top: -7px;
        right: -7px;
        z-index: 1;
    }
    .cp-count-inner{
        position: absolute;
        color: rgb(245, 245, 245);
        top: 1px;
        font-size: var(--font-size-sm);
        width: 100%;
        height: 100%;
        text-align: center;
    }
.cp-name{
  margin-left: 20px;
  text-transform: uppercase;
}
</style>