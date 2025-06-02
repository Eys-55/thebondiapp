import sys
import config

def parse_input_file(filepath):
    all_sets_data = []
    current_set_construction_data = {}
    bgcolor_for_upcoming_set = config.DEFAULT_BACKGROUND_COLOR
    textcolor_for_upcoming_set = config.TEXT_COLOR # New: for text color
    parsing_errors = []
    file_content_lines = []
    parsing_questions_for_current_set_block = False
    parsing_trivia_for_current_set_block = False
    current_trivia_question_buffer = None # Stores question text
    current_trivia_answer_buffer = None # Stores answer text

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
        nonlocal current_set_construction_data, all_sets_data
        nonlocal parsing_questions_for_current_set_block, parsing_trivia_for_current_set_block
        nonlocal current_trivia_question_buffer, current_trivia_answer_buffer

        if current_set_construction_data.get("title_text"):
            # Finalize any pending trivia item if parser ends mid-item
            if parsing_trivia_for_current_set_block and current_trivia_question_buffer and current_trivia_answer_buffer:
                if "_trivia_items_buffer" not in current_set_construction_data:
                    current_set_construction_data["_trivia_items_buffer"] = []
                q_text = "".join(current_trivia_question_buffer).rstrip('\n').replace('\\n', '\n')
                a_text = "".join(current_trivia_answer_buffer).rstrip('\n').replace('\\n', '\n')
                if q_text.strip() and a_text.strip(): # Both must have content
                     current_set_construction_data["_trivia_items_buffer"].append({"question": q_text, "answer": a_text})
                elif q_text.strip() and not a_text.strip():
                    parsing_errors.append(f"L{current_set_construction_data.get('_trivia_last_line_num', 'N/A')}: Trivia question '{q_text[:30]}...' is missing a corresponding ANSWER.")
                elif not q_text.strip() and a_text.strip():
                     parsing_errors.append(f"L{current_set_construction_data.get('_trivia_last_line_num', 'N/A')}: Trivia answer '{a_text[:30]}...' is missing a corresponding QUESTION.")


            if "_current_question_buffer" in current_set_construction_data and \
               current_set_construction_data["_current_question_buffer"]:
                raw_q_text = "".join(current_set_construction_data["_current_question_buffer"])
                if "_raw_question_blocks" not in current_set_construction_data:
                    current_set_construction_data["_raw_question_blocks"] = []
                if raw_q_text.strip():
                    current_set_construction_data["_raw_question_blocks"].append(raw_q_text)
            
            if "_raw_question_blocks" in current_set_construction_data:
                processed_questions = []
                for raw_q_block in current_set_construction_data["_raw_question_blocks"]:
                    if raw_q_block.strip():
                        processed_questions.append(raw_q_block.rstrip('\n').replace('\\n', '\n'))
                if processed_questions: # Only add if there are actual questions
                    current_set_construction_data["question_texts"] = processed_questions
            
            if "_trivia_items_buffer" in current_set_construction_data:
                if current_set_construction_data["_trivia_items_buffer"]: # Only add if there are actual items
                    current_set_construction_data["trivia_items"] = list(current_set_construction_data["_trivia_items_buffer"])
            
            for key in ["_raw_question_blocks", "_current_question_buffer", "_trivia_items_buffer", "_trivia_last_line_num"]:
                if key in current_set_construction_data:
                    del current_set_construction_data[key]

            if "background_color" not in current_set_construction_data:
                current_set_construction_data["background_color"] = config.DEFAULT_BACKGROUND_COLOR
            if "text_color" not in current_set_construction_data: # New: ensure text_color exists
                current_set_construction_data["text_color"] = config.TEXT_COLOR
            
            # If both question_texts and trivia_items were somehow defined (e.g. multiple START blocks),
            # prioritize trivia_items as per plan. This shouldn't happen with current logic but good to be safe.
            if "trivia_items" in current_set_construction_data and "question_texts" in current_set_construction_data:
                del current_set_construction_data["question_texts"]
                parsing_errors.append(f"Warning for set '{current_set_construction_data['title_text']}': Both QUESTIONS_START and TRIVIA_START found. Prioritizing TRIVIA content.")


            # Ensure either question_texts or trivia_items exists if their respective start blocks were found.
            # If not, initialize to empty list.
            if "question_texts" not in current_set_construction_data and parsing_questions_for_current_set_block:
                 current_set_construction_data["question_texts"] = []
            if "trivia_items" not in current_set_construction_data and parsing_trivia_for_current_set_block:
                 current_set_construction_data["trivia_items"] = []


            all_sets_data.append(dict(current_set_construction_data))
        
        current_set_construction_data = {}
        parsing_questions_for_current_set_block = False
        parsing_trivia_for_current_set_block = False
        current_trivia_question_buffer = None
        current_trivia_answer_buffer = None
    
    for i, line_raw_from_file in enumerate(file_content_lines):
        line_number = i + 1
        line_for_directives = line_raw_from_file.strip()

        if line_for_directives.startswith('#'): continue
        
        if not line_for_directives:
            if parsing_questions_for_current_set_block and \
               current_set_construction_data.get("title_text") and \
               "_current_question_buffer" in current_set_construction_data:
                if current_set_construction_data["_current_question_buffer"]:
                    raw_q_text = "".join(current_set_construction_data["_current_question_buffer"])
                    if "_raw_question_blocks" not in current_set_construction_data:
                         current_set_construction_data["_raw_question_blocks"] = []
                    if raw_q_text.strip():
                        current_set_construction_data["_raw_question_blocks"].append(raw_q_text)
                    current_set_construction_data["_current_question_buffer"] = []
            # Blank lines in TRIVIA block are ignored unless they are between Q and A.
            # The Q/A logic handles appending to respective buffers.
            continue

        if line_for_directives.upper().startswith("TITLE:"):
            finalize_and_store_current_set_under_construction()
            title_candidate = line_for_directives[len("TITLE:"):].strip()
            if title_candidate:
                current_set_construction_data = {
                    "title_text": title_candidate.replace('\\n', '\n'),
                    "background_color": bgcolor_for_upcoming_set,
                    "text_color": textcolor_for_upcoming_set, # Apply upcoming text color
                }
                bgcolor_for_upcoming_set = config.DEFAULT_BACKGROUND_COLOR
                textcolor_for_upcoming_set = config.TEXT_COLOR # Reset for next set
            else:
                parsing_errors.append(f"L{line_number}: TITLE directive is empty. This set will likely be skipped.")
                current_set_construction_data = {}
        
        elif line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:"):
            rgb_value_part_with_potential_comment = line_for_directives[len("BACKGROUND_COLOR_RGB:"):].strip()
            rgb_str_cleaned = rgb_value_part_with_potential_comment.split('#', 1)[0].strip()
            try:
                components = rgb_str_cleaned.split(',')
                if len(components) != 3:
                    raise ValueError(f"RGB must have 3 components. Found {len(components)} in '{rgb_str_cleaned}'.")
                parsed_rgb_values = [int(c.strip()) for c in components]
                if not all(0 <= val <= 255 for val in parsed_rgb_values):
                    raise ValueError(f"RGB values must be between 0 and 255. Got {parsed_rgb_values}.")
                parsed_rgb_tuple = tuple(parsed_rgb_values)
                if current_set_construction_data.get("title_text"):
                    current_set_construction_data["background_color"] = parsed_rgb_tuple
                else:
                    bgcolor_for_upcoming_set = parsed_rgb_tuple
            except ValueError as e_rgb:
                parsing_errors.append(f"L{line_number}: Invalid BACKGROUND_COLOR_RGB format '{rgb_value_part_with_potential_comment}': {e_rgb}.")
            except Exception as e_generic:
                 parsing_errors.append(f"L{line_number}: Unexpected error parsing BACKGROUND_COLOR_RGB '{rgb_value_part_with_potential_comment}': {e_generic}.")

        elif line_for_directives.upper().startswith("TEXT_COLOR_RGB:"):
            rgb_value_part_with_potential_comment = line_for_directives[len("TEXT_COLOR_RGB:"):].strip()
            rgb_str_cleaned = rgb_value_part_with_potential_comment.split('#', 1)[0].strip()
            try:
                components = rgb_str_cleaned.split(',')
                if len(components) != 3:
                    raise ValueError(f"RGB must have 3 components. Found {len(components)} in '{rgb_str_cleaned}'.")
                parsed_rgb_values = [int(c.strip()) for c in components]
                if not all(0 <= val <= 255 for val in parsed_rgb_values):
                    raise ValueError(f"RGB values must be between 0 and 255. Got {parsed_rgb_values}.")
                parsed_rgb_tuple = tuple(parsed_rgb_values)
                if current_set_construction_data.get("title_text"):
                    current_set_construction_data["text_color"] = parsed_rgb_tuple
                else:
                    textcolor_for_upcoming_set = parsed_rgb_tuple
            except ValueError as e_rgb:
                parsing_errors.append(f"L{line_number}: Invalid TEXT_COLOR_RGB format '{rgb_value_part_with_potential_comment}': {e_rgb}.")
            except Exception as e_generic:
                 parsing_errors.append(f"L{line_number}: Unexpected error parsing TEXT_COLOR_RGB '{rgb_value_part_with_potential_comment}': {e_generic}.")

        elif line_for_directives.upper() == "QUESTIONS_START":
            if not current_set_construction_data.get("title_text"):
                parsing_errors.append(f"L{line_number}: QUESTIONS_START encountered without a preceding valid TITLE. Ignoring this questions block.")
                parsing_questions_for_current_set_block = False
                continue
            if parsing_trivia_for_current_set_block:
                parsing_errors.append(f"L{line_number}: Warning - QUESTIONS_START found while already in TRIVIA_START block for title '{current_set_construction_data.get('title_text', 'Unknown')}'. QUESTIONS_START will be ignored.")
                continue # Ignore this if already parsing trivia
            if parsing_questions_for_current_set_block:
                 parsing_errors.append(f"L{line_number}: Warning - Multiple QUESTIONS_START for title '{current_set_construction_data.get('title_text', 'Unknown')}'. Previous question content for this set will be overwritten.")
            current_set_construction_data["_raw_question_blocks"] = []
            current_set_construction_data["_current_question_buffer"] = []
            parsing_questions_for_current_set_block = True
            parsing_trivia_for_current_set_block = False # Ensure trivia is off

        elif line_for_directives.upper() == "TRIVIA_START":
            if not current_set_construction_data.get("title_text"):
                parsing_errors.append(f"L{line_number}: TRIVIA_START encountered without a preceding valid TITLE. Ignoring this trivia block.")
                parsing_trivia_for_current_set_block = False
                continue
            if parsing_questions_for_current_set_block:
                parsing_errors.append(f"L{line_number}: Warning - TRIVIA_START found while already in QUESTIONS_START block for title '{current_set_construction_data.get('title_text', 'Unknown')}'. TRIVIA_START will be ignored.")
                continue # Ignore this if already parsing simple questions
            if parsing_trivia_for_current_set_block:
                parsing_errors.append(f"L{line_number}: Warning - Multiple TRIVIA_START for title '{current_set_construction_data.get('title_text', 'Unknown')}'. Previous trivia content for this set will be overwritten.")
            current_set_construction_data["_trivia_items_buffer"] = []
            current_trivia_question_buffer = None # Ready for the first QUESTION:
            current_trivia_answer_buffer = None
            parsing_trivia_for_current_set_block = True
            parsing_questions_for_current_set_block = False # Ensure simple questions is off
            current_set_construction_data['_trivia_last_line_num'] = line_number


        elif parsing_trivia_for_current_set_block and current_set_construction_data.get("title_text"):
            current_set_construction_data['_trivia_last_line_num'] = line_number
            if line_for_directives.upper().startswith("QUESTION:"):
                # If there's a pending Q/A pair, store it.
                if current_trivia_question_buffer and current_trivia_answer_buffer:
                    q_text = "".join(current_trivia_question_buffer).rstrip('\n').replace('\\n', '\n')
                    a_text = "".join(current_trivia_answer_buffer).rstrip('\n').replace('\\n', '\n')
                    if q_text.strip() and a_text.strip():
                        current_set_construction_data["_trivia_items_buffer"].append({"question": q_text, "answer": a_text})
                    elif q_text.strip() and not a_text.strip(): # Q but no A
                        parsing_errors.append(f"L{line_number-1}: Trivia question '{q_text[:30]}...' is missing a corresponding ANSWER before new QUESTION started.")
                elif current_trivia_question_buffer and not current_trivia_answer_buffer: # Q but no A, then new Q
                     parsing_errors.append(f"L{line_number-1}: Trivia question '{(''.join(current_trivia_question_buffer).strip())[:30]}...' started but not completed with an ANSWER before new QUESTION.")

                current_trivia_question_buffer = [line_raw_from_file[len("QUESTION:"):].lstrip()] # Start new question
                current_trivia_answer_buffer = None # Reset answer for this new question
            elif line_for_directives.upper().startswith("ANSWER:"):
                if not current_trivia_question_buffer:
                    parsing_errors.append(f"L{line_number}: ANSWER directive found without a preceding QUESTION. Ignoring this answer.")
                elif current_trivia_answer_buffer: # Already have an answer for current Q, this is a new one
                    parsing_errors.append(f"L{line_number}: Multiple ANSWER directives for the current QUESTION. Appending to existing answer.")
                    current_trivia_answer_buffer.append(line_raw_from_file[len("ANSWER:"):].lstrip())
                else: # First answer for the current question
                    current_trivia_answer_buffer = [line_raw_from_file[len("ANSWER:"):].lstrip()]
            else: # Line is part of multi-line Q or A
                if current_trivia_answer_buffer is not None: # If we've started an answer, append to it
                    current_trivia_answer_buffer.append(line_raw_from_file)
                elif current_trivia_question_buffer is not None: # If we've started a question, append to it
                    current_trivia_question_buffer.append(line_raw_from_file)
                # If neither Q nor A buffer is active, this line is unexpected within TRIVIA_START
                # but outside Q/A directives. This case should be rare if Q/A are used.
                elif not current_trivia_question_buffer and not current_trivia_answer_buffer:
                     parsing_errors.append(f"L{line_number}: Unexpected content '{line_for_directives[:50]}...' within TRIVIA_START block. Expecting QUESTION: or ANSWER: directives.")


        elif parsing_questions_for_current_set_block and current_set_construction_data.get("title_text"):
            current_set_construction_data["_current_question_buffer"].append(line_raw_from_file)
        
        elif current_set_construction_data.get("title_text"):
             parsing_errors.append(f"L{line_number}: Warning - Unexpected content '{line_for_directives[:50]}...' within set definition for '{current_set_construction_data['title_text']}'. Expected 'QUESTIONS_START', 'TRIVIA_START', 'BACKGROUND_COLOR_RGB', 'TEXT_COLOR_RGB', comments, or empty lines.")
        elif not (line_for_directives.upper().startswith("BACKGROUND_COLOR_RGB:") or line_for_directives.upper().startswith("TEXT_COLOR_RGB:")):
             parsing_errors.append(f"L{line_number}: Warning - Unexpected content '{line_for_directives[:50]}...' outside of any set definition. Expected 'TITLE:', 'BACKGROUND_COLOR_RGB', 'TEXT_COLOR_RGB', comments, or empty lines.")

    finalize_and_store_current_set_under_construction()

    if not all_sets_data and not file_content_lines:
        parsing_errors.append(f"Input file '{filepath}' is empty.")
    elif not all_sets_data and not parsing_errors:
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