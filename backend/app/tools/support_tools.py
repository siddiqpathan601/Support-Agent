"""
Support Tools — mock implementations for Phase 1.

In production, these would call real APIs (CRM, billing, subscription systems).
Each tool returns a structured result dict that the resolution agent injects into its response.

Available tools:
  - reset_password
  - activate_subscription
  - generate_invoice
  - update_profile
  - check_order
  - verify_payment
  - cancel_subscription
  - process_refund
"""

from typing import Any, Dict


class ToolExecutionError(Exception):
    """Raised when a tool cannot be executed."""
    pass


# ── Tool implementations ──────────────────────────────────────────────────────

def reset_password(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Trigger a password reset email for the customer's account."""
    email = entities.get("email", entities.get("user_email", "customer@example.com"))
    return {
        "status": "success",
        "action": "password_reset_email_sent",
        "email": email,
        "message": f"A password reset link has been sent to {email}. It expires in 15 minutes.",
        "next_steps": ["Check your inbox (and spam folder)", "Click the reset link", "Set a new password"],
    }


def activate_subscription(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Activate or reactivate a customer subscription."""
    plan = entities.get("plan", "Pro")
    return {
        "status": "success",
        "action": "subscription_activated",
        "plan": plan,
        "message": f"Your {plan} subscription has been activated.",
        "billing_date": "next billing cycle",
        "features": ["Full access restored", "All features unlocked"],
    }


def generate_invoice(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Generate and send an invoice PDF to the customer."""
    invoice_id = entities.get("invoice_id", "INV-AUTO-001")
    return {
        "status": "success",
        "action": "invoice_generated",
        "invoice_id": invoice_id,
        "message": f"Invoice {invoice_id} has been generated and sent to your email.",
        "download_available": True,
    }


def update_profile(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Update customer profile fields."""
    fields = {k: v for k, v in entities.items() if k in ["name", "phone", "address", "email"]}
    if not fields:
        raise ToolExecutionError("No valid profile fields specified for update.")
    return {
        "status": "success",
        "action": "profile_updated",
        "updated_fields": list(fields.keys()),
        "message": "Your profile has been updated successfully.",
    }


def check_order(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Check order status."""
    order_id = entities.get("order_id", entities.get("order_number", "ORD-UNKNOWN"))
    return {
        "status": "success",
        "action": "order_status_retrieved",
        "order_id": order_id,
        "order_status": "In Transit",
        "estimated_delivery": "2-3 business days",
        "tracking_number": "TRK-DEMO-456",
        "message": f"Order {order_id} is currently in transit and should arrive within 2-3 business days.",
    }


def verify_payment(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Verify a payment transaction."""
    transaction_id = entities.get("transaction_id", entities.get("payment_id", "TXN-UNKNOWN"))
    return {
        "status": "success",
        "action": "payment_verified",
        "transaction_id": transaction_id,
        "payment_status": "Confirmed",
        "amount": entities.get("amount", "N/A"),
        "message": f"Payment {transaction_id} has been confirmed and processed successfully.",
    }


def cancel_subscription(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Cancel a customer's subscription."""
    plan = entities.get("plan", "current plan")
    return {
        "status": "success",
        "action": "subscription_cancelled",
        "plan": plan,
        "effective_date": "end of current billing period",
        "message": f"Your {plan} subscription has been cancelled. You'll retain access until the end of your current billing period.",
        "confirmation_id": "CANCEL-DEMO-789",
    }


def process_refund(entities: Dict[str, Any]) -> Dict[str, Any]:
    """Process a refund request."""
    amount = entities.get("amount", "full amount")
    order_id = entities.get("order_id", entities.get("transaction_id", "UNKNOWN"))
    return {
        "status": "success",
        "action": "refund_initiated",
        "order_id": order_id,
        "refund_amount": amount,
        "refund_timeline": "5-7 business days",
        "message": f"Your refund of {amount} has been initiated. You'll see it in your account within 5-7 business days.",
        "refund_id": "REF-DEMO-321",
    }


# ── Tool registry ─────────────────────────────────────────────────────────────

TOOLS = {
    "reset_password": reset_password,
    "activate_subscription": activate_subscription,
    "generate_invoice": generate_invoice,
    "update_profile": update_profile,
    "check_order": check_order,
    "verify_payment": verify_payment,
    "cancel_subscription": cancel_subscription,
    "process_refund": process_refund,
}


def execute_support_tool(tool_name: str, entities: Dict[str, Any]) -> Dict[str, Any]:
    """Execute a named support tool with given entity parameters."""
    tool_fn = TOOLS.get(tool_name)
    if not tool_fn:
        raise ToolExecutionError(f"Unknown tool: {tool_name}")
    return tool_fn(entities)


def list_tools() -> list:
    """Return list of available tool names."""
    return list(TOOLS.keys())
