////////////////////////////////////////////////

const STATE_FORM_PAY = "pay";
const STATE_FORM_PROCESSING = "processing";

////////////////////////////////////////////////

const STATUS_OK = "ok";
const STATUS_ERROR_FIELDS = "fields_in_error";
const STATUS_ERROR_TIMEOUT = "request_timeout";
const STATUS_ERROR_SYSTEM = "system_error";

////////////////////////////////////////////////

const ERROR_CODE_MERCHANTID = "T03";
const ERROR_CODE_TIMEOUT = "T04";
const ERROR_CODE_SYSTEM = "T05";
const ERROR_CODE_FAILURE = "T06";
const ERROR_CODE_CONNECTION = "T07";

const ERROR_MESSAGE_MERCHANTID = "MerchantID error: MerchantID not present";
const ERROR_MESSAGE_TIMEOUT = "Request timeout: %s";
const ERROR_MESSAGE_SYSTEM = "System error: %s";
const ERROR_MESSAGE_FAILURE = "Update failure: %s";
const ERROR_MESSAGE_CONNECTION = "Connection Error: Unable to connect";

////////////////////////////////////////////////

const errorModal = `
<div class="modal fade" id="errorModal" tabindex="-1" role="dialog" aria-labelledby="errorModalTitle" aria-hidden="true">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <div class="modal-header">
                <h5 id="errorModalTitle" class="modal-title">ERROR</h5>
                <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                </button>
            </div>
            <div id="errorModalBody" class="modal-body">
                <p>We're sorry, there has been an error, please pay at the restaurant or try again.</p>
                <p id="errorModalMessage" class="modal-message"></p>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-dismiss="modal">Close</button>
            </div>
        </div>
    </div>
</div>`;

function handleError(errorCode, errorMessage, redirect) {
    document.documentElement.insertAdjacentHTML("beforeend", errorModal);
    const codeMessage = formatErrorCode(errorCode);
    const modalElement = document.getElementById("errorModal");
    const modal = new Modal(modalElement);
    document.getElementById("errorModalMessage").innerHTML = codeMessage;

    modal.show();

    console.log(`${errorMessage} ${codeMessage}`);

    switch (redirect) {
        case "back":
            modalElement.addEventListener("hidden.bs.modal", function onHidden() {
                modalElement.removeEventListener("hidden.bs.modal", onHidden);
                window.history.back();
            });
            break;

        default:
            break;
    }
}

function formatErrorCode(code) {
    return `[${code}-${new Date().toISOString()}]`;
}