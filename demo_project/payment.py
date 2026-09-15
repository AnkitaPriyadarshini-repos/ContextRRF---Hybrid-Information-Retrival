"""
Payment processing and credit card transaction gateway client module.
Handles payment authorization, transaction recording, and refund processing.
"""

import hashlib
import time
from typing import Dict, Any, Optional

PAYMENT_GATEWAY_URL = "https://api.paymentgateway.demo/v1"
DEFAULT_CURRENCY = "USD"


def validate_card_number(card_number: str) -> bool:
    """Validate credit card number using Luhn checksum algorithm."""
    digits = [int(d) for d in card_number if d.isdigit()]
    if not digits or len(digits) < 13 or len(digits) > 19:
        return False
    
    checksum = 0
    reverse_digits = digits[::-1]
    for i, digit in enumerate(reverse_digits):
        if i % 2 == 1:
            doubled = digit * 2
            checksum += doubled - 9 if doubled > 9 else doubled
        else:
            checksum += digit
    return checksum % 10 == 0


def process_payment(user_id: str, amount: float, card_number: str, currency: str = DEFAULT_CURRENCY) -> Dict[str, Any]:
    """Process payment transaction via payment gateway."""
    if not validate_card_number(card_number):
        return {"status": "failed", "error": "Invalid card number", "code": 400}
    
    tx_timestamp = int(time.time())
    raw_id = f"{user_id}:{amount}:{tx_timestamp}"
    transaction_id = f"tx_{hashlib.sha256(raw_id.encode('utf-8')).hexdigest()[:12]}"
    
    return {
        "status": "success",
        "transaction_id": transaction_id,
        "amount": amount,
        "currency": currency,
        "timestamp": tx_timestamp,
    }


def issue_refund(transaction_id: str, reason: str = "customer_request") -> Dict[str, Any]:
    """Issue refund for a previously completed transaction."""
    refund_timestamp = int(time.time())
    refund_id = f"rf_{hashlib.sha256(transaction_id.encode('utf-8')).hexdigest()[:10]}"
    return {
        "status": "refunded",
        "refund_id": refund_id,
        "original_transaction_id": transaction_id,
        "reason": reason,
        "timestamp": refund_timestamp,
    }
