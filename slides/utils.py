import re
# PIL.ImageDraw is not directly used here, but wrap_text_pil expects a draw_context
# which is an ImageDraw.Draw object. Font objects are also used.

def sanitize_filename(name_str, default_name="untitled_set", max_len=100):
    if not name_str or not name_str.strip():
        base_name = default_name
    else:
        first_line = name_str.split('\n')[0].strip()
        if not first_line:
            base_name = default_name
        else:
            base_name = first_line

    # Remove characters that are typically illegal in filenames across OSes, and control characters.
    # This allows most other characters, including emojis.
    s = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '', base_name)
    s = re.sub(r'[-\s]+', '_', s) # Consolidate hyphens and whitespace to single underscore
    s = s.strip('_')
    s = s[:max_len]
    s = s.strip('_')
    if not s:
        s = default_name.replace(" ", "_")
    return s


def wrap_text_pil(draw_context, text, font, max_line_pixel_width):
    if not text.strip():
        return ""
    words = text.split(' ')
    lines = []
    current_line = ""
    for word in words:
        try:
            if hasattr(draw_context, 'textbbox'):
                # The xy=(0,0) is important for textbbox to get relative coordinates
                word_bbox = draw_context.textbbox((0,0), word, font=font)
                word_width = word_bbox[2] - word_bbox[0]
            else:
                # Fallback for older Pillow versions
                word_width, _ = draw_context.textsize(word, font=font)
        except Exception:
            # A very rough fallback if text measurement fails
            word_width = len(word) * (getattr(font, 'size', 10) * 0.6) # Estimate based on font size

        # If the word itself is wider than the max width, and we already have content on the current line,
        # first append the current line.
        if word_width > max_line_pixel_width and max_line_pixel_width > 0 and current_line:
            lines.append(current_line.strip())
            current_line = "" # Reset current line

        # If the word itself is wider than the max width (even if current_line was empty or just reset)
        if word_width > max_line_pixel_width and max_line_pixel_width > 0 :
            if current_line: # This case should ideally not be hit if previous block handled it
                 lines.append(current_line.strip())
            lines.append(word) # Add the long word as its own line
            print(f"    WARNING (wrap_text_pil): Single word '{word[:30]}...' (width: {word_width:.0f}px) "
                  f"is wider than max line width ({max_line_pixel_width:.0f}px). It will overflow.")
            current_line = "" # Reset current line as the word forms its own line
            continue # Move to the next word

        # Test adding the current word to the current line
        test_line_content = current_line + (" " if current_line else "") + word
        try:
            if hasattr(draw_context, 'textbbox'):
                test_line_bbox = draw_context.textbbox((0,0), test_line_content.strip(), font=font)
                test_line_width = test_line_bbox[2] - test_line_bbox[0]
            else:
                test_line_width, _ = draw_context.textsize(test_line_content.strip(), font=font)
        except Exception:
             test_line_width = len(test_line_content.strip()) * (getattr(font, 'size', 10) * 0.6)


        if test_line_width <= max_line_pixel_width or not current_line: # If it fits, or if current_line is empty
            current_line = test_line_content
        else:
            # Word doesn't fit, so finalize current_line and start new line with word
            lines.append(current_line.strip())
            current_line = word
            
    if current_line.strip(): # Add any remaining text in current_line
        lines.append(current_line.strip())
        
    return "\n".join(lines)