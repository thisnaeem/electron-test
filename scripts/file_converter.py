#!/usr/bin/env python3
"""
File Converter Script
Converts files between different formats (PNG to JPG, SVG to JPG)
"""

import sys
import json
import os
import base64
import tempfile
import traceback
from io import BytesIO

try:
    from PIL import Image
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Required packages not installed: {str(e)}. Please run: pip install Pillow"
    }))
    sys.exit(1)


def convert_file(input_data: str, input_format: str, output_format: str, quality: int = 85) -> dict:
    """
    Convert file from one format to another

    Args:
        input_data: Base64 encoded file data
        input_format: Source format (png, svg, etc.)
        output_format: Target format (jpg, png, etc.)
        quality: JPEG quality (1-100, default 85)

    Returns:
        Dictionary with success status and converted file data
    """
    try:
        # Check for SVG input
        if input_format.lower() == 'svg':
            return {
                "success": False,
                "error": "SVG conversion is currently not supported on Windows due to library dependencies. Please use an online SVG converter or install ImageMagick + Wand manually.",
                "suggestion": "You can convert SVG files using online tools like CloudConvert, Convertio, or install ImageMagick on your system."
            }

        # Decode base64 data
        file_data = base64.b64decode(input_data)

        # Handle different conversion scenarios
        if input_format.lower() == 'png' and output_format.lower() in ['jpg', 'jpeg']:
            return convert_png_to_jpg(file_data, quality)
        else:
            return convert_with_pil(file_data, input_format, output_format, quality)

    except Exception as e:
        return {
            "success": False,
            "error": f"Conversion error: {str(e)}",
            "traceback": traceback.format_exc()
        }


def convert_png_to_jpg(png_data: bytes, quality: int = 85) -> dict:
    """Convert PNG to JPG format"""
    try:
        # Open PNG with PIL
        image = Image.open(BytesIO(png_data))

        # Convert RGBA to RGB (JPG doesn't support transparency)
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = rgb_image

        # Save as JPG
        output_buffer = BytesIO()
        image.save(output_buffer, format='JPEG', quality=quality, optimize=True)
        output_data = output_buffer.getvalue()

        # Encode to base64
        base64_output = base64.b64encode(output_data).decode('utf-8')

        return {
            "success": True,
            "base64": base64_output,
            "format": "jpeg",
            "original_size": len(png_data),
            "converted_size": len(output_data),
            "dimensions": image.size,
            "quality": quality
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"PNG to JPG conversion error: {str(e)}",
            "traceback": traceback.format_exc()
        }


def convert_with_pil(file_data: bytes, input_format: str, output_format: str, quality: int = 85) -> dict:
    """Generic conversion using PIL for other formats"""
    try:
        # Open image with PIL
        image = Image.open(BytesIO(file_data))

        # Handle transparency for JPG output
        if output_format.lower() in ['jpg', 'jpeg'] and image.mode in ('RGBA', 'LA', 'P'):
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            rgb_image.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = rgb_image

        # Save in target format
        output_buffer = BytesIO()
        save_kwargs = {'format': output_format.upper()}

        if output_format.lower() in ['jpg', 'jpeg']:
            save_kwargs['quality'] = quality
            save_kwargs['optimize'] = True

        image.save(output_buffer, **save_kwargs)
        output_data = output_buffer.getvalue()

        # Encode to base64
        base64_output = base64.b64encode(output_data).decode('utf-8')

        return {
            "success": True,
            "base64": base64_output,
            "format": output_format.lower(),
            "original_size": len(file_data),
            "converted_size": len(output_data),
            "dimensions": image.size,
            "quality": quality if output_format.lower() in ['jpg', 'jpeg'] else None
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"PIL conversion error: {str(e)}",
            "traceback": traceback.format_exc()
        }


def main():
    """Main function to handle input from JSON file"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python file_converter.py <input_json_file>"
        }))
        sys.exit(1)

    input_file = sys.argv[1]

    try:
        # Read input data from JSON file
        with open(input_file, 'r') as f:
            input_data = json.load(f)

        input_format = input_data['inputFormat']
        output_format = input_data['outputFormat']
        base64_data = input_data['base64Data']
        quality = input_data.get('quality', 85)

        # Perform conversion
        result = convert_file(base64_data, input_format, output_format, quality)
        print(json.dumps(result))

    except FileNotFoundError:
        print(json.dumps({
            "success": False,
            "error": f"Input file not found: {input_file}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(json.dumps({
            "success": False,
            "error": f"Invalid JSON in input file: {str(e)}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)
    except KeyError as e:
        print(json.dumps({
            "success": False,
            "error": f"Missing required field in input data: {str(e)}",
            "traceback": traceback.format_exc()
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
