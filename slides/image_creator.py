import os
from PIL import Image, ImageDraw, ImageFont
import config
import utils

def create_image_with_text(text_lines_from_input, output_filename, background_color_tuple, text_color_tuple):
    base_img_name = os.path.basename(output_filename)
    if not text_lines_from_input or not any(line.strip() for line in text_lines_from_input):
        return False

    img = Image.new('RGB', (config.IMAGE_WIDTH, config.IMAGE_HEIGHT), color=background_color_tuple)
    draw = ImageDraw.Draw(img)
    font = None
    try:
        font = ImageFont.truetype(config.FONT_NAME, config.DEFAULT_FONT_SIZE)
    except IOError:
        try:
            font = ImageFont.load_default()
        except Exception as e_pil:
            print(f"    CRITICAL (Font Load Error in create_image): Could not load default PIL font for {base_img_name}. Error: {e_pil}")
            return False
    except Exception as e_font:
        print(f"    UNEXPECTED FONT ERROR for {base_img_name} (create_image): {e_font}. Trying PIL default.")
        try:
            font = ImageFont.load_default()
        except Exception as e_pil_fallback:
            print(f"    CRITICAL (Font Load Error in create_image): Could not load default PIL font on fallback for {base_img_name}. Error: {e_pil_fallback}")
            return False
    if font is None:
        print(f"    CRITICAL (Font Load Error in create_image): Font is None for {base_img_name}.")
        return False

    content_area_x_start = config.IMAGE_WIDTH * config.LEFT_MARGIN_PERCENT
    content_area_y_start = config.IMAGE_HEIGHT * config.TOP_MARGIN_PERCENT
    content_area_width = config.IMAGE_WIDTH * (1 - config.LEFT_MARGIN_PERCENT - config.RIGHT_MARGIN_PERCENT)
    content_area_height = config.IMAGE_HEIGHT * (1 - config.TOP_MARGIN_PERCENT - config.BOTTOM_MARGIN_PERCENT)

    if content_area_width <= 0 or content_area_height <= 0:
        print(f"  CRITICAL ({base_img_name}): Margins are too large resulting in zero/negative content area. Check ..._MARGIN_PERCENT values.")
        return False

    processed_wrapped_lines = []
    for original_line_segment in text_lines_from_input:
        wrapped_segment = utils.wrap_text_pil(draw, original_line_segment, font, content_area_width)
        processed_wrapped_lines.append(wrapped_segment)
    full_text = "\n".join(l for l in processed_wrapped_lines if l)

    if not full_text.strip():
        print(f"  Warning ({base_img_name}): Text content became empty after processing/wrapping. Skipping image save.")
        return False

    try:
        if hasattr(draw, 'textbbox'):
            text_bbox_at_origin = draw.textbbox(xy=(0,0), text=full_text, font=font, spacing=config.LINE_SPACING, align=config.TEXT_ALIGN)
        else:
            total_h = 0; max_w = 0; lines = full_text.split('\n')
            for idx, line in enumerate(lines):
                lw, lh = draw.textsize(line, font=font); max_w = max(max_w, lw); total_h += lh
                if idx < len(lines) -1: total_h += config.LINE_SPACING
            text_bbox_at_origin = (0, 0, max_w, total_h)
    except Exception as e_bbox:
        print(f"  Error ({base_img_name}): Exception during text bounding box calculation: {e_bbox}. Positioning may be approximate.")
        text_bbox_at_origin = (0, 0, content_area_width * 0.9, content_area_height * 0.9)

    text_block_actual_width = text_bbox_at_origin[2] - text_bbox_at_origin[0]
    text_block_actual_height = text_bbox_at_origin[3] - text_bbox_at_origin[1]

    if text_block_actual_width > content_area_width * 1.01:
        print(f"  Warning ({base_img_name}): Calculated text block width ({text_block_actual_width:.0f}px) "
              f"exceeds content area width ({content_area_width:.0f}px). Could be a long unbreakable word.")
    if text_block_actual_height > content_area_height:
        print(f"  Warning ({base_img_name}): Calculated text block height ({text_block_actual_height:.0f}px) "
              f"exceeds content area height ({content_area_height:.0f}px). Text may be clipped vertically.")

    text_x_in_content_area = (content_area_width - text_block_actual_width) / 2
    text_y_in_content_area = (content_area_height - text_block_actual_height) / 2
    final_draw_x = content_area_x_start + text_x_in_content_area - text_bbox_at_origin[0]
    final_draw_y = content_area_y_start + text_y_in_content_area - text_bbox_at_origin[1]

    draw.multiline_text((final_draw_x, final_draw_y), full_text, fill=text_color_tuple, font=font, align=config.TEXT_ALIGN, spacing=config.LINE_SPACING)
    try:
        img.save(output_filename)
        return True
    except Exception as e_save:
        print(f"  Error ({base_img_name}): Failed to save image {output_filename}: {e_save}")
        return False