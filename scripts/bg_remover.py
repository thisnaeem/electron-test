#!/usr/bin/env python3
"""
Background Removal Script using rembg
Processes images to remove backgrounds and returns base64 encoded results
"""

import sys
import os
import base64
import json
from io import BytesIO
from PIL import Image
import traceback

try:
    from rembg import remove
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "rembg package not installed. Please run: pip install rembg"
    }))
    sys.exit(1)


def process_image(input_path: str, output_path: str = None) -> dict:
    """
    Remove background from an image

    Args:
        input_path: Path to input image file
        output_path: Optional path to save the output image

    Returns:
        Dictionary with success status and result data
    """
    try:
        # Read input image
        with open(input_path, 'rb') as input_file:
            input_data = input_file.read()

        # Remove background
        output_data = remove(input_data)

        # Convert to base64 for transmission
        output_base64 = base64.b64encode(output_data).decode('utf-8')

        # Save to file if output path provided
        if output_path:
            with open(output_path, 'wb') as output_file:
                output_file.write(output_data)

        # Get original image dimensions for reference
        original_image = Image.open(BytesIO(input_data))
        processed_image = Image.open(BytesIO(output_data))

        return {
            "success": True,
            "base64": output_base64,
            "output_path": output_path,
            "original_size": original_image.size,
            "processed_size": processed_image.size,
            "format": processed_image.format or "PNG"
        }

    except FileNotFoundError:
        return {
            "success": False,
            "error": f"Input file not found: {input_path}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing image: {str(e)}",
            "traceback": traceback.format_exc()
        }


def process_base64_image(base64_data: str) -> dict:
    """
    Remove background from a base64 encoded image

    Args:
        base64_data: Base64 encoded image data (with or without data URI prefix)

    Returns:
        Dictionary with success status and result data
    """
    try:
        # Remove data URI prefix if present
        if base64_data.startswith('data:'):
            base64_data = base64_data.split(',', 1)[1]

        # Decode base64 to bytes
        input_data = base64.b64decode(base64_data)

        # Remove background
        output_data = remove(input_data)

        # Convert back to base64
        output_base64 = base64.b64encode(output_data).decode('utf-8')

        # Get image dimensions for reference
        original_image = Image.open(BytesIO(input_data))
        processed_image = Image.open(BytesIO(output_data))

        return {
            "success": True,
            "base64": output_base64,
            "original_size": original_image.size,
            "processed_size": processed_image.size,
            "format": processed_image.format or "PNG"
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing base64 image: {str(e)}",
            "traceback": traceback.format_exc()
        }


def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python bg_remover.py <mode> [arguments...]"
        }))
        sys.exit(1)

    mode = sys.argv[1]

    try:
        if mode == "file":
            if len(sys.argv) < 3:
                print(json.dumps({
                    "success": False,
                    "error": "File mode requires input path: python bg_remover.py file <input_path> [output_path]"
                }))
                sys.exit(1)

            input_path = sys.argv[2]
            output_path = sys.argv[3] if len(sys.argv) > 3 else None

            result = process_image(input_path, output_path)
            print(json.dumps(result))

        elif mode == "base64":
            if len(sys.argv) < 3:
                print(json.dumps({
                    "success": False,
                    "error": "Base64 mode requires base64 data: python bg_remover.py base64 <base64_data>"
                }))
                sys.exit(1)

            base64_data = sys.argv[2]
            result = process_base64_image(base64_data)
            print(json.dumps(result))

        elif mode == "file-base64":
            if len(sys.argv) < 3:
                print(json.dumps({
                    "success": False,
                    "error": "File-base64 mode requires file path: python bg_remover.py file-base64 <base64_file_path>"
                }))
                sys.exit(1)

            base64_file_path = sys.argv[2]
            try:
                with open(base64_file_path, 'r', encoding='utf-8') as f:
                    base64_data = f.read().strip()
                result = process_base64_image(base64_data)
                print(json.dumps(result))
            except FileNotFoundError:
                print(json.dumps({
                    "success": False,
                    "error": f"Base64 file not found: {base64_file_path}"
                }))
                sys.exit(1)
            except Exception as e:
                print(json.dumps({
                    "success": False,
                    "error": f"Error reading base64 file: {str(e)}"
                }))
                sys.exit(1)

        else:
            print(json.dumps({
                "success": False,
                "error": f"Unknown mode: {mode}. Use 'file', 'base64', or 'file-base64'"
            }))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
