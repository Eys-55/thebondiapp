from PIL import ImageFont # Only for font check in main
import argparse
import sys
import os
import shutil
from datetime import datetime

# Import from local modules
import config
import utils
import image_creator
import parser


def main():
    arg_parser = argparse.ArgumentParser(description="Generate slide images from multiple sets (with multiple questions per set or trivia Q/A pairs) in a .txt file.")
    arg_parser.add_argument("input_file", help="Path to the input .txt file.")
    args = arg_parser.parse_args()

    if not args.input_file.lower().endswith('.txt'):
        print(f"ERROR: Script only accepts .txt files. You provided: {args.input_file}")
        sys.exit(1)

    print(f"--- Slide Generation Started ---")
    print(f"  Input file: {args.input_file}")
    
    font_ok_primary, font_ok_fallback = True, True
    try:
        ImageFont.truetype(config.FONT_NAME, config.DEFAULT_FONT_SIZE)
        print(f"  Primary Font Check: '{config.FONT_NAME}' OK.")
    except Exception:
        font_ok_primary = False
        print(f"  WARNING: Primary font '{config.FONT_NAME}' failed to load. Will try PIL default.")
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

    parsed_slide_sets = parser.parse_input_file(args.input_file)
    if not parsed_slide_sets:
        print("No slide sets to process after parsing. Exiting.")
        sys.exit(0)

    # Main output folder for all generated slides
    main_output_root_folder = "generated_slides"
    try:
        os.makedirs(main_output_root_folder, exist_ok=True)
    except OSError as e:
        print(f"CRITICAL ERROR: Could not create main root output folder '{main_output_root_folder}': {e}")
        sys.exit(1)
    
    current_date_str = datetime.now().strftime("%Y%m%d")
    print(f"\n--- Processing Slide Sets from: {args.input_file} ---")
    print(f"  Outputting all sets to main folder: ./{main_output_root_folder}/")
    total_images_generated_across_all_sets = 0

    for set_index, slide_set_data in enumerate(parsed_slide_sets):
        set_title_full_text = slide_set_data.get("title_text", f"Unnamed_Set_{set_index+1}")
        effective_title_for_folder = set_title_full_text.strip() if set_title_full_text.strip() else f"Unnamed_Set_{set_index+1}"

        set_bgcolor = slide_set_data.get("background_color", config.DEFAULT_BACKGROUND_COLOR)
        set_textcolor = slide_set_data.get("text_color", config.TEXT_COLOR) # Get text color for the set
        set_question_texts_list = slide_set_data.get("question_texts", [])
        set_trivia_items_list = slide_set_data.get("trivia_items", [])

        set_type = "trivia" if set_trivia_items_list else "qna"
        
        type_specific_folder = os.path.join(main_output_root_folder, set_type)
        try:
            os.makedirs(type_specific_folder, exist_ok=True)
        except OSError as e:
            print(f"   ERROR: Could not create type subfolder '{type_specific_folder}': {e}. Skipping this set.")
            continue

        sanitized_title_base = utils.sanitize_filename(effective_title_for_folder, default_name=f"set_{set_index+1:02d}")
        dated_set_folder_name = f"{sanitized_title_base}_{current_date_str}_slides"
        current_set_output_folder = os.path.join(type_specific_folder, dated_set_folder_name)

        print(f"\n-- Processing Set {set_index+1}: '{effective_title_for_folder.splitlines()[0]}' ({set_type.upper()}) --")
        print(f"   Outputting to subfolder: ./{current_set_output_folder}/")
        print(f"   Using background color: {set_bgcolor}")
        try:
            # If the dated folder for this set already exists, remove it to ensure a clean generation for this run.
            if os.path.exists(current_set_output_folder):
                 print(f"   Note: Removing existing dated set folder: ./{current_set_output_folder}/")
                 shutil.rmtree(current_set_output_folder)
            os.makedirs(current_set_output_folder, exist_ok=True)
        except OSError as e:
            print(f"   ERROR: Could not create/recreate set subfolder '{current_set_output_folder}': {e}. Skipping this set.")
            continue

        generated_files_count_for_this_set = 0
        current_slide_number = 0 # Start with 0 for title

        # Process Title Slide
        if set_title_full_text.strip():
            output_file_path = os.path.join(current_set_output_folder, f"slide_{current_slide_number:02d}_title.png")
            print(f"   Creating Title Slide for '{effective_title_for_folder.splitlines()[0]}'...")
            if image_creator.create_image_with_text(set_title_full_text.split('\n'), output_file_path, set_bgcolor, set_textcolor):
                generated_files_count_for_this_set += 1
                print(f"     Successfully created: {output_file_path}")
            else:
                print(f"     Failed to create title slide for set '{effective_title_for_folder.splitlines()[0]}'.")
        else:
            print(f"   Skipping title slide for Set {set_index+1} as title text is empty or whitespace.")
        
        current_slide_number +=1 # Increment for first content slide

        # Process Trivia Slides if they exist
        if set_trivia_items_list:
            print(f"   Processing {len(set_trivia_items_list)} trivia items for this set...")
            for t_idx, trivia_item in enumerate(set_trivia_items_list):
                q_text = trivia_item.get("question", "")
                a_text = trivia_item.get("answer", "")

                if not q_text.strip():
                    print(f"   Skipping Trivia Item {t_idx+1} Question slide as question text is empty.")
                else:
                    output_file_path_q = os.path.join(current_set_output_folder, f"slide_{current_slide_number:02d}_question.png")
                    print(f"   Creating Trivia Question Slide {t_idx+1} (Overall slide {current_slide_number})...")
                    if image_creator.create_image_with_text(q_text.split('\n'), output_file_path_q, set_bgcolor, set_textcolor):
                        generated_files_count_for_this_set += 1
                        print(f"     Successfully created: {output_file_path_q}")
                    else:
                        print(f"     Failed to create trivia question slide {t_idx+1}.")
                current_slide_number += 1
                
                if not a_text.strip():
                    print(f"   Skipping Trivia Item {t_idx+1} Answer slide as answer text is empty.")
                else:
                    output_file_path_a = os.path.join(current_set_output_folder, f"slide_{current_slide_number:02d}_answer.png")
                    print(f"   Creating Trivia Answer Slide {t_idx+1} (Overall slide {current_slide_number})...")
                    if image_creator.create_image_with_text(a_text.split('\n'), output_file_path_a, set_bgcolor, set_textcolor):
                        generated_files_count_for_this_set += 1
                        print(f"     Successfully created: {output_file_path_a}")
                    else:
                        print(f"     Failed to create trivia answer slide {t_idx+1}.")
                current_slide_number += 1
        
        # Process Regular Question Slides (only if no trivia items were processed for this set)
        elif set_question_texts_list:
            print(f"   Processing {len(set_question_texts_list)} regular questions for this set...")
            for q_idx, q_full_text_for_slide in enumerate(set_question_texts_list):
                if not q_full_text_for_slide.strip():
                    print(f"   Skipping Question Slide {q_idx+1} (Overall slide {current_slide_number}) as it's empty.")
                    current_slide_number +=1 # Still consumes a slide number conceptually
                    continue
                output_file_path = os.path.join(current_set_output_folder, f"slide_{current_slide_number:02d}_question.png")
                print(f"   Creating Question Slide {q_idx+1} (Overall slide {current_slide_number})...")
                if image_creator.create_image_with_text(q_full_text_for_slide.split('\n'), output_file_path, set_bgcolor, set_textcolor):
                    generated_files_count_for_this_set += 1
                    print(f"     Successfully created: {output_file_path}")
                else:
                    print(f"     Failed to create question slide {q_idx+1}.")
                current_slide_number += 1
        else:
            # This case means neither trivia nor regular questions were found for the set (after title)
            if set_title_full_text.strip(): # If there was a title
                 print(f"   No questions or trivia items found for set '{effective_title_for_folder.splitlines()[0]}'.")
            # If no title either, it's an empty set, parser should ideally not produce it, but good to log.
            elif not set_title_full_text.strip() and not set_question_texts_list and not set_trivia_items_list:
                 print(f"   Set {set_index+1} is completely empty (no title, questions, or trivia).")

        
        if generated_files_count_for_this_set == 0:
            print(f"   No images were generated for set '{effective_title_for_folder.splitlines()[0]}'.")
            if os.path.exists(current_set_output_folder) and not os.listdir(current_set_output_folder):
                try:
                    os.rmdir(current_set_output_folder)
                    print(f"   Removed empty set subfolder: ./{current_set_output_folder}/")
                except OSError as e_rmdir:
                    print(f"   Warning: Could not remove empty set subfolder for '{effective_title_for_folder.splitlines()[0]}': {e_rmdir}")
        else:
            total_images_generated_across_all_sets += generated_files_count_for_this_set
    
    if total_images_generated_across_all_sets == 0:
        print("\nNo images were generated across all sets. Check input file and console logs for errors (especially font loading or parsing issues).")
        # The main_output_root_folder ('generated_slides') is intentionally not removed if empty,
        # as it's a persistent root for all generations.
        # Type-specific folders ('qna', 'trivia') are also not removed if they end up empty
        # after all their child sets fail to generate or are removed.
    else:
        print(f"\nSuccessfully generated {total_images_generated_across_all_sets} slide image(s) in total.")
        print(f"Output is in folder: ./{main_output_root_folder}/")

    print("\n--- Slide Generation Finished ---")

if __name__ == "__main__":
    main()