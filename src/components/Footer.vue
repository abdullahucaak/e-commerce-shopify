<template>
    <div class="footer">
        <div class="f-container">
            <div class="f-item">
                <div class="f-item-inner">
                    <div class="f-title">
                        ALAYA TEA
                    </div>
                    <div class="f-content">
                        <ul>
                            <li>
                                <RouterLink :to="{name:'shop'}">Shop</RouterLink>
                            </li>
                            <li>
                                <RouterLink :to="{name:'about-us'}">About Us</RouterLink>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="f-item">
                <div class="f-item-inner">
                    <div class="f-title">
                        STAY IN TOUCH: JOIN OUR NEWSLETTER
                    </div>
                    <div class="f-content">
                        <form
                            ref="subscriptionForm"
                            class="subscription"
                            :action="shopifyNewsletterUrl"
                            method="post"
                            target="shopify-newsletter-frame"
                            accept-charset="UTF-8"
                            @submit.prevent="subscribe"
                        >
                            <input type="hidden" name="form_type" value="customer">
                            <input type="hidden" name="utf8" value="✓">
                            <input type="hidden" name="contact[tags]" value="newsletter">

                            <input
                                v-model.trim="email"
                                class="f-input"
                                type="email"
                                name="contact[email]"
                                placeholder="Email Address"
                                autocomplete="email"
                                required
                            >

                            <button
                                class="btn f-btn"
                                type="submit"
                                :disabled="!isValidEmail || isSubmitting"
                            >
                                {{ isSubmitting ? 'SUBSCRIBING...' : 'SUBSCRIBE' }}
                            </button>
                        </form>

                        <iframe
                            name="shopify-newsletter-frame"
                            class="newsletter-frame"
                            title="Newsletter subscription response"
                        ></iframe>

                        <div v-if="subscriptionMessage" :class="['subscription-message', subscriptionStatus]">
                            {{ subscriptionMessage }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="f-item">
                <div class="f-item-inner">
                    <div class="f-title">
                        CONTACT
                    </div>
                    <div class="f-content">
                        <ul>
                            <li>info@alayatea.co</li>
                            <li>press@alayatea.co</li>
                            <li>wholesale@alayatea.co</li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="f-item f-icons-item">
                <div class="f-item-inner">
                    <div class="f-content">
                        <ul>
                            <li class="icons">
                                <i class="fa-brands fa-apple-pay fa-2xl"></i>
                            </li>
                            <li class="icons">
                                <i class="fa-brands fa-google-pay fa-2xl"></i>
                            </li>
                            <li class="icons">
                                <i class="fa-brands fa-paypal fa-2xl"></i>
                            </li>
                            <li class="icons">
                                <i class="fa-brands fa-cc-mastercard fa-2xl"></i>
                            </li>
                            <li class="icons">
                                <i class="fa-brands fa-cc-visa fa-2xl"></i>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
            <div class="f-item">
                <div class="f-item-inner">
                    <div class="f-content">
                        <div class="social-media-icons">
                            <ul>
                                <li class="icons">
                                    <i class="fa-brands fa-facebook fa-2xl"></i>
                                </li>
                                <li class="icons">
                                    <i class="fa-brands fa-instagram fa-2xl"></i>
                                </li>
                            </ul>
                        </div>
                        <div class="alaya-tea">
                            © 2023, Alaya Tea
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'

const email = ref('')
const subscriptionForm = ref(null)
const subscriptionMessage = ref('')
const subscriptionStatus = ref('')
const isSubmitting = ref(false)

const shopifyDomain = (import.meta.env.VITE_SHOPIFY_DOMAIN || '')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')

const shopifyNewsletterUrl = computed(() => {
    return shopifyDomain ? `https://${shopifyDomain}/contact#contact_form` : ''
})

const isValidEmail = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.value)
})

const subscribe = async () => {
    subscriptionMessage.value = ''
    subscriptionStatus.value = ''

    if (!shopifyNewsletterUrl.value) {
        subscriptionMessage.value = 'Shopify store connection is missing.'
        subscriptionStatus.value = 'error'
        return
    }

    if (!isValidEmail.value) {
        subscriptionMessage.value = 'Please enter a valid email address.'
        subscriptionStatus.value = 'error'
        return
    }

    if (isSubmitting.value) return

    isSubmitting.value = true

    try {
        await nextTick()
        subscriptionForm.value?.submit()

        // Shopify's native customer form is submitted into the hidden iframe.
        // The response is cross-origin, so the browser does not allow us to read it.
        window.setTimeout(() => {
            subscriptionMessage.value = 'You have successfully subscribed to our newsletter!'
            subscriptionStatus.value = 'success'
            email.value = ''
            isSubmitting.value = false
        }, 1000)
    } catch (error) {
        subscriptionMessage.value = 'Something went wrong. Please try again later.'
        subscriptionStatus.value = 'error'
        isSubmitting.value = false
        console.error('Newsletter subscription error:', error)
    }
}
</script>

<style scoped>
    .footer{
        background-color: #4C4C6D;
        width: 100%;
        height: auto;
    }
    .footer .f-container{
        width: 70%;
        margin: 50px auto;
        display: grid;
        grid-template-rows: 235px 150px;
        grid-template-columns: 1fr 2fr 1fr;
        grid-gap: 15px;
    }
    .footer .f-container .f-item{
        padding: 25px;
    }
    .footer .f-container .f-item .f-item-inner{
        color: whitesmoke;
        letter-spacing: 3px;
    }
    .footer .f-container .f-item .f-item-inner .f-title{
        font-size: 1.1rem;
    }
    .footer .f-container .f-item .f-item-inner .f-content{
        margin-top: 20px;
    }
    /* item-1 */
    .footer .f-container .f-item .f-item-inner .f-content ul li{
        font-size: 0.9rem;
        margin-top: 25px;
    }
    .footer .f-container .f-item .f-item-inner .f-content ul li a{
        color: whitesmoke;
        border-bottom: 0.5px solid whitesmoke;
    }
    /* item-2 */
    .footer .f-container .f-item .f-item-inner .f-content .f-input{
        width: 60%;
        padding: 10px 0;
        margin-right: 5px;
        border-radius: 2px;
        font-size: 1rem;
        text-indent: 10px;
    }
    /* item-3 */
    
    /* item-4 */
    .footer .f-container .f-icons-item{
        grid-column: 1/3;
        padding: 25px 0;
    }
    .footer .f-container .f-item .f-item-inner .f-content ul li.icons{
        display: inline-block;
        padding: 20px 10px;
    }
    /* item-5 */
    .footer .f-container .f-item:nth-child(5){
        padding: 25px 0;
        justify-self: end;
    }
    .footer .f-container .f-item .f-item-inner .f-content .alaya-tea{
        font-size: 0.8rem;
        letter-spacing: 0.8px;
    }
    /* item-1, item-2, item-3 border-bottom */
    .footer .f-container .f-item:nth-child(-n+3){ /* prototürk */
        border-bottom: 0.5px solid whitesmoke;
    }
    .subscription-message {
        margin-top: 10px;
        font-size: 0.8rem;
        text-align: left;
    }

    .newsletter-frame {
        display: none;
        width: 0;
        height: 0;
        border: 0;
    }

    .subscription-message.success {
        color: white;
    }

    .subscription-message.error {
        color: #E74646;
    }

    .f-btn:disabled {
        opacity: 1;
        cursor: not-allowed;
    }

    @media (min-width: 1171px) and (max-width: 2000px){
        .footer .f-container{
            width: 85%;
            margin: 50px auto;
            display: grid;
            grid-template-rows: 235px 150px;
            grid-template-columns: 1fr 2fr 1fr;
            grid-gap: 15px;
        }
        .footer .f-container .f-item .f-item-inner .f-content .f-input{
            width: 60%;
            padding: 10px 0;
            margin-right: 5px;
            border-radius: 2px;
            font-size: 0.9rem;
            text-indent: 10px;
        }

    }
    @media (min-width: 805px) and (max-width: 1170px){
        .footer .f-container{
            width: 95%;
            grid-template-rows: 235px 200px 150px;
            grid-template-columns: 1fr 1fr 1fr 1fr;
            grid-gap: 15px;
        }
        .f-item:nth-child(1){
            grid-column: 1/3;
        }
        .f-item:nth-child(3){
            grid-row: 1/2;
            grid-column: 3/5;
        }
        .f-item:nth-child(2){
            grid-column: 1/5;
        }
        .f-item:nth-child(2) .f-item-inner{
            padding-top: 25px;
        }
        .f-item:nth-child(5){
            grid-column: 4/5;
        }

    }
    @media (max-width: 804px){
        .footer .f-container{
            display: grid;
            grid-template-rows: 200px 200px 230px 75px 150px;
            grid-template-columns: 1fr;
            grid-gap: 15px;
            width: 90%;
        }
        .footer .f-container .f-item{
            width: 100%;
        }
        .footer .f-container .f-item:nth-child(1){
            grid-row: 1/2;
        }
        .footer .f-container .f-item:nth-child(2){
            grid-row: 2/3;
        }
        .footer .f-container .f-item .f-item-inner .f-content .f-input{
        font-size: 0.8rem;
        text-indent: 5px;
    }
        .footer .f-container .f-item:nth-child(2) .f-item-inner .f-content .subscription .f-btn{
            padding: 10px 10px;
        }
        .footer .f-container .f-item:nth-child(3){
            grid-row: 3/4;
        }
        .footer .f-container .f-item:nth-child(4){
            grid-row: 4/5;
            text-align: center;
        }
        .footer .f-container .f-item:nth-child(5){
            grid-row: 5/6;
            text-align: center;
        }
        .footer .f-container .f-item:nth-child(5) .f-item-inner .f-content .social-media-icons ul li{
            padding: 35px 10px;
        }
        .footer .f-container .f-icons-item{
            padding: 0;
        }

        .footer .f-container .f-item .f-item-inner .f-content ul li.icons{
            padding: 10px 5px;
        }

    }
    @media (min-width: 341px) and (max-width: 370px) {

        .footer .f-container .f-item .f-item-inner .f-content .subscription {
            display: flex;
            align-items: center;
            gap: 5px;
            width: 100%;
        }

        .footer .f-container .f-item .f-item-inner .f-content .f-input {
            flex: 1;
            min-width: 0;
            width: auto;
            margin-right: 0;
        }

        .footer .f-container .f-item .f-item-inner .f-content .subscription .f-btn {
            flex-shrink: 0;
            white-space: nowrap;
        }

    }
    @media (max-width: 340px){
        
        .footer .f-container{
            display: grid;
            grid-template-rows: 170px 160px 200px 50px 150px;
            grid-template-columns: 1fr;
            grid-gap: 0px;
            width: 95%;
        }
        .footer .f-container .f-item{
            padding: 25px;
            height: auto;
        }
        
        .footer .f-container .f-item .f-item-inner .f-title{
            font-size: 1rem;
        }
        .footer .f-container .f-item .f-item-inner .f-content ul li{
            font-size: 0.7rem;
            margin-top: 25px;
        }
        
        .footer .f-container .f-item .f-item-inner .f-content .f-input{
            width: 60%;
            padding: 10px 0;
            margin-right: 5px;
            border-radius: 2px;
            font-size: 0.6rem;
            text-indent: 10px;
        }
        .footer .f-container .f-item .f-item-inner .f-content .alaya-tea{
            font-size: 0.8rem;
            letter-spacing: 0.8px;
        }
        .footer .f-container .f-item:nth-child(2) .f-item-inner .f-content .subscription .f-btn{
            padding: 10px 9px;
            font-size: 0.7rem;
        }
        .subscription-message {
            margin-top: 8px;
            margin-bottom: 10px;
            font-size: 0.6rem;
            text-align: left;
        }

        .subscription-message.success {
            color: white;
        }

        .subscription-message.error {
            color: #E74646;
        }

        .f-btn:disabled {
            opacity: 1;
            cursor: not-allowed;
        }
    }

</style>