# ==============================================================================
# --- User-Editable Sizing & Layout Configuration ---
# ==============================================================================

# --- Image Dimensions ---
IMAGE_WIDTH = 2000  # Overall width of the generated image in pixels
IMAGE_HEIGHT = 2000 # Overall height of the generated image in pixels

# --- Font Settings ---
# <<< --- !!! VERY IMPORTANT: SET THIS TO A VALID FONT PATH ON YOUR SYSTEM !!! --- >>>
# Examples:
# macOS: FONT_NAME = "/System/Library/Fonts/Supplemental/Arial.ttf"
# Linux: FONT_NAME = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
# Windows: FONT_NAME = "C:/Windows/Fonts/arial.ttf"
FONT_NAME = "/System/Library/Fonts/Supplemental/Arial Bold Italic.ttf" # <<< --- CHANGE THIS TO YOUR FONT --- >>>

DEFAULT_FONT_SIZE = 120  # <<< --- THIS IS THE ABSOLUTELY FIXED FONT SIZE --- >>>
                        # It will NOT change based on text length.

# --- Text Layout within Margins ---
LINE_SPACING = 15       # Extra vertical pixels between lines of multiline text
TEXT_ALIGN = "center"   # Alignment for multiline text ("left", "center", "right")

# --- Margins (as a percentage of image dimensions) ---
TOP_MARGIN_PERCENT = 0.10
BOTTOM_MARGIN_PERCENT = 0.10
LEFT_MARGIN_PERCENT = 0.10
RIGHT_MARGIN_PERCENT = 0.10

# ==============================================================================
# --- End User-Editable Sizing & Layout Configuration ---
# ==============================================================================

DEFAULT_BACKGROUND_COLOR = (77, 100, 255) # This is a default blue
TEXT_COLOR = (255, 255, 255)