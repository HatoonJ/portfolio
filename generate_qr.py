import qrcode
from PIL import Image, ImageDraw, ImageFont

# Data to encode
url = "https://hatoonj.github.io/portfolio/"

# Dark mode colors from your CSS
fill_color = "#4e73df"  # primary color
back_color = "#1a1d24"  # dark mode background
text_color = "#e0e3eb"  # dark mode text

# Generate QR code with dark mode colors
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20,  # higher quality
    border=4,
)
qr.add_data(url)
qr.make(fit=True)
qr.add_data(url)
import qrcode
from PIL import Image, ImageDraw, ImageFont

# Data to encode
url = "https://hatoonj.github.io/portfolio/"

# Generate original QR code (black on white)
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=10,
    border=4,
)
qr.add_data(url)
qr.make(fit=True)

img = qr.make_image(fill_color="black", back_color="white").convert('RGB')
# Upscale for even higher quality
img = img.resize((img.width * 2, img.height * 2), Image.LANCZOS)

# Add 'HatoonJ' at the bottom right, above the margin (where the red line is)
draw = ImageDraw.Draw(img)
text = "HatoonJ"
font_size = 32  # small but visible at high res
text_color = "black"
try:
    font = ImageFont.truetype("arial.ttf", font_size)
except Exception:
    font = ImageFont.load_default()
# Use textbbox for accurate text size (Pillow >=8.0.0)
try:
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
except Exception:
    text_width, text_height = font.getsize(text)
# Place the text just above the bottom border, right-aligned, with a small margin
letter_width = int(font_size * 0.6)
padding_right = 180 - (3 * letter_width)  # adjust for upscale and position
if padding_right < 0:
    padding_right = 0
padding_bottom = 36  # upscale margin
pos = (img.width - text_width - padding_right, img.height - text_height - padding_bottom)
draw.text(pos, text, font=font, fill=text_color)

# Save the image
img.save("img/portfolio_qr.png")
print("QR code with 'HatoonJ' saved as img/portfolio_qr.png")
