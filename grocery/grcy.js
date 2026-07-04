// ==================== CONFIGURATION ====================
const SHOP_LAT = 26.948706;
const SHOP_LON = 94.532547;
const MAX_RADIUS = 5; // 5 km

let cart = loadCartFromStorage();              // { productName: { price, qty } }
let deliveryCharge = 0;
let userCoords = null;
let productList = [];        // store product metadata for rendering

// EmailJS credentials (Replace with YOUR actual keys for email)
// Get from https://www.emailjs.com/ - Free tier works!
const EMAILJS_PUBLIC_KEY = "BPl4WekWAGX8AzDXB";    // replace
const EMAILJS_SERVICE_ID = "service_3s7qqzj";   // replace
const EMAILJS_TEMPLATE_ID = "template_dpwgvcm";    // replace

// Initialize EmailJS if keys are set (not mandatory for demo)
(function initEmailJS() {
    if(EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY") {
        emailjs.init(EMAILJS_PUBLIC_KEY);
    }
})();

// ==================== FETCH PRODUCTS FROM GOOGLE SHEETS ====================
async function fetchProducts() {
    const DATA_URL = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSP7rgk3JAuY7S10_WSPh1N0dQpGRoAibzbnDX_Mh0aeRItwbwh970KXGKOmTJF-QFEPu8mVp0e5bas/pub?output=csv`;
    try {
        const response = await fetch(DATA_URL);
        const data = await response.text();
        const rows = data.split('\n').slice(1);
        const container = document.getElementById('productContainer');
        container.innerHTML = '';
        productList = [];

        rows.forEach((row, index) => {
            const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 4 && cols[0] !== "") {
                const [name, img, qty, price] = cols;
                const priceNum = parseFloat(price);
                productList.push({ name, img, qty, price: priceNum, index });
                
                // create product card
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <img src="${img}" alt="${name}" onerror="this.src='https://placehold.co/200x200?text=Food'">
                    <div class="product-details">
                        <div class="p-name">${name}</div>
                        <span class="p-qty">${qty}</span>
                        <div class="p-rate">₹${priceNum}</div>
                    </div>
                    <div class="cart-controls">
                        <button class="decr" data-name="${name}" data-price="${priceNum}" data-idx="${index}">-</button>
                        <span id="q-${index}">0</span>
                        <button class="incr" data-name="${name}" data-price="${priceNum}" data-idx="${index}">+</button>
                    </div>
                `;
                container.appendChild(card);
            }
        });

        // attach event listeners dynamically after render
        document.querySelectorAll('.incr').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = btn.dataset.name;
                const price = parseFloat(btn.dataset.price);
                const idx = parseInt(btn.dataset.idx);
                updateCart(name, price, 1, idx);
            });
        });
        document.querySelectorAll('.decr').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const name = btn.dataset.name;
                const price = parseFloat(btn.dataset.price);
                const idx = parseInt(btn.dataset.idx);
                updateCart(name, price, -1, idx);
            });
        });
        
        document.getElementById('product-loader').style.display = 'none';
        getUserLocation();
    } catch (error) {
        console.error("Failed loading products", error);
        document.getElementById('product-loader').innerHTML = "⚠️ Couldn't load items. Refresh.";
    }
}

// ==================== DISTANCE (HAVERSINE) ====================
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
              Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
              Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// ==================== GET USER LOCATION & DELIVERY CHARGE ====================
function getUserLocation() {
    if (!navigator.geolocation) {
        document.getElementById('location-status').innerHTML = "❌ Geolocation not supported";
        return;
    }
    navigator.geolocation.getCurrentPosition(pos => {
        userCoords = pos.coords;
        const dist = calculateDistance(SHOP_LAT, SHOP_LON, userCoords.latitude, userCoords.longitude);
        const locationDiv = document.getElementById('location-status');
        
        if(dist > MAX_RADIUS) {
            locationDiv.innerHTML = `<i class="fas fa-ban"></i> Out of zone (${dist.toFixed(1)}km > 5km)`;
            document.getElementById('pay-btn').disabled = true;
            deliveryCharge = 0;
        } else {
            if(dist <= 1) deliveryCharge = 0;
            else if(dist <= 2) deliveryCharge = 0;
            else if(dist <= 3) deliveryCharge = 0;
            else if(dist <= 4) deliveryCharge = 0;
            else deliveryCharge = 0;
            
            locationDiv.innerHTML = `<i class="fas fa-check-circle"></i> Delivery available (${dist.toFixed(1)} km) · charge ₹${deliveryCharge}`;
            document.getElementById('pay-btn').disabled = false;
        }
        updateModalTotals();
        renderBottomBar();
    }, (err) => {
        document.getElementById('location-status').innerHTML = "⚠️ Allow location for delivery";
        document.getElementById('pay-btn').disabled = true;
    });
}

// ==================== CART UPDATES ====================
function updateCart(name, price, change, idx) {

    if(!cart[name]) cart[name] = { price, qty: 0 };

    const newQty = cart[name].qty + change;

    if(newQty <= 0) {
        delete cart[name];
    } else {
        cart[name].qty = newQty;
    }

    const qtySpan = document.getElementById(`q-${idx}`);

    if(qtySpan) {
        qtySpan.innerText = cart[name]?.qty || 0;
    }

    renderBottomBar();

    if(document.getElementById('checkout-modal').style.display === 'flex') {
        renderCartModal();
        updateModalTotals();
    }

    saveCartToStorage();
}

function renderBottomBar() {
    let total = 0, items = 0;
    for(let key in cart) {
        total += cart[key].price * cart[key].qty;
        items += cart[key].qty;
    }
    const bar = document.getElementById('bottom-cart-bar');
    bar.style.display = items > 0 ? 'flex' : 'none';
    document.getElementById('items-in-cart').innerText = `${items} Items`;
    document.getElementById('cart-total-price').innerHTML = `₹${total}`;
    document.getElementById('cart-count-top').innerText = items;
}

function renderCartModal() {

    const container = document.getElementById('cart-items-list');

    if(!container) return;

    if(Object.keys(cart).length === 0) {

        container.innerHTML = '<div class="empty-cart">🛒 Cart is empty</div>';

        return;
    }

    let html = '';

    for(let [name, item] of Object.entries(cart)) {

        html += `
            <div class="cart-item">

                <div>
                    <strong>${name}</strong><br>
                    <small>Qty: ${item.qty}</small>
                </div>

                <div style="display:flex;align-items:center;gap:10px;">

                    <span>₹${item.price * item.qty}</span>

                    <button 
                        onclick="removeCartItem('${name}')"
                        style="
                            background:#ef4444;
                            color:white;
                            border:none;
                            border-radius:50%;
                            width:28px;
                            height:28px;
                            cursor:pointer;
                            font-weight:bold;
                        "
                    >
                        ×
                    </button>

                </div>

            </div>
        `;
    }

    container.innerHTML = html;
}

function updateModalTotals() {
    let subtotal = 0;
    for(let key in cart) subtotal += cart[key].price * cart[key].qty;
    const final = subtotal + deliveryCharge;
    document.getElementById('modal-subtotal').innerText = `₹${subtotal}`;
    document.getElementById('modal-delivery').innerText = `₹${deliveryCharge}`;
    document.getElementById('modal-final-total').innerText = `₹${final}`;
    if(document.getElementById('final-total')) 
        document.getElementById('final-total').innerText = `₹${final}`;
}

// ==================== MODAL CONTROL ====================
function openCheckoutModal() {
    if(Object.keys(cart).length === 0) {
        showToast("Cart is empty! Add some items.");
        return;
    }
    renderCartModal();
    updateModalTotals();
    const modal = document.getElementById('checkout-modal');
    modal.style.display = 'flex';
    // re-evaluate location if needed
    if(!userCoords) getUserLocation();
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function showToast(msg, isError = false) {
    const toast = document.getElementById('toast-message');
    toast.style.backgroundColor = isError ? '#b91c1c' : '#1e7b48';
    toast.innerText = msg;
    toast.style.opacity = '1';
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

// ==================== PAYMENT (RAZORPAY SIMULATION) ====================
function handlePayment() {

    const custName =
    document.getElementById('cust-name').value.trim();

    const custPhone =
    document.getElementById('cust-phone').value.trim();

    const custAddress =
    document.getElementById('cust-address').value.trim();

    if(!custName || !custPhone) {

        showToast(
            "Please enter name and phone number",
            true
        );

        return;
    }

    if(document.getElementById('pay-btn').disabled) {

        showToast(
            "Location not available or out of zone",
            true
        );

        return;
    }

    if(Object.keys(cart).length === 0) {

        showToast("No items in cart", true);

        return;
    }

    let subtotal = 0;

    for(let key in cart) {

        subtotal +=
        cart[key].price * cart[key].qty;
    }

    const totalAmount =
    (subtotal + deliveryCharge) * 100;

    const options = {

        key: "rzp_live_SlFpkLaE2aao9D",

        amount: totalAmount,

        currency: "INR",

        name: "Axom KART",

        description: `Order by ${custName}`,

        handler: function(response) {

            // ================= SAVE ORDER =================

            let itemsArray = [];

            for(let [itemName, itemData]
            of Object.entries(cart)) {

                itemsArray.push({

                    name: itemName,

                    qty: itemData.qty,

                    price: itemData.price
                });
            }

            const orderData = {

                customerName: custName,

                phone: custPhone,

                address:
                custAddress || "Not provided",

                liveLocation: {

                    latitude:
                    userCoords.latitude,

                    longitude:
                    userCoords.longitude
                },

                googleMaps:
                `https://maps.google.com/?q=${userCoords.latitude},${userCoords.longitude}`,

                items: itemsArray,

                subtotal: subtotal,

                deliveryCharge: deliveryCharge,

                total:
                subtotal + deliveryCharge,

                paymentId:
                response.razorpay_payment_id,

                createdAt:
                new Date().toLocaleString()
            };

            // SAVE TO PHP
fetch(
"https://script.google.com/macros/s/AKfycbxwEdLEcYc9Eb6xvCVBWOiKAbyvpc0gHIkVGqICYvWzRx-4XvBEpsei9P5bBTiu_aUe/exec",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(orderData)

})
.then(res=>res.json())
.then(data=>{

console.log(
"Order Saved",
data
);

})
.catch(err=>{

console.log(err);

});

            // EMAIL

            sendOrderConfirmation(
    custName,
    custPhone,
    response.razorpay_payment_id,
    custAddress
);

            showToast(
                "🎉 Order placed successfully!"
            );

            // RESET CART

            cart = {};

            localStorage.removeItem(
                "axomkart_cart"
            );

            renderBottomBar();

            // RESET UI QUANTITY

            for(let i=0;
                i<productList.length;
                i++) {

                const span =
                document.getElementById(
                    `q-${i}`
                );

                if(span) {

                    span.innerText = '0';
                }
            }

            closeCheckoutModal();

            // CLEAR INPUTS

            document.getElementById(
                'cust-name'
            ).value = '';

            document.getElementById(
                'cust-phone'
            ).value = '';

            document.getElementById(
                'cust-address'
            ).value = '';
        },

        prefill: {

            name: custName,

            contact: custPhone
        },

        theme: {

            color: "#27ae60"
        }
    };

    const rzp = new Razorpay(options);

    rzp.open();
}
// ==================== EMAIL CONFIRMATION (EmailJS) ====================
function sendOrderConfirmation(
name,
phone,
paymentId,
custAddress
) {
    // Build order summary
    let productSummary = '';
    for(let [item, data] of Object.entries(cart)) {
        productSummary += `${item} x${data.qty} = ₹${data.price * data.qty}\n`;
    }
    let subtotal = 0;
    for(let key in cart) subtotal += cart[key].price * cart[key].qty;
    const grandTotal = subtotal + deliveryCharge;
    
    const templateParams = {
        to_name: name,
        customer_phone: phone,
        customer_address:
        custAddress || "Not provided",
        maps_link:
`https://maps.google.com/?q=${userCoords.latitude},${userCoords.longitude}`,
        order_summary: productSummary,
        delivery_charge: deliveryCharge,
        total_amount: grandTotal,
        payment_id: paymentId || "TEST_MODE",
        order_date: new Date().toLocaleString()
    };
    
    // Only send if keys are real (avoid console errors but not mandatory)
    if(EMAILJS_PUBLIC_KEY && EMAILJS_PUBLIC_KEY !== "YOUR_PUBLIC_KEY" && EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID) {
        emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams)
            .then(() => console.log("Email sent"))
            .catch(err => console.warn("Email failed, but order recorded", err));
    } else {
        console.log("EmailJS disabled - order confirmed locally", templateParams);
        showToast("Demo mode: order confirmed (no email sent)");
    }
}

// Helper to toggle cart page (alias: close modal if open)
function toggleCartPage() {
    const modal = document.getElementById('checkout-modal');
    if(modal.style.display === 'flex') closeCheckoutModal();
    else openCheckoutModal();
}

// START APP
fetchProducts();
restoreCartUI();
// ==================== CART STORAGE SYSTEM ====================

function saveCartToStorage() {

    const cartData = {
        cart: cart,
        savedAt: Date.now()
    };

    localStorage.setItem(
        "axomkart_cart",
        JSON.stringify(cartData)
    );
}

function loadCartFromStorage() {

    const saved = localStorage.getItem("axomkart_cart");

    if(!saved) return {};

    try {

        const parsed = JSON.parse(saved);

        // 30 minutes expiry
        const THIRTY_MIN = 30 * 60 * 1000;

        if(Date.now() - parsed.savedAt > THIRTY_MIN) {

            localStorage.removeItem("axomkart_cart");

            return {};
        }

        return parsed.cart || {};

    } catch(err) {

        return {};
    }
}

function restoreCartUI() {

    setTimeout(() => {

        productList.forEach((product, index) => {

            const qty = cart[product.name]?.qty || 0;

            const span = document.getElementById(`q-${index}`);

            if(span) {

                span.innerText = qty;
            }
        });

        renderBottomBar();

    }, 1000);
}
function removeCartItem(name) {

    delete cart[name];

    saveCartToStorage();

    renderCartModal();

    renderBottomBar();

    updateModalTotals();

    // reset product quantity UI
    productList.forEach((product, index) => {

        if(product.name === name) {

            const span = document.getElementById(`q-${index}`);

            if(span) {
                span.innerText = '0';
            }
        }
    });
}
const navBtns=document.querySelectorAll('.nav-btn'),
navInd=document.querySelector('.nav-indicator');

navBtns.forEach((btn,i)=>{

btn.addEventListener('click',()=>{

document.querySelector('.nav-btn.active')
?.classList.remove('active');

btn.classList.add('active');

navInd.style.left=`${i*33.33}%`;

});
});

let lastScroll=0;

window.addEventListener('scroll',()=>{

const nav=document.querySelector('.btm-nav'),
curr=window.pageYOffset;

if(curr>lastScroll && curr>80){

nav.style.transform='translateY(90px)';

}else{

nav.style.transform='translateY(0)';
}

lastScroll=curr;
});