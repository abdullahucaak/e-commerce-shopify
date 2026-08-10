<template>
    <div class="main">
        <div class="header-img">
            <div class="header-img-inner">
                Alaya Tea
            </div>
        </div>
    </div>
</template>
<style scoped>
.main .header-img{
    display: grid;
    align-content: end;
    background-image: url(../assets/tea-workers.jpeg);
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
    overflow: clip;
    height: 146px;
}
.main .header-img .header-img-inner{
    width: 70%;
    margin: 0 auto 20px;
    color: white;
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}
</style>