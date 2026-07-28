<template>
  <div class="inner-navbar">
      <ul>
        <li>
          Cart
          <span></span>
        </li>
        <li
        :class="{currentPage: (componentIndex === 1)}"
        >
          Information
          <span></span>
        </li>
        <li
        :class="{currentPage: (componentIndex === 2)}"
        >
          Shipping
          <span></span>
        </li>
        <li
        :class="{currentPage: (componentIndex === 3)}"
        >
          Payment
          <span></span>
        </li>
      </ul>
  </div>
</template>
<script setup>
  const props = defineProps({
    componentIndex:{
      type: Number,
      required: false
    }
  })

</script>

<style scoped>
.main-checkouts .inner-navbar ul{
  width: 62%;
  margin: 30px auto 0;
}
.main-checkouts .inner-navbar ul li{
  display: inline-block;
  padding: 0 10px;
  margin-bottom: 20px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  user-select: none;
}
.main-checkouts .inner-navbar ul li span{
  display: inline-block;
    width: 0.4em;
    height: 0.4em;
    margin-left: 5px;
    margin-bottom: 2px;
    border-top: 1px solid;
    border-right: 1px solid;
    transform: rotate(45deg);
    transition: transform 0.3s;
}
.main-checkouts .inner-navbar ul li:last-child span{
display: none;
}
.currentPage{
  text-decoration: underline;
  color: var(--color-brand-secondary);
}
@media (max-width: 537px){
  .main-checkouts .inner-navbar ul{
    width: 100;
  }
  .main-checkouts .inner-navbar ul li{
    padding: 0 5px;
  }
}
@media (max-width: 490px){
  .main-checkouts .inner-navbar ul li{
    font-size: 9px;
  }
}
@media (max-width: 340px){
  .main-checkouts .inner-navbar ul{
    width: 80%;
    margin: 30px auto 0;
  }
}
</style>