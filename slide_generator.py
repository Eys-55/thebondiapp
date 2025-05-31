from PIL import Image, ImageDraw, ImageFont
import argparse
import sys
import os
import zipfile
import shutil

# ==============================================================================
# --- User-Editable Sizing & Layout Configuration ---
# ==============================================================================

# --- Image Dimensions ---
IMAGE_WIDTH = 1000  # Overall width of the generated image in pixels
IMAGE_HEIGHT = 1000 # Overall height of the generated image in pixels

# --- Font Settings ---
# <<< --- !!! VERY IMPORTANT: SET THIS TO A VALID FONT PATH ON YOUR SYSTEM !!! --- >>>
# Examples:
# macOS: FONT_NAME = "/System/Library/Fonts/Supplemental/Arial.ttf"
# Linux: FONT_NAME = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
# Windows: FONT_NAME = "C:/Windows/Fonts/arial.ttf"
FONT_NAME = "/System/Library/Fonts/Supplemental/Arial.ttf" # <<< --- CHANGE THIS TO YOUR FONT --- >>>

DEFAULT_FONT_SIZE = 60  # <<< --- THIS IS THE ABSOLUTELY FIXED FONT SIZE --- >>>
                        # It will NOT change based on text length.

# --- Text Layout within Margins ---
LINE_SPACING = 15       # Extra vertical pixels between lines of multiline text
TEXT_ALIGN = "center"   # Alignment for multiline text ("left", "center", "right")

# --- Margins (as a percentage of image dimensions) ---
# These define the 'content area' where text will be placed and wrapped.
# For example, 0.10 means a 10% margin.
TOP_MARGIN_PERCENT = 0.10    # Margin from the top edge of the image
BOTTOM_MARGIN_PERCENT = 0.10 # Margin from the bottom edge of the image
LEFT_MARGIN_PERCENT = 0.10   # Margin from the left edge of the image
RIGHT_MARGIN_PERCENT = 0.10  # Margin from the right edge of the image
# Note: Text will automatically wrap to fit the width defined by
#       IMAGE_WIDTH * (1 - LEFT_MARGIN_PERCENT - RIGHT_MARGIN_PERCENT).

# ==============================================================================
# --- End User-Editable Sizing & Layout Configuration ---
# ==============================================================================

# --- Other Global Settings (Less Likely to Change Frequently) ---
DEFAULT_BACKGROUND_COLOR = (77, 100, 255) # Default background if not in file
TEXT_COLOR = (255, 255, 255)              # Default text color (white)


def wrap_text_pil(draw_context, text, font, max_line_pixel_width):
    """
    Wraps a single string of text to fit within max_line_pixel_width using the given font.
    Inserts '\n' characters for wrapping.
    """
    if not text.strip():
        return ""

    words = text.split(' ')
    lines = []
    current_line = ""

    for word in words:
        try:
            word_bbox = draw_context.textbbox((0,0), word, font=font)
            word_width = word_bbox[2] - word_bbox[0]
        except Exception:
            word_width = len(word) * (font.size * 0.6) # Rough fallback

        # Handle very long words
        if word_width > max_line_pixel_width:
            if current_line: # If there's content before this long word, add it
                lines.append(current_line.strip())
            lines.append(word) # Add the long word on its own line
            print(f"    WARNING (wrap_text_pil): Single word '{word[:30]}...' (width: {word_width:.0f}px) "
                  f"is wider than max line width ({max_line_pixel_width:.0f}px). It will overflow.")
            current_line = ""
            continue

        test_line_content = current_line + (" " if current_line else "") + word
        try:
            test_line_bbox = draw_context.textbbox((0,0), test_line_content.strip(), font=font)
            test_line_width = test_line_bbox[2] - test_line_bbox[0]
        except Exception:
            test_line_width = len(test_line_content.strip()) * (font.size * 0.6) # Rough fallback

        if test_line_width <= max_line_pixel_width:
            current_line = test_line_content
        else:
            lines.append(current_line.strip())
            current_line = word

    if current_line.strip():
        lines.append(current_line.strip())

    return "\n".join(lines)


def create_image_with_text(text_lines_from_input, output_filename, background_color_tuple):
    """
    Creates an image with text, using FIXED font size and AUTOMATIC LINE BREAKING
    within the defined margins.
    """
    base_img_name = os.path.basename(output_filename)
    if not text_lines_from_input or not any(line.strip() for line in text_lines_from_input):
        print(f"  Warning ({base_img_name}): No actual text content provided. Skipping.")
        return False

    img = Image.new('RGB', (IMAGE_WIDTH, IMAGE_HEIGHT), color=background_color_tuple)
    draw = ImageDraw.Draw(img)
    font = None
    font_used_description = "Unknown"

    # --- Font Loading ---
    print(f"  Font Loading for {base_img_name}:")
    try:
        font = ImageFont.truetype(FONT_NAME, DEFAULT_FONT_SIZE)
        font_used_description = f"Custom font '{FONT_NAME}' (size {DEFAULT_FONT_SIZE})"
        print(f"    SUCCESS: Loaded {font_used_description}.")
    except IOError:
        print(f"    ERROR  : FONT FILE PROBLEM for '{FONT_NAME}' (size {DEFAULT_FONT_SIZE}). Check path/validity.")
        print(f"    WARNING: FALLING BACK to default PIL font for {base_img_name}.")
        print(f"             Default PIL font has its OWN INTRINSIC SIZE (NOT {DEFAULT_FONT_SIZE}).")
        try:
            font = ImageFont.load_default()
            font_used_description = f"PIL Default Font (intrinsic size)"
        except Exception as e_pil:
            print(f"    CRITICAL: Could not load default PIL font. Error: {e_pil}")
            return False
    except Exception as e_font:
        print(f"    ERROR  : UNEXPECTED FONT LOADING ISSUE: {e_font}")
        # Try fallback as above
        try:
            font = ImageFont.load_default()
            font_used_description = f"PIL Default Font (intrinsic size)"
        except Exception as e_pil_fallback:
            print(f"    CRITICAL: Could not load default PIL font on fallback. Error: {e_pil_fallback}")
            return False
    if font is None: return False # Should be caught above
    print(f"    INFO   : Final font: {font_used_description}.")
    # --- End Font Loading ---

    # --- Calculate Content Area based on Margins ---
    content_area_x_start = IMAGE_WIDTH * LEFT_MARGIN_PERCENT
    content_area_y_start = IMAGE_HEIGHT * TOP_MARGIN_PERCENT
    content_area_width = IMAGE_WIDTH * (1 - LEFT_MARGIN_PERCENT - RIGHT_MARGIN_PERCENT)
    content_area_height = IMAGE_HEIGHT * (1 - TOP_MARGIN_PERCENT - BOTTOM_MARGIN_PERCENT)

    if content_area_width <= 0 or content_area_height <= 0:
        print(f"  CRITICAL ({base_img_name}): Margins are too large, resulting in zero or negative content area. "
              f"Content W: {content_area_width:.0f}, H: {content_area_height:.0f}. Check TOP/BOTTOM/LEFT/RIGHT_MARGIN_PERCENT.")
        return False
    print(f"  Layout Info ({base_img_name}): Content Area W: {content_area_width:.0f}px, H: {content_area_height:.0f}px "
          f"(within {IMAGE_WIDTH}x{IMAGE_HEIGHT} image)")
    # --- End Content Area Calculation ---


    # --- Automatic Line Wrapping within Content Area Width ---
    processed_wrapped_lines = []
    # Each `original_line_segment` comes from user's text split by their `\n`
    for original_line_segment in text_lines_from_input:
        wrapped_segment = wrap_text_pil(draw, original_line_segment, font, content_area_width)
        processed_wrapped_lines.append(wrapped_segment)
    full_text = "\n".join(processed_wrapped_lines)
    # --- End Automatic Line Wrapping ---

    # --- Calculate Text Block Dimensions and Position ---
    try:
        # Get bbox relative to (0,0) to understand text's own padding/offset
        text_bbox_at_origin = draw.textbbox(xy=(0,0), text=full_text, font=font, spacing=LINE_SPACING, align=TEXT_ALIGN)
    except TypeError: # Older Pillow
        text_bbox_at_origin = draw.textbbox((0,0), text=full_text, font=font, spacing=LINE_SPACING, align=TEXT_ALIGN)
    except Exception as e_bbox:
        print(f"  Error ({base_img_name}): Calculating text bounding box: {e_bbox}. Positioning may be off.")
        # Fallback if bbox calculation fails drastically
        text_bbox_at_origin = (0, 0, content_area_width * 0.9, content_area_height * 0.9)

    text_block_actual_width = text_bbox_at_origin[2] - text_bbox_at_origin[0]
    text_block_actual_height = text_bbox_at_origin[3] - text_bbox_at_origin[1]

    # Warnings if wrapped text still exceeds content area (e.g., single very long word, or too many lines)
    if text_block_actual_width > content_area_width * 1.01: # Allow 1% tolerance for float precision
        print(f"  Warning ({base_img_name}): Text block width ({text_block_actual_width:.0f}px) "
              f"slightly exceeds content area width ({content_area_width:.0f}px). Might be due to a very long word.")
    if text_block_actual_height > content_area_height:
        print(f"  Warning ({base_img_name}): Text block height ({text_block_actual_height:.0f}px) "
              f"exceeds content area height ({content_area_height:.0f}px). Text may be clipped vertically.")

    # Center the text block *within* the content area
    text_x_in_content_area = (content_area_width - text_block_actual_width) / 2
    text_y_in_content_area = (content_area_height - text_block_actual_height) / 2

    # Final drawing coordinates, adjusted for content area start and text_bbox_at_origin's own offset
    final_draw_x = content_area_x_start + text_x_in_content_area - text_bbox_at_origin[0]
    final_draw_y = content_area_y_start + text_y_in_content_area - text_bbox_at_origin[1]
    # --- End Text Block Dimensions and Position ---

    draw.multiline_text(
        (final_draw_x, final_draw_y),
        full_text,
        fill=TEXT_COLOR,
        font=font,
        align=TEXT_ALIGN,
        spacing=LINE_SPACING
    )

    try:
        img.save(output_filename)
        return True
    except Exception as e_save:
        print(f"  Error ({base_img_name}): Saving image {output_filename}: {e_save}")
        return False


def parse_input_file(filepath):
    title_str = None
    bg_color_rgb = DEFAULT_BACKGROUND_COLOR
    questions = []
    parsing_errors = []
    file_content_lines = []

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

    if not file_content_lines and not parsing_errors:
        parsing_errors.append(f"Input file '{filepath}' is empty.")

    if any("not found" in err.lower() or "empty" in err.lower() for err in parsing_errors):
        print(f"\n--- Critical errors reading input file '{filepath}': ---")
        for err_msg in parsing_errors: print(f"- {err_msg}")
        sys.exit(1)

    parsing_questions = False
    current_slide_text_accumulator = []

    for i, line_raw_from_file in enumerate(file_content_lines):
        line_number = i + 1
        line_for_directives = line_raw_from_file.strip()

        if line_for_directives.startswith('#'): continue
        if not line_for_directives:
            if parsing_questions and current_slide_text_accumulator:
                questions.append("".join(current_slide_text_accumulator).strip())
                current_slide_text_accumulator = []
            continue

        if line_for_directives.upper().startswith("TITLE:"):
            title_candidate = line_for_directives[len("TITLE:"):].strip()
            if title_candidate: title_str = title_candidate
            else: parsing_errors.append(f"L{line_number}: TITLE directive is empty.")
        elif line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:"):
            rgb_str = line_for_directives[len("BACKGROUND_COLOR_RGB:"):].strip()
            try:
                parsed_rgb = tuple(map(int, rgb_str.split(',')))
                if len(parsed_rgb) != 3: raise ValueError("RGB must have 3 components.")
                for val in parsed_rgb:
                    if not (0 <= val <= 255): raise ValueError("RGB values 0-255.")
                bg_color_rgb = parsed_rgb
            except ValueError as e_rgb:
                parsing_errors.append(f"L{line_number}: Parsing BACKGROUND_COLOR_RGB '{rgb_str}': {e_rgb}.")
        elif line_for_directives.upper() == "QUESTIONS_START":
            if current_slide_text_accumulator:
                 parsing_errors.append(f"L{line_number}: Unexpected text before QUESTIONS_START: {''.join(current_slide_text_accumulator)[:50]}...")
                 questions.append("".join(current_slide_text_accumulator).strip())
                 current_slide_text_accumulator = []
            parsing_questions = True
        elif parsing_questions:
            current_slide_text_accumulator.append(line_raw_from_file)
        elif title_str is not None and not parsing_questions:
            if not line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:"):
                 parsing_errors.append(f"L{line_number}: Unexpected content '{line_for_directives[:50]}...'. Expected 'QUESTIONS_START', 'BACKGROUND_COLOR_RGB', or comments.")

    if parsing_questions and current_slide_text_accumulator:
        questions.append("".join(current_slide_text_accumulator).strip())
    if title_str is None:
        parsing_errors.append(f"Input file '{filepath}' missing 'TITLE:' directive.")

    if parsing_errors:
        print(f"\n--- Errors parsing directives in '{filepath}': ---")
        for err_msg in parsing_errors: print(f"- {err_msg}")
        if title_str is None:
             print("CRITICAL: Valid TITLE missing. Exiting.")
             sys.exit(1)
        print("Continuing with defaults/parsed values where possible...")
    return title_str, bg_color_rgb, questions

def create_zip_archive(folder_to_zip, zip_filename):
    try:
        with zipfile.ZipFile(zip_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, _, files in os.walk(folder_to_zip):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, folder_to_zip)
                    zipf.write(file_path, arcname)
        return True
    except Exception as e:
        print(f"Error creating ZIP archive {zip_filename}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Generate slides from a .txt file (ZIP output, FIXED font size, AUTO line breaks within margins).")
    parser.add_argument("input_file", help="Path to the input .txt file defining slides.")
    parser.add_argument("--keep-intermediate-folder", action="store_true",
                        help="Do not delete the intermediate image folder after creating the ZIP archive.")
    args = parser.parse_args()

    if not args.input_file.lower().endswith('.txt'):
        print(f"ERROR: Script only accepts .txt files. You provided: {args.input_file}")
        sys.exit(1)

    print(f"--- Slide Generation Started ---")
    print(f"  Image Dimensions: {IMAGE_WIDTH}x{IMAGE_HEIGHT}")
    print(f"  Fixed Font Size: {DEFAULT_FONT_SIZE} (using '{FONT_NAME}')")
    print(f"  Margins: T={TOP_MARGIN_PERCENT*100:.0f}%, B={BOTTOM_MARGIN_PERCENT*100:.0f}%, "
          f"L={LEFT_MARGIN_PERCENT*100:.0f}%, R={RIGHT_MARGIN_PERCENT*100:.0f}%")
    print(f"  >>> CHECK CONSOLE for font loading messages for EACH slide. <<<")
    print(f"  If FONT_NAME fails, PIL default font (DIFFERENT SIZE!) will be used.")

    title_full_text, background_color_from_file, question_slide_texts = parse_input_file(args.input_file)

    base_filename = os.path.splitext(os.path.basename(args.input_file))[0]
    intermediate_output_folder = f"{base_filename}_generated_slides_temp"

    try:
        if os.path.exists(intermediate_output_folder): shutil.rmtree(intermediate_output_folder)
        os.makedirs(intermediate_output_folder, exist_ok=True)
    except OSError as e:
        print(f"CRITICAL ERROR creating temp folder '{intermediate_output_folder}': {e}")
        sys.exit(1)

    print(f"\n--- Processing Slides from: {args.input_file} ---")
    print(f"  Intermediate images will be saved in: ./{intermediate_output_folder}/")
    print(f"  Using background color: {background_color_from_file}")
    generated_files_count = 0

    if title_full_text:
        title_lines_for_processing = title_full_text.split('\n')
        output_file_path = os.path.join(intermediate_output_folder, "slide_00_title.png")
        print(f"\nProcessing Title Slide: {repr(title_full_text)}")
        if create_image_with_text(title_lines_for_processing, output_file_path, background_color_from_file):
            generated_files_count +=1

    if not question_slide_texts:
        print("\nNo questions found after 'QUESTIONS_START' in the input file.")
    else:
        for i, q_full_text_for_slide in enumerate(question_slide_texts):
            question_lines_for_processing = q_full_text_for_slide.split('\n')
            output_file_path = os.path.join(intermediate_output_folder, f"slide_{i + 1:02d}_question.png")
            print(f"\nProcessing Question Slide {i+1}: {repr(q_full_text_for_slide)}")
            if create_image_with_text(question_lines_for_processing, output_file_path, background_color_from_file):
                generated_files_count +=1

    if generated_files_count == 0:
        print("\nNo images were generated. Check input file and CONSOLE LOGS for errors (especially font loading).")
        if os.path.exists(intermediate_output_folder) and not os.listdir(intermediate_output_folder):
            try:
                os.rmdir(intermediate_output_folder)
                print(f"Removed empty intermediate folder: ./{intermediate_output_folder}/")
            except OSError as e_rmdir:
                print(f"Could not remove empty intermediate folder: {e_rmdir}")
    else:
        print(f"\nGenerated {generated_files_count} slide image(s) in intermediate folder.")
        zip_filename = f"{base_filename}_generated_slides.zip"
        print(f"Attempting to create ZIP archive: {zip_filename}")

        if create_zip_archive(intermediate_output_folder, zip_filename):
            print(f"Successfully created ZIP archive: ./{zip_filename}")
            if not args.keep_intermediate_folder:
                try:
                    shutil.rmtree(intermediate_output_folder)
                    print(f"Successfully deleted intermediate folder: ./{intermediate_output_folder}/")
                except Exception as e_rmtree_full:
                    print(f"Error deleting intermediate folder: {e_rmtree_full}")
            else:
                print(f"Intermediate folder ./{intermediate_output_folder}/ kept as per --keep-intermediate-folder.")
        else:
            print(f"Failed to create ZIP. Intermediate folder ./{intermediate_output_folder}/ has been kept.")
    print("\n--- Slide Generation Finished ---")

if __name__ == "__main__":
    main()