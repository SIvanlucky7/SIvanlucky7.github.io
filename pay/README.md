# Payment QR images

Put your Alipay or WeChat Pay collection QR image here for manual payment mode.

Recommended filename:

```text
alipay.png
```

Example `.env`:

```env
DAISY_PAYMENT_PROVIDER=manual_qr
DAISY_ENABLE_MOCK_PAYMENT=0
DAISY_MANUAL_PAYMENT_QR_URL=/pay/alipay.png
DAISY_MANUAL_PAYMENT_ACCOUNT=支付宝收款码
DAISY_MANUAL_PAYMENT_INSTRUCTIONS=扫码支付对应金额，并在付款备注中填写支付单号。付款后提交交易号，等待后台核账入账。
```

Only use QR codes from accounts you are legally allowed to operate.
