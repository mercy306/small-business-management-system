"""Invoice number generator."""
import random
import string
from datetime import datetime


def generate_invoice_number(prefix: str = "INV") -> str:
    date_part = datetime.now().strftime("%Y%m%d")
    rand_part = "".join(random.choices(string.digits, k=5))
    return f"{prefix}-{date_part}-{rand_part}"
