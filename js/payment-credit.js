////////////////////////////////////////////////
//#region Initialization
let cardNumberHasChanged = false;
let cardCSCHasChanged = false;
let isFormSubmitted = false;

(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const merchantID = urlParams.get("merchantID");

    if (!merchantID) {
        handleError(ERROR_CODE_MERCHANTID, ERROR_MESSAGE_MERCHANTID, "back");
    } else {
        const sc = document.getElementsByTagName("script")[0];
        const ds = document.createElement("script"); ds.type = "text/javascript"; ds.async = true;
        ds.src = `https://cnp.merchantlink.com/form/version/51/merchant/${merchantID}/session.js?debug=true`;
        ds.addEventListener("load", configurePaymentSession);
        ds.addEventListener("error", () => { handleError(ERROR_CODE_CONNECTION, ERROR_MESSAGE_CONNECTION) });
        sc.parentNode.insertBefore(ds, sc);                    
    }
})();

if (document.readyState !== "loading") {
    init();
} else if (document.addEventListener) {
    document.addEventListener("DOMContentLoaded", function domLoaded() {
        document.removeEventListener("DOMContentLoaded", domLoaded);
        init();
    });
}

function init() {
    const form = document.getElementById("form");
    form.addEventListener("input", onFormInput);
    form.addEventListener("submit", onFormSubmit);

    const phoneInput = document.getElementById("phoneNumber");
    phoneInput.addEventListener("input", (event) => {
        const phoneValue = phoneInput.value.replace(/[^\d]/g, "").trim();
        const phoneMatch = phoneValue.match(/^(1|)?(\d{3})(\d{3})(\d{4})$/);
        if (phoneMatch) {
            phoneInput.value = `${(phoneMatch[1]) ? "1 " : ""}(${phoneMatch[2]}) ${phoneMatch[3]}-${phoneMatch[4]}`;
        }
    });
};
//#endregion Initialization
////////////////////////////////////////////////
//#region Form
function onFormInput(event) {
    event.preventDefault();
    event.stopPropagation();

    checkFormInput(event);
}

function onFormSubmit(event) {
    event.preventDefault();
    event.stopPropagation();

    setFormState(STATE_FORM_PROCESSING);

    PaymentSession.updateSessionFromForm("card");
}

function checkFormInput(event) {
    const target = event.target || event.srcElement;

    if (target && target.attributes["maxlength"]) {
        const maxLength = parseInt(target.attributes["maxlength"].value, 10);
        const inputLength = target.value.length;

        if (inputLength >= maxLength) {
            let next = target;
            while (next = next.nextElementSibling) {
                if (next == null) {
                    break;
                }

                if (next.tagName.toLowerCase() === "input") {
                    next.focus();
                    break;
                }
            }
        } else if ((event.keyCode === 8 || event.keyCode === 46) && inputLength === 0) {
            let previous = target;
            while (previous = previous.previousElementSibling) {
                if (previous == null) {
                    break;
                }
                    
                if (previous.tagName.toLowerCase() === "input") {
                    previous.focus();
                    break;
                }
            }
        }
    }

    checkFormValidity();
}

function checkFormValidity() {
    const form = document.getElementById("form");
    const button = document.getElementById("button");

    button.disabled = !(form.checkValidity() && cardNumberHasChanged && cardCSCHasChanged && !isFormSubmitted);
}

function setFormState(state) {
    const form = document.getElementById("form");
    const button = document.getElementById("button");
    switch (state) {
        case STATE_FORM_PAY:
            form.removeEventListener("input", onFormInput);
            form.addEventListener("input", onFormInput);
            button.innerHTML = "Pay Check";
            button.disabled = false;
            isFormSubmitted = false;
            break;

        case STATE_FORM_PROCESSING:
            form.removeEventListener("input", onFormInput);
            button.innerHTML = "<span class=\"spinner-border\"></span>Processing";
            button.disabled = true;
            isFormSubmitted = true;
            break;
    }
}
//#endregion Form
////////////////////////////////////////////////
//#region Merchantlink
function configurePaymentSession() {
    PaymentSession.configure({
        fields: {
            card: {
                number: "#cardNumber",
                securityCode: "#cardCSC",
                expiryMonth: "#cardExpirationMonth",
                expiryYear: "#cardExpirationYear",
            }
        },
        frameEmbeddingMitigation: ["javascript"],
        callbacks: {
            initialized: (response) => {
                console.log(response);
                if (response.status) {
                    switch (response.status) {
                        case STATUS_OK:
                            const hostedFields = ["card.number", "card.securityCode"];
                            PaymentSession.onChange(hostedFields, onHostedFieldChange);
                            PaymentSession.onBlur(hostedFields, onHostedFieldChange);
                            break;

                        case STATUS_ERROR_SYSTEM:
                            handleError(ERROR_CODE_SYSTEM, ERROR_MESSAGE_SYSTEM.replace("%s", response.message));
                            break;
                    }
                } else {
                    handleError(ERROR_CODE_FAILURE, ERROR_MESSAGE_FAILURE.replace("%s", JSON.stringify(response)));
                }
            },
            formSessionUpdate: (response) => {
                const cardNumber = document.getElementById("cardNumber");
                const cardExpirationMonth = document.getElementById("cardExpirationMonth");
                const cardExpirationYear = document.getElementById("cardExpirationYear");
                const cardCSC = document.getElementById("cardCSC");

                cardNumber.classList.remove("is-invalid");
                cardExpirationMonth.classList.remove("is-invalid");
                cardExpirationYear.classList.remove("is-invalid");
                cardCSC.classList.remove("is-invalid");

                if (response.status) {
                    switch (response.status) {
                        case STATUS_OK:
                            if (!response.sourceOfFunds.provided.card.securityCode) {
                                cardCSC.classList.add("is-invalid");
                                setFormState(STATE_FORM_PAY);

                                return;
                            }

                            onUpdateSession(response.session);
                            break;

                        case STATUS_ERROR_FIELDS:
                            if (response.errors.cardNumber) {
                                cardNumber.classList.add("is-invalid");
                            }

                            if (response.errors.securityCode) {
                                cardCSC.classList.add("is-invalid");
                            }

                            if (response.errors.expiryMonth || cardExpirationMonth.value.trim() == "") {
                                cardExpirationMonth.classList.add("is-invalid");
                            }

                            if (response.errors.expiryYear || cardExpirationYear.value.trim() == "") {
                                cardExpirationYear.classList.add("is-invalid");
                            }

                            setFormState(STATE_FORM_PAY);
                            break;

                        case STATUS_ERROR_TIMEOUT:
                            handleError(ERROR_CODE_TIMEOUT, ERROR_MESSAGE_TIMEOUT.replace("%s", response.errors.message));
                            break;

                        case STATUS_ERROR_SYSTEM:
                            handleError(ERROR_CODE_SYSTEM, ERROR_MESSAGE_SYSTEM.replace("%s", response.errors.message));
                            break;
                    }
                } else {
                    handleError(ERROR_CODE_FAILURE, ERROR_MESSAGE_FAILURE.replace("%s", JSON.stringify(response)));
                }
            }
        },
        interaction: {
            displayControl: {
                formatCard: "EMBOSSED",
                invalidFieldCharacters: "REJECT"
            }
        }
    });
}

function onHostedFieldChange(selector) {
    switch (selector) {
        case "#cardNumber":
            cardNumberHasChanged = true;
            break;

        case "#cardCSC":
            cardCSCHasChanged = true;
            break;
    }

    checkFormValidity();
}

function onUpdateSession(session) {
    const form = document.getElementById("form");
    const excludeFields = ["cardNumber", "cardCSC", "cardExpirationYear", "cardExpirationMonth"];
    const formValues = [...form.elements].reduce((data, element) => {
        switch (element.type) {
            case "submit":
                //
                break;

            case "checkbox":
                data[element.id] = element.checked;
                break;

            case "tel":
                const value = element.value.replace(/[^\d]/g, "").trim();
                if (value !== "" && excludeFields.indexOf(element.id) === -1) {
                    data[element.id] = value;
                }
                break;

            default:
                if (element.value !== "" && excludeFields.indexOf(element.id) === -1) {
                    data[element.id] = element.value;
                }
                break;
        }
        
        return data;
    }, {});

    console.log(session.id);
    console.log(formValues);
}
//#endregion Merchantlink
////////////////////////////////////////////////