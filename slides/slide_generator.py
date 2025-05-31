from PIL import Image, ImageDraw, ImageFont
import argparse
import sys
import os
import shutil
import re

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


def sanitize_filename(name_str, default_name="untitled_set", max_len=50):
    if not name_str or not name_str.strip():
        base_name = default_name
    else:
        first_line = name_str.split('\n')[0].strip()
        if not first_line:
            base_name = default_name
        else:
            base_name = first_line

    s = re.sub(r'[^\w\s-]', '', base_name)
    s = re.sub(r'[-\s]+', '_', s)
    s = s.strip('_')
    s = s[:max_len]
    s = s.strip('_')
    if not s:
        s = default_name.replace(" ", "_")
    return f"{s}_slides"


def wrap_text_pil(draw_context, text, font, max_line_pixel_width):
    if not text.strip():
        return ""
    words = text.split(' ')
    lines = []
    current_line = ""
    for word in words:
        try:
            if hasattr(draw_context, 'textbbox'):
                word_bbox = draw_context.textbbox((0,0), word, font=font)
                word_width = word_bbox[2] - word_bbox[0]
            else:
                word_width, _ = draw_context.textsize(word, font=font)
        except Exception:
            word_width = len(word) * (getattr(font, 'size', 10) * 0.6)

        if word_width > max_line_pixel_width and max_line_pixel_width > 0 and current_line:
            lines.append(current_line.strip())
            current_line = ""

        if word_width > max_line_pixel_width and max_line_pixel_width > 0 :
            if current_line:
                 lines.append(current_line.strip())
            lines.append(word)
            print(f"    WARNING (wrap_text_pil): Single word '{word[:30]}...' (width: {word_width:.0f}px) "
                  f"is wider than max line width ({max_line_pixel_width:.0f}px). It will overflow.")
            current_line = ""
            continue

        test_line_content = current_line + (" " if current_line else "") + word
        try:
            if hasattr(draw_context, 'textbbox'):
                test_line_bbox = draw_context.textbbox((0,0), test_line_content.strip(), font=font)
                test_line_width = test_line_bbox[2] - test_line_bbox[0]
            else:
                test_line_width, _ = draw_context.textsize(test_line_content.strip(), font=font)
        except Exception:
             test_line_width = len(test_line_content.strip()) * (getattr(font, 'size', 10) * 0.6)

        if test_line_width <= max_line_pixel_width or not current_line:
            current_line = test_line_content
        else:
            lines.append(current_line.strip())
            current_line = word
    if current_line.strip():
        lines.append(current_line.strip())
    return "\n".join(lines)


def create_image_with_text(text_lines_from_input, output_filename, background_color_tuple):
    base_img_name = os.path.basename(output_filename)
    if not text_lines_from_input or not any(line.strip() for line in text_lines_from_input):
        # This case should ideally be caught before calling this function for empty slides
        # print(f"  Warning ({base_img_name}): No actual text content provided for image generation. Skipping image save.")
        return False

    img = Image.new('RGB', (IMAGE_WIDTH, IMAGE_HEIGHT), color=background_color_tuple)
    draw = ImageDraw.Draw(img)
    font = None
    try:
        font = ImageFont.truetype(FONT_NAME, DEFAULT_FONT_SIZE)
    except IOError:
        # This warning will be printed once in main() if primary font fails
        try:
            font = ImageFont.load_default()
        except Exception as e_pil:
            print(f"    CRITICAL (Font Load Error in create_image): Could not load default PIL font for {base_img_name}. Error: {e_pil}")
            return False
    except Exception as e_font: # Other font loading errors
        print(f"    UNEXPECTED FONT ERROR for {base_img_name} (create_image): {e_font}. Trying PIL default.")
        try:
            font = ImageFont.load_default()
        except Exception as e_pil_fallback:
            print(f"    CRITICAL (Font Load Error in create_image): Could not load default PIL font on fallback for {base_img_name}. Error: {e_pil_fallback}")
            return False
    if font is None: # Should be caught by above, but as a safeguard
        print(f"    CRITICAL (Font Load Error in create_image): Font is None for {base_img_name}.")
        return False

    content_area_x_start = IMAGE_WIDTH * LEFT_MARGIN_PERCENT
    content_area_y_start = IMAGE_HEIGHT * TOP_MARGIN_PERCENT
    content_area_width = IMAGE_WIDTH * (1 - LEFT_MARGIN_PERCENT - RIGHT_MARGIN_PERCENT)
    content_area_height = IMAGE_HEIGHT * (1 - TOP_MARGIN_PERCENT - BOTTOM_MARGIN_PERCENT)

    if content_area_width <= 0 or content_area_height <= 0:
        print(f"  CRITICAL ({base_img_name}): Margins are too large resulting in zero/negative content area. Check ..._MARGIN_PERCENT values.")
        return False

    processed_wrapped_lines = []
    for original_line_segment in text_lines_from_input:
        wrapped_segment = wrap_text_pil(draw, original_line_segment, font, content_area_width)
        processed_wrapped_lines.append(wrapped_segment)
    full_text = "\n".join(l for l in processed_wrapped_lines if l) # Filter out potentially empty lines from wrapping

    if not full_text.strip(): # If after wrapping, all text is gone (e.g. was just spaces)
        print(f"  Warning ({base_img_name}): Text content became empty after processing/wrapping. Skipping image save.")
        return False

    try:
        if hasattr(draw, 'textbbox'):
            text_bbox_at_origin = draw.textbbox(xy=(0,0), text=full_text, font=font, spacing=LINE_SPACING, align=TEXT_ALIGN)
        else: # Fallback for older Pillow versions
            total_h = 0; max_w = 0; lines = full_text.split('\n')
            for idx, line in enumerate(lines):
                lw, lh = draw.textsize(line, font=font); max_w = max(max_w, lw); total_h += lh
                if idx < len(lines) -1: total_h += LINE_SPACING
            text_bbox_at_origin = (0, 0, max_w, total_h)
    except Exception as e_bbox:
        print(f"  Error ({base_img_name}): Exception during text bounding box calculation: {e_bbox}. Positioning may be approximate.")
        # Fallback to a rough estimate if textbbox fails catastrophically
        text_bbox_at_origin = (0, 0, content_area_width * 0.9, content_area_height * 0.9) # A guess

    text_block_actual_width = text_bbox_at_origin[2] - text_bbox_at_origin[0]
    text_block_actual_height = text_bbox_at_origin[3] - text_bbox_at_origin[1]

    if text_block_actual_width > content_area_width * 1.01: # Allow 1% tolerance
        print(f"  Warning ({base_img_name}): Calculated text block width ({text_block_actual_width:.0f}px) "
              f"exceeds content area width ({content_area_width:.0f}px). Could be a long unbreakable word.")
    if text_block_actual_height > content_area_height:
        print(f"  Warning ({base_img_name}): Calculated text block height ({text_block_actual_height:.0f}px) "
              f"exceeds content area height ({content_area_height:.0f}px). Text may be clipped vertically.")

    text_x_in_content_area = (content_area_width - text_block_actual_width) / 2
    text_y_in_content_area = (content_area_height - text_block_actual_height) / 2
    final_draw_x = content_area_x_start + text_x_in_content_area - text_bbox_at_origin[0]
    final_draw_y = content_area_y_start + text_y_in_content_area - text_bbox_at_origin[1]

    draw.multiline_text((final_draw_x, final_draw_y), full_text, fill=TEXT_COLOR, font=font, align=TEXT_ALIGN, spacing=LINE_SPACING)
    try:
        img.save(output_filename)
        return True
    except Exception as e_save:
        print(f"  Error ({base_img_name}): Failed to save image {output_filename}: {e_save}")
        return False


def parse_input_file(filepath):
    all_sets_data = []
    current_set_construction_data = {}
    bgcolor_for_upcoming_set = DEFAULT_BACKGROUND_COLOR
    parsing_errors = []
    file_content_lines = []
    parsing_questions_for_current_set_block = False

    if not filepath.lower().endswith('.txt'):
        print(f"ERROR (parse_input_file): Script only accepts .txt files. Provided: {filepath}")
        sys.exit(1)
    try:
        with open(filepath, 'r', encoding='utf-8') as f_txt:
            file_content_lines = f_txt.readlines()
    except FileNotFoundError:
        parsing_errors.append(f"Input file '{filepath}' not found.")
        sys.exit(1)
    except Exception as e:
        parsing_errors.append(f"Error reading input file '{filepath}': {e}")
        sys.exit(1)

    def finalize_and_store_current_set_under_construction():
        nonlocal current_set_construction_data, all_sets_data, parsing_questions_for_current_set_block
        if current_set_construction_data.get("title_text"):
            if "_current_question_buffer" in current_set_construction_data and \
               current_set_construction_data["_current_question_buffer"]:
                raw_q_text = "".join(current_set_construction_data["_current_question_buffer"])
                if "_raw_question_blocks" not in current_set_construction_data:
                    current_set_construction_data["_raw_question_blocks"] = []
                if raw_q_text.strip(): # Only add if buffer has non-whitespace
                    current_set_construction_data["_raw_question_blocks"].append(raw_q_text)
            
            if "_raw_question_blocks" in current_set_construction_data:
                processed_questions = []
                for raw_q_block in current_set_construction_data["_raw_question_blocks"]:
                    if raw_q_block.strip():
                        processed_questions.append(raw_q_block.rstrip('\n').replace('\\n', '\n'))
                current_set_construction_data["question_texts"] = processed_questions
            
            for key in ["_raw_question_blocks", "_current_question_buffer"]:
                if key in current_set_construction_data:
                    del current_set_construction_data[key]

            if "background_color" not in current_set_construction_data: # Should be set by now
                current_set_construction_data["background_color"] = DEFAULT_BACKGROUND_COLOR
            if "question_texts" not in current_set_construction_data:
                current_set_construction_data["question_texts"] = []
            
            # print(f"DEBUG: Finalizing set '{current_set_construction_data['title_text']}' with BG: {current_set_construction_data.get('background_color')}")
            all_sets_data.append(dict(current_set_construction_data))
        
        current_set_construction_data = {}
        parsing_questions_for_current_set_block = False
    
    for i, line_raw_from_file in enumerate(file_content_lines):
        line_number = i + 1
        line_for_directives = line_raw_from_file.strip()

        if line_for_directives.startswith('#'): continue
        
        if not line_for_directives: # Empty lines
            if parsing_questions_for_current_set_block and \
               current_set_construction_data.get("title_text") and \
               "_current_question_buffer" in current_set_construction_data:
                if current_set_construction_data["_current_question_buffer"]: 
                    raw_q_text = "".join(current_set_construction_data["_current_question_buffer"])
                    if "_raw_question_blocks" not in current_set_construction_data:
                         current_set_construction_data["_raw_question_blocks"] = []
                    if raw_q_text.strip(): # Only add if buffer has non-whitespace
                        current_set_construction_data["_raw_question_blocks"].append(raw_q_text)
                    current_set_construction_data["_current_question_buffer"] = [] 
            continue

        if line_for_directives.upper().startswith("TITLE:"):
            finalize_and_store_current_set_under_construction()
            title_candidate = line_for_directives[len("TITLE:"):].strip()
            if title_candidate:
                # print(f"DEBUG: TITLE: '{title_candidate}'. Applying initial bgcolor_for_upcoming_set: {bgcolor_for_upcoming_set}")
                current_set_construction_data = {
                    "title_text": title_candidate.replace('\\n', '\n'),
                    "background_color": bgcolor_for_upcoming_set, # Use sticky color
                }
                bgcolor_for_upcoming_set = DEFAULT_BACKGROUND_COLOR # Reset sticky for NEXT use
                # print(f"DEBUG: TITLE: bgcolor_for_upcoming_set now RESET to: {bgcolor_for_upcoming_set}")
            else:
                parsing_errors.append(f"L{line_number}: TITLE directive is empty. This set will likely be skipped.")
                current_set_construction_data = {} # Ensure it's empty
        
        elif line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:"):
            # Extract the string part after "BACKGROUND_COLOR_RGB:" and strip leading/trailing whitespace
            rgb_value_part_with_potential_comment = line_for_directives[len("BACKGROUND_COLOR_RGB:"):].strip()
            
            # Remove any comments (text after '#'). Take only the part before the first '#'
            rgb_str_cleaned = rgb_value_part_with_potential_comment.split('#', 1)[0].strip()

            try:
                # Split the cleaned string by comma to get individual color components
                components = rgb_str_cleaned.split(',')
                
                # Check if we have exactly 3 components
                if len(components) != 3:
                    raise ValueError(f"RGB must have 3 components. Found {len(components)} in '{rgb_str_cleaned}'.")
                
                # Convert each component to an integer, stripping whitespace from each component string first
                parsed_rgb_values = [int(c.strip()) for c in components]
                
                # Validate that all RGB values are in the 0-255 range
                if not all(0 <= val <= 255 for val in parsed_rgb_values):
                    raise ValueError(f"RGB values must be between 0 and 255. Got {parsed_rgb_values}.")
                
                # Convert the list of integers to a tuple
                parsed_rgb_tuple = tuple(parsed_rgb_values)
                
                # Apply the parsed color
                if current_set_construction_data.get("title_text"): # If currently defining a set
                    # print(f"DEBUG: BG_RGB (intra-set for '{current_set_construction_data['title_text']}'): Overriding BG from {current_set_construction_data.get('background_color')} to {parsed_rgb_tuple}")
                    current_set_construction_data["background_color"] = parsed_rgb_tuple
                else: # If before any TITLE, or between sets, make it sticky for the next set
                    # print(f"DEBUG: BG_RGB (global/sticky): Setting bgcolor_for_upcoming_set to {parsed_rgb_tuple}")
                    bgcolor_for_upcoming_set = parsed_rgb_tuple 
            
            except ValueError as e_rgb: # Catches errors from int() conversion, len check, range check
                # Report error using the original string part for better context
                parsing_errors.append(f"L{line_number}: Invalid BACKGROUND_COLOR_RGB format '{rgb_value_part_with_potential_comment}': {e_rgb}.")
            except Exception as e_generic: # Catch any other unexpected errors during parsing
                 parsing_errors.append(f"L{line_number}: Unexpected error parsing BACKGROUND_COLOR_RGB '{rgb_value_part_with_potential_comment}': {e_generic}.")


        elif line_for_directives.upper() == "QUESTIONS_START":
            if not current_set_construction_data.get("title_text"):
                parsing_errors.append(f"L{line_number}: QUESTIONS_START encountered without a preceding valid TITLE. Ignoring this questions block.")
                parsing_questions_for_current_set_block = False # Ensure it's off
                continue # Skip to next line

            if parsing_questions_for_current_set_block: 
                 parsing_errors.append(f"L{line_number}: Warning - Multiple QUESTIONS_START for title '{current_set_construction_data.get('title_text', 'Unknown')}'. Previous question content for this set will be overwritten.")
            
            current_set_construction_data["_raw_question_blocks"] = [] # Reset for this specific Q_START
            current_set_construction_data["_current_question_buffer"] = []
            parsing_questions_for_current_set_block = True
        
        elif parsing_questions_for_current_set_block and current_set_construction_data.get("title_text"):
            current_set_construction_data["_current_question_buffer"].append(line_raw_from_file)
        
        # Catch-alls for unexpected content
        elif current_set_construction_data.get("title_text"): # If we are inside a set definition
             parsing_errors.append(f"L{line_number}: Warning - Unexpected content '{line_for_directives[:50]}...' within set definition for '{current_set_construction_data['title_text']}'. Expected 'QUESTIONS_START', 'BACKGROUND_COLOR_RGB', comments, or empty lines.")
        elif not line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:"): # If we are outside any set definition
             parsing_errors.append(f"L{line_number}: Warning - Unexpected content '{line_for_directives[:50]}...' outside of any set definition. Expected 'TITLE:', 'BACKGROUND_COLOR_RGB', comments, or empty lines.")

    finalize_and_store_current_set_under_construction()

    if not all_sets_data and not file_content_lines:
        parsing_errors.append(f"Input file '{filepath}' is empty.")
    elif not all_sets_data and not parsing_errors: # File had content but no valid sets (e.g. all titles empty)
        parsing_errors.append(f"Input file '{filepath}' did not define any valid slide sets (e.g., missing or empty TITLE directives).")
    
    if parsing_errors:
        print(f"\n--- Parsing Issues in '{filepath}': ---")
        for err_msg in parsing_errors: print(f"- {err_msg}")
        if not all_sets_data:
            print("CRITICAL: No valid slide sets were parsed from the input file. Exiting.")
            sys.exit(1)
        else:
            print("Continuing with successfully parsed sets despite above warnings...")
            
    return all_sets_data
    all_sets_data = []
    current_set_construction_data = {}
    bgcolor_for_upcoming_set = DEFAULT_BACKGROUND_COLOR
    parsing_errors = []
    file_content_lines = []
    parsing_questions_for_current_set_block = False

    if not filepath.lower().endswith('.txt'):
        print(f"ERROR (parse_input_file): Script only accepts .txt files. Provided: {filepath}")
        sys.exit(1)
    try:
        with open(filepath, 'r', encoding='utf-8') as f_txt:
            file_content_lines = f_txt.readlines()
    except FileNotFoundError:
        parsing_errors.append(f"Input file '{filepath}' not found.")
        sys.exit(1)
    except Exception as e:
        parsing_errors.append(f"Error reading input file '{filepath}': {e}")
        sys.exit(1)

    def finalize_and_store_current_set_under_construction():
        nonlocal current_set_construction_data, all_sets_data, parsing_questions_for_current_set_block
        if current_set_construction_data.get("title_text"):
            if "_current_question_buffer" in current_set_construction_data and \
               current_set_construction_data["_current_question_buffer"]:
                raw_q_text = "".join(current_set_construction_data["_current_question_buffer"])
                if "_raw_question_blocks" not in current_set_construction_data:
                    current_set_construction_data["_raw_question_blocks"] = []
                if raw_q_text.strip(): # Only add if buffer has non-whitespace
                    current_set_construction_data["_raw_question_blocks"].append(raw_q_text)
            
            if "_raw_question_blocks" in current_set_construction_data:
                processed_questions = []
                for raw_q_block in current_set_construction_data["_raw_question_blocks"]:
                    if raw_q_block.strip():
                        processed_questions.append(raw_q_block.rstrip('\n').replace('\\n', '\n'))
                current_set_construction_data["question_texts"] = processed_questions
            
            for key in ["_raw_question_blocks", "_current_question_buffer"]:
                if key in current_set_construction_data:
                    del current_set_construction_data[key]

            if "background_color" not in current_set_construction_data: # Should be set by now
                current_set_construction_data["background_color"] = DEFAULT_BACKGROUND_COLOR
            if "question_texts" not in current_set_construction_data:
                current_set_construction_data["question_texts"] = []
            
            # print(f"DEBUG: Finalizing set '{current_set_construction_data['title_text']}' with BG: {current_set_construction_data.get('background_color')}")
            all_sets_data.append(dict(current_set_construction_data))
        
        current_set_construction_data = {}
        parsing_questions_for_current_set_block = False
    
    for i, line_raw_from_file in enumerate(file_content_lines):
        line_number = i + 1
        line_for_directives = line_raw_from_file.strip()

        if line_for_directives.startswith('#'): continue
        
        if not line_for_directives: # Empty lines
            if parsing_questions_for_current_set_block and \
               current_set_construction_data.get("title_text") and \
               "_current_question_buffer" in current_set_construction_data:
                if current_set_construction_data["_current_question_buffer"]: 
                    raw_q_text = "".join(current_set_construction_data["_current_question_buffer"])
                    if "_raw_question_blocks" not in current_set_construction_data:
                         current_set_construction_data["_raw_question_blocks"] = []
                    if raw_q_text.strip(): # Only add if buffer has non-whitespace
                        current_set_construction_data["_raw_question_blocks"].append(raw_q_text)
                    current_set_construction_data["_current_question_buffer"] = [] 
            continue

        if line_for_directives.upper().startswith("TITLE:"):
            finalize_and_store_current_set_under_construction()
            title_candidate = line_for_directives[len("TITLE:"):].strip()
            if title_candidate:
                # print(f"DEBUG: TITLE: '{title_candidate}'. Applying initial bgcolor_for_upcoming_set: {bgcolor_for_upcoming_set}")
                current_set_construction_data = {
                    "title_text": title_candidate.replace('\\n', '\n'),
                    "background_color": bgcolor_for_upcoming_set, # Use sticky color
                }
                bgcolor_for_upcoming_set = DEFAULT_BACKGROUND_COLOR # Reset sticky for NEXT use
                # print(f"DEBUG: TITLE: bgcolor_for_upcoming_set now RESET to: {bgcolor_for_upcoming_set}")
            else:
                parsing_errors.append(f"L{line_number}: TITLE directive is empty. This set will likely be skipped.")
                current_set_construction_data = {} # Ensure it's empty
        
        elif line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:"):
            rgb_str = line_for_directives[len("BACKGROUND_COLOR_RGB:"):].strip()
            try:
                parsed_rgb = tuple(map(int, rgb_str.split(',')))
                if len(parsed_rgb) != 3: raise ValueError("RGB must have 3 components.")
                if not all(0 <= val <= 255 for val in parsed_rgb): raise ValueError("RGB values must be 0-255.")
                
                if current_set_construction_data.get("title_text"): # Inside a defined set
                    # print(f"DEBUG: BG_RGB (intra-set for '{current_set_construction_data['title_text']}'): Overriding BG from {current_set_construction_data.get('background_color')} to {parsed_rgb}")
                    current_set_construction_data["background_color"] = parsed_rgb
                else: # Before any TITLE, or between sets after finalize
                    # print(f"DEBUG: BG_RGB (global/sticky): Setting bgcolor_for_upcoming_set to {parsed_rgb}")
                    bgcolor_for_upcoming_set = parsed_rgb 
            except ValueError as e_rgb:
                parsing_errors.append(f"L{line_number}: Invalid BACKGROUND_COLOR_RGB format '{rgb_str}': {e_rgb}.")

        elif line_for_directives.upper() == "QUESTIONS_START":
            if not current_set_construction_data.get("title_text"):
                parsing_errors.append(f"L{line_number}: QUESTIONS_START encountered without a preceding valid TITLE. Ignoring this questions block.")
                parsing_questions_for_current_set_block = False # Ensure it's off
                continue # Skip to next line

            if parsing_questions_for_current_set_block: 
                 parsing_errors.append(f"L{line_number}: Warning - Multiple QUESTIONS_START for title '{current_set_construction_data.get('title_text', 'Unknown')}'. Previous question content for this set will be overwritten.")
            
            current_set_construction_data["_raw_question_blocks"] = [] # Reset for this specific Q_START
            current_set_construction_data["_current_question_buffer"] = []
            parsing_questions_for_current_set_block = True
        
        elif parsing_questions_for_current_set_block and current_set_construction_data.get("title_text"):
            current_set_construction_data["_current_question_buffer"].append(line_raw_from_file)
        
        # Catch-alls for unexpected content
        elif current_set_construction_data.get("title_text"): # If we are inside a set definition
             parsing_errors.append(f"L{line_number}: Warning - Unexpected content '{line_for_directives[:50]}...' within set definition for '{current_set_construction_data['title_text']}'. Expected 'QUESTIONS_START', 'BACKGROUND_COLOR_RGB', comments, or empty lines.")
        elif not line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:"): # If we are outside any set definition
             parsing_errors.append(f"L{line_number}: Warning - Unexpected content '{line_for_directives[:50]}...' outside of any set definition. Expected 'TITLE:', 'BACKGROUND_COLOR_RGB', comments, or empty lines.")

    finalize_and_store_current_set_under_construction()

    if not all_sets_data and not file_content_lines:
        parsing_errors.append(f"Input file '{filepath}' is empty.")
    elif not all_sets_data and not parsing_errors: # File had content but no valid sets (e.g. all titles empty)
        parsing_errors.append(f"Input file '{filepath}' did not define any valid slide sets (e.g., missing or empty TITLE directives).")
    
    if parsing_errors:
        print(f"\n--- Parsing Issues in '{filepath}': ---")
        for err_msg in parsing_errors: print(f"- {err_msg}")
        if not all_sets_data:
            print("CRITICAL: No valid slide sets were parsed from the input file. Exiting.")
            sys.exit(1)
        else:
            print("Continuing with successfully parsed sets despite above warnings...")
            
    return all_sets_data


def main():
    parser = argparse.ArgumentParser(description="Generate slide images from multiple sets (with multiple questions per set) in a .txt file.")
    parser.add_argument("input_file", help="Path to the input .txt file.")
    args = parser.parse_args()

    if not args.input_file.lower().endswith('.txt'):
        print(f"ERROR: Script only accepts .txt files. You provided: {args.input_file}")
        sys.exit(1)

    print(f"--- Slide Generation Started ---")
    print(f"  Input file: {args.input_file}")
    
    font_ok_primary, font_ok_fallback = True, True
    try: 
        ImageFont.truetype(FONT_NAME, DEFAULT_FONT_SIZE)
        print(f"  Primary Font Check: '{FONT_NAME}' OK.")
    except Exception: 
        font_ok_primary = False
        print(f"  WARNING: Primary font '{FONT_NAME}' failed to load. Will try PIL default.")
    if not font_ok_primary:
        try: 
            ImageFont.load_default()
            print(f"  PIL Default Font Check: OK as fallback.")
        except Exception: 
            font_ok_fallback = False
            print(f"  CRITICAL: PIL default font ALSO FAILED to load.")
    if not font_ok_primary and not font_ok_fallback:
        print("  FATAL: No usable fonts found. Image generation will likely fail. Exiting.")
        sys.exit(1)

    parsed_slide_sets = parse_input_file(args.input_file)
    # parse_input_file now handles exit if no sets are parsed.
    if not parsed_slide_sets: 
        print("No slide sets to process after parsing. Exiting.") # Should be unreachable if parse_input_file exits
        sys.exit(0) 

    base_input_filename_no_ext = os.path.splitext(os.path.basename(args.input_file))[0]
    main_output_collection_folder = f"{base_input_filename_no_ext}_slide_collections"

    try:
        if os.path.exists(main_output_collection_folder): 
            print(f"  Note: Removing existing output folder: ./{main_output_collection_folder}/")
            shutil.rmtree(main_output_collection_folder)
        os.makedirs(main_output_collection_folder, exist_ok=True)
    except OSError as e:
        print(f"CRITICAL ERROR: Could not create main output folder '{main_output_collection_folder}': {e}")
        sys.exit(1)
    
    print(f"\n--- Processing Slide Sets from: {args.input_file} ---")
    print(f"  Outputting all sets to main folder: ./{main_output_collection_folder}/")
    total_images_generated_across_all_sets = 0

    for set_index, slide_set_data in enumerate(parsed_slide_sets):
        set_title_full_text = slide_set_data.get("title_text", f"Unnamed_Set_{set_index+1}")
        # Ensure title is not just whitespace for folder naming
        effective_title_for_folder = set_title_full_text.strip() if set_title_full_text.strip() else f"Unnamed_Set_{set_index+1}"

        set_bgcolor = slide_set_data.get("background_color", DEFAULT_BACKGROUND_COLOR)
        set_question_texts_list = slide_set_data.get("question_texts", [])

        sanitized_set_folder_name = sanitize_filename(effective_title_for_folder, default_name=f"set_{set_index+1:02d}")
        current_set_output_folder = os.path.join(main_output_collection_folder, sanitized_set_folder_name)

        print(f"\n-- Processing Set {set_index+1}: '{effective_title_for_folder.splitlines()[0]}' --")
        print(f"   Outputting to subfolder: ./{current_set_output_folder}/")
        print(f"   Using background color: {set_bgcolor}")
        try: 
            os.makedirs(current_set_output_folder, exist_ok=True)
        except OSError as e: 
            print(f"   ERROR: Could not create set subfolder '{current_set_output_folder}': {e}. Skipping this set.")
            continue

        generated_files_count_for_this_set = 0
        # Process Title Slide
        if set_title_full_text.strip(): # Only generate title slide if title text is not just whitespace
            output_file_path = os.path.join(current_set_output_folder, "slide_00_title.png")
            print(f"   Creating Title Slide for '{effective_title_for_folder.splitlines()[0]}'...")
            if create_image_with_text(set_title_full_text.split('\n'), output_file_path, set_bgcolor):
                generated_files_count_for_this_set += 1
                print(f"     Successfully created: {output_file_path}")
            else: 
                print(f"     Failed to create title slide for set '{effective_title_for_folder.splitlines()[0]}'.")
        else:
            print(f"   Skipping title slide for Set {set_index+1} as title text is empty or whitespace.")

        # Process Question Slides
        if set_question_texts_list:
            for q_idx, q_full_text_for_slide in enumerate(set_question_texts_list):
                if not q_full_text_for_slide.strip(): # Should be pre-filtered by parser, but double check
                    print(f"   Skipping Question Slide {q_idx+1} for set '{effective_title_for_folder.splitlines()[0]}' as it's empty.")
                    continue
                output_file_path = os.path.join(current_set_output_folder, f"slide_{q_idx + 1:02d}_question.png")
                print(f"   Creating Question Slide {q_idx+1} for '{effective_title_for_folder.splitlines()[0]}'...")
                if create_image_with_text(q_full_text_for_slide.split('\n'), output_file_path, set_bgcolor):
                    generated_files_count_for_this_set += 1
                    print(f"     Successfully created: {output_file_path}")
                else: 
                    print(f"     Failed to create question slide {q_idx+1} for set '{effective_title_for_folder.splitlines()[0]}'.")
        else:
            print(f"   No valid questions found for set '{effective_title_for_folder.splitlines()[0]}'.")
        
        if generated_files_count_for_this_set == 0:
            print(f"   No images were generated for set '{effective_title_for_folder.splitlines()[0]}'.")
            if os.path.exists(current_set_output_folder) and not os.listdir(current_set_output_folder):
                try: 
                    os.rmdir(current_set_output_folder)
                    print(f"   Removed empty set subfolder: ./{current_set_output_folder}/")
                except OSError as e_rmdir: 
                    print(f"   Could not remove empty set subfolder for '{effective_title_for_folder.splitlines()[0]}': {e_rmdir}")
        else: 
            total_images_generated_across_all_sets += generated_files_count_for_this_set
    
    if total_images_generated_across_all_sets == 0:
        print("\nNo images were generated across all sets. Check input file and console logs for errors (especially font loading or parsing issues).")
        if os.path.exists(main_output_collection_folder) and not os.listdir(main_output_collection_folder):
            try: 
                os.rmdir(main_output_collection_folder)
                print(f"Removed empty main output collection folder: ./{main_output_collection_folder}/")
            except OSError as e_rmdir: 
                print(f"Could not remove empty main output collection folder: {e_rmdir}")
    else:
        print(f"\nSuccessfully generated {total_images_generated_across_all_sets} slide image(s) in total.")
        print(f"Output is in folder: ./{main_output_collection_folder}/")

    print("\n--- Slide Generation Finished ---")

if __name__ == "__main__":
    main()