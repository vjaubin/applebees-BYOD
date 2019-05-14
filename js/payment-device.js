////////////////////////////////////////////////
//#region Dev Init
const DEV_MERCHANT_ID = "TESTDINBRANDS01";
const DEV_RESTAURANT_ID = 9977;
const DEV_RESTAURANT_NAME = "Applebee's Glendale";
const DEV_TAX = 10;
const DEV_TIP = 5;
const DEV_DISCOUNT = -5;
const DEV_SUBTOTAL = 50;
const DEV_TOTAL = 60;

const DEV_APPLE_PAY_VALIDATE_MERCHANT_ENDPOINT = "https://lwj9w94dx0.execute-api.us-east-1.amazonaws.com/dev/v1/session/applepay"
//#endregion Dev Init
////////////////////////////////////////////////
//#region Constants
const STRINGS = {
    SUBTOTAL: "Subtotal",
    TAX: "Tax",
    TIP: "Tip",
    DISCOUNT: "Discount",
}
//#endregion Constants
////////////////////////////////////////////////
//#region Configuration
const merchantID = DEV_MERCHANT_ID;
const restaurantID = DEV_RESTAURANT_ID;
const restaurantName = DEV_RESTAURANT_NAME;
const orderSubtotal = DEV_SUBTOTAL;
const orderTax = DEV_TAX;
const orderTip = DEV_TIP;
const orderDiscount = DEV_DISCOUNT;
const orderTotal = DEV_TOTAL;

const applePayValidateMerchantEndPoint = DEV_APPLE_PAY_VALIDATE_MERCHANT_ENDPOINT;
//#endregion Configuration
////////////////////////////////////////////////
//#region Initialization
if (document.readyState !== "loading") {
    init();
} else if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function domLoaded() {
        document.removeEventListener("DOMContentLoaded", domLoaded);
        init();
    });
}

function init() {
    const creditCardButton = document.getElementById("creditCardButton");
    creditCardButton.addEventListener("click", () => {
        location.href = `payment-credit.html?merchantID=${merchantID}`;
    });
}
//#endregion Initialization
////////////////////////////////////////////////
//#region Device Pay setup
try {
    if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
        const applePayMerchantID = `merchant.${merchantID}`;
        ApplePaySession.canMakePaymentsWithActiveCard(applePayMerchantID).then((canMakePayments) => {
            if (canMakePayments) {
                const applePayButton = document.createElement("div");
                applePayButton.classList.add("apple-pay-button", "apple-pay-button-black", "payment-button");
                applePayButton.setAttribute("id", "applePayButton");
                applePayButton.addEventListener("click", onApplePayButtonClicked);
                document.getElementById("devicePayButton").appendChild(applePayButton);
            }
        });
    } else {
        (() => {
            const sc = document.getElementsByTagName("script")[0];
            const ds = document.createElement("script"); ds.type = "text/javascript"; ds.async = true;
            ds.src = "https://pay.google.com/gp/p/js/pay.js";
            ds.addEventListener("load", onGooglePayLoaded);
            sc.parentNode.insertBefore(ds, sc);
        })();
    }    
} catch (error) {
    console.log(error);
}

//#endregion Device Pay setup
////////////////////////////////////////////////
//#region Apple Pay
const APPLE_PAY_VERSION = 3;
const baseApplePayRequest = {
    "countryCode": "US",
    "currencyCode": "USD",
    "merchantCapabilities": [
        "supports3DS",
        "supportsDebit",
        "supportsCredit"
    ],
    "supportedNetworks": [
        "visa",
        "masterCard",
        "amex",
        "discover"
    ],
    "requiredBillingContactFields": [
        "postalAddress",
        "name",
        "email",
        "phone",
    ]
};

function createApplePayRequest() {
    if (typeof orderSubtotal === "undefined" || typeof orderTax === "undefined" || typeof orderTotal === "undefined") {
        console.error("Subtotal, Tax, & Total are required.");
        return false;
    }

    const lineItems = [
        { label: STRINGS.SUBTOTAL, "amount": orderSubtotal },
        { label: STRINGS.TAX, "amount": orderTax },        
    ];

    if (typeof orderTip !== "undefined" && orderTip !== null && orderTip > 0) {
        lineItems.push({ label: STRINGS.TIP, "amount": orderTip });
    }

    if (typeof orderDiscount !== "undefined" && orderDiscount !== null && orderDiscount < 0) {
        lineItems.push({ label: STRINGS.DISCOUNT, "amount": orderDiscount });
    }

    return Object.assign( {
        lineItems,
        total: {
            label: restaurantName,
            amount: orderTotal,
            type: "final"
        }
    }, baseApplePayRequest );
}

function onApplePayButtonClicked() {
    const applePayRequest = createApplePayRequest();
    if (!applePayRequest) { return; }
    
    const applePaySession = new ApplePaySession(APPLE_PAY_VERSION, applePayRequest);
    const applePayMerchantID = `merchant.${merchantID}`;

    const applePayButton = document.getElementById("applePayButton");
    applePayButton.removeEventListener("click", onApplePayButtonClicked);

    applePaySession.onvalidatemerchant = (event) => {
        console.log(event);
        const applePayData = {
            restaurantID,
            merchantID: applePayMerchantID,
            displayName: applePayRequest.total.label,
            validationURL: event.validationURL,
        };
        
        const xhr = new XMLHttpRequest();
        xhr.open("POST", applePayValidateMerchantEndPoint);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json");
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const applePaySessionData = JSON.parse(xhr.responseText);
                    applePaySession.completeMerchantValidation(applePaySessionData);                    
                } catch (error) {
                    console.log(error);
                }
            } else {
                console.log('error', xhr);
            }
        };

        xhr.send(JSON.stringify(applePayData));
    };

    applePaySession.onpaymentmethodselected = (event) => {
        console.log(event);
        const update = {
            newTotal: applePayRequest["total"],
            newLineItems: applePayRequest["lineItems"]
        };
        applePaySession.completePaymentMethodSelection(update);
    };

    applePaySession.onpaymentauthorized = (event) => {
        console.log(event);
        const { payment: { billingContact, token } } = event;
        const update = { status: ApplePaySession.STATUS_SUCCESS };
        applePaySession.completePayment(update);

        console.log(billingContact, token);
    };

    applePaySession.oncancel = (event) => {
        console.log(event);
        applePayButton.addEventListener("click", onApplePayButtonClicked);
    };

    applePaySession.begin();
}
//#endregion Apple Pay
////////////////////////////////////////////////
//#region Google Pay
const baseGooglePayRequest = { apiVersion: 2, apiVersionMinor: 0 };
const tokenizationSpecification = {
    type: "PAYMENT_GATEWAY",
    parameters: {
        "gateway": "mpgs",
        "gatewayMerchantId": merchantID,
    }
};

const baseCardPaymentMethod = {
    type: "CARD",
    parameters: {
        allowedAuthMethods: ["PAN_ONLY"],
        allowedCardNetworks: ["AMEX", "DISCOVER", "MASTERCARD", "VISA"],
    }
};
const cardPaymentMethod = Object.assign( { tokenizationSpecification }, baseCardPaymentMethod);

let googlePaymentsClient;
function onGooglePayLoaded() {
    googlePaymentsClient = new google.payments.api.PaymentsClient( { environment: "TEST" } );
    googlePaymentsClient.isReadyToPay(Object.assign({ existingPaymentMethodRequired: true }, baseGooglePayRequest, { allowedPaymentMethods: [ baseCardPaymentMethod ] } ) )
    .then((response) => {
        const { result, paymentMethodPresent } = response;
        if (result && paymentMethodPresent) {
            const googlePayButton = googlePaymentsClient.createButton( { buttonColor: "black", buttonType: "short", onClick: onGooglePayButtonClicked } );
            googlePayButton.getElementsByTagName("button")[0].classList.add("payment-button");
            document.getElementById("devicePayButton").appendChild(googlePayButton);
            // @todo prefetch payment data to improve performance after confirming site functionality
            // prefetchGooglePaymentData();
        }
    })
    .catch((error) => {
        console.error(error);
    });
}

function createGooglePayRequest() {
    if (typeof orderSubtotal === "undefined" || typeof orderTax === "undefined" || typeof orderTotal === "undefined") {
        console.error("Subtotal, Tax, & Total are required.");
        return false;
    }

    const merchantInfo = { "merchantName": restaurantName };
    const transactionInfo = {
        "currencyCode": "USD",
        "checkoutOption": "COMPLETE_IMMEDIATE_PURCHASE",
        "totalPriceStatus": "FINAL",
        "totalPrice": orderTotal.toString(),
    }

    return Object.assign(
        {}, 
        baseGooglePayRequest,
        {
            merchantInfo,
            transactionInfo,
        },
        { allowedPaymentMethods: [ cardPaymentMethod ] });
}

function onGooglePayButtonClicked() {
    console.log("Google Pay clicked");
    const googlePayRequest = createGooglePayRequest();
    if (!googlePayRequest) { return; }
    
    googlePaymentsClient.loadPaymentData(googlePayRequest)
    .then((paymentData) => {
        console.log(paymentData);
    })
    .catch((error) => {
        console.error(error);
    });
}
//#endregion Google Pay
////////////////////////////////////////////////