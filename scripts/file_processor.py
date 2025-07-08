#!/usr/bin/env python3
"""
File Processor Script
Extracts filenames from various file types and cleans filenames
"""

import sys
import json
import os
import tempfile
import traceback
import re
import zipfile
import tarfile
from pathlib import Path

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False


def extract_filenames_from_archive(file_path: str, archive_type: str) -> list:
    """
    Extract filenames from archive files (ZIP, TAR, etc.)

    Args:
        file_path: Path to the archive file
        archive_type: Type of archive (zip, tar, etc.)

    Returns:
        List of filenames in the archive
    """
    filenames = []

    try:
        if archive_type.lower() in ['zip']:
            with zipfile.ZipFile(file_path, 'r') as zip_file:
                filenames = zip_file.namelist()
        elif archive_type.lower() in ['tar', 'tar.gz', 'tgz', 'tar.bz2', 'tbz2']:
            with tarfile.open(file_path, 'r:*') as tar_file:
                filenames = tar_file.getnames()
        elif archive_type.lower() in ['rar', '7z']:
            # For RAR and 7Z files, we can't extract without external libraries
            # Return an informative error message
            return {"error": f"Archive type {archive_type.upper()} requires external tools. Please extract the archive manually and upload a text file with the filename list."}
        else:
            return {"error": f"Unsupported archive type: {archive_type}"}
    except Exception as e:
        return {"error": f"Failed to extract from {archive_type}: {str(e)}"}

    return filenames


def extract_filenames_from_text(file_path: str) -> list:
    """
    Extract filenames from text files (assumes one filename per line or space-separated)

    Args:
        file_path: Path to the text file

    Returns:
        List of filenames found in the text
    """
    filenames = []

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()

        # Split by lines first
        lines = content.split('\n')
        for line in lines:
            line = line.strip()
            if line:
                # Try to find filename patterns
                # Look for strings with common file extensions
                filename_pattern = r'[^\s<>"\'|*?:;,]+\.[a-zA-Z0-9]{1,10}'
                matches = re.findall(filename_pattern, line)
                filenames.extend(matches)

                # Also split by spaces and check each word
                words = line.split()
                for word in words:
                    word = word.strip('.,;:"\'()[]{}')
                    if '.' in word and len(word) > 3:
                        # Basic filename validation
                        if not any(char in word for char in '<>"|*?:'):
                            filenames.append(word)

    except Exception as e:
        return {"error": f"Failed to read text file: {str(e)}"}

    # Remove duplicates while preserving order
    seen = set()
    unique_filenames = []
    for filename in filenames:
        if filename not in seen:
            seen.add(filename)
            unique_filenames.append(filename)

    return unique_filenames


def extract_filenames_from_csv(file_path: str) -> list:
    """
    Extract filenames from CSV files

    Args:
        file_path: Path to the CSV file

    Returns:
        List of filenames found in the CSV
    """
    if not PANDAS_AVAILABLE:
        return {"error": "pandas is required for CSV processing. Please install with: pip install pandas"}

    filenames = []

    try:
        # Read CSV file
        df = pd.read_csv(file_path)

        # Look through all columns for filename patterns
        filename_pattern = r'[^\s<>"\'|*?:;,]+\.[a-zA-Z0-9]{1,10}'

        for column in df.columns:
            if df[column].dtype == 'object':  # String columns
                for value in df[column].dropna():
                    value_str = str(value)
                    matches = re.findall(filename_pattern, value_str)
                    filenames.extend(matches)

    except Exception as e:
        return {"error": f"Failed to read CSV file: {str(e)}"}

    # Remove duplicates
    return list(set(filenames))


def extract_filenames_from_directory_listing(file_path: str) -> list:
    """
    Extract filenames from directory listing files

    Args:
        file_path: Path to the directory listing file

    Returns:
        List of filenames
    """
    filenames = []

    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()

        for line in lines:
            line = line.strip()
            if line and not line.startswith('.'):
                # Remove common ls -la prefixes (permissions, size, date, etc.)
                parts = line.split()
                if len(parts) > 0:
                    # Take the last part as filename (works for most directory listings)
                    potential_filename = parts[-1]
                    if '.' in potential_filename and len(potential_filename) > 1:
                        filenames.append(potential_filename)

    except Exception as e:
        return {"error": f"Failed to read directory listing: {str(e)}"}

    return filenames


def extract_filename_from_single_file(file_path: str, original_filename: str) -> list:
    """
    Extract filename from individual files (images, videos, documents, etc.)
    For single files, we just return the original filename

    Args:
        file_path: Path to the file
        original_filename: Original filename

    Returns:
        List containing the filename
    """
    return [original_filename]


def clean_filename(filename: str, options: dict = None) -> str:
    """
    Clean a filename by removing unwanted characters, numbers, dashes, etc.

    Args:
        filename: Original filename
        options: Cleaning options

    Returns:
        Cleaned filename
    """
    if options is None:
        options = {
            'remove_numbers': True,
            'remove_extra_dashes': True,
            'remove_underscores': False,
            'remove_special_chars': True,
            'preserve_extension': True,
            'remove_leading_numbers': True,
            'normalize_spaces': True
        }

    # Split filename and extension
    if '.' in filename and options.get('preserve_extension', True):
        name_part, extension = filename.rsplit('.', 1)
        has_extension = True
    else:
        name_part = filename
        extension = ''
        has_extension = False

    cleaned = name_part

    # Remove leading numbers and dashes/underscores
    if options.get('remove_leading_numbers', True):
        cleaned = re.sub(r'^[\d\-_\s]+', '', cleaned)

    # Remove numbers if requested
    if options.get('remove_numbers', True):
        cleaned = re.sub(r'\d+', '', cleaned)

    # Remove special characters (keeping letters, spaces, some punctuation)
    if options.get('remove_special_chars', True):
        cleaned = re.sub(r'[^\w\s\-_.]', '', cleaned)

    # Handle dashes and underscores
    if options.get('remove_extra_dashes', True):
        cleaned = re.sub(r'-+', '-', cleaned)  # Multiple dashes to single
        cleaned = cleaned.strip('-')  # Remove leading/trailing dashes

    if options.get('remove_underscores', False):
        cleaned = cleaned.replace('_', ' ')

    # Normalize spaces
    if options.get('normalize_spaces', True):
        cleaned = re.sub(r'\s+', ' ', cleaned)  # Multiple spaces to single
        cleaned = cleaned.strip()  # Remove leading/trailing spaces

    # Convert to title case for better readability
    if cleaned:
        cleaned = cleaned.title()

    # Rebuild filename with extension
    if has_extension and extension:
        cleaned = f"{cleaned}.{extension}" if cleaned else f"file.{extension}"
    elif not cleaned:
        cleaned = "unnamed_file"

    return cleaned


def process_files(input_data: dict) -> dict:
    """
    Main processing function

    Args:
        input_data: Dictionary containing operation type and parameters

    Returns:
        Dictionary with results
    """
    operation = input_data.get('operation')

    if operation == 'extract':
        return extract_filenames(input_data)
    elif operation == 'clean':
        return clean_filenames(input_data)
    else:
        return {
            "success": False,
            "error": f"Unknown operation: {operation}"
        }


def extract_filenames(input_data: dict) -> dict:
    """
    Extract filenames from various file types
    """
    try:
        file_data = input_data.get('file_data')  # base64 encoded file
        file_type = input_data.get('file_type', '').lower()
        filename = input_data.get('filename', 'unknown')

        # Decode file data
        import base64
        decoded_data = base64.b64decode(file_data)

        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_type}') as temp_file:
            temp_file.write(decoded_data)
            temp_path = temp_file.name

        filenames = []

        try:
            # Determine extraction method based on file type
            if file_type in ['zip', 'rar', '7z']:
                filenames = extract_filenames_from_archive(temp_path, file_type)
            elif file_type in ['tar', 'gz', 'tgz', 'bz2', 'tbz2']:
                filenames = extract_filenames_from_archive(temp_path, file_type)
            elif file_type in ['txt', 'log', 'list', 'lst', 'names']:
                filenames = extract_filenames_from_text(temp_path)
            elif file_type in ['csv', 'tsv']:
                filenames = extract_filenames_from_csv(temp_path)
            elif file_type in ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp', 'svg', 'ico', 'heic', 'raw', 'cr2', 'nef', 'arw']:
                # Image files - return the filename itself
                filenames = extract_filename_from_single_file(temp_path, filename)
            elif file_type in ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp', 'ogv']:
                # Video files - return the filename itself
                filenames = extract_filename_from_single_file(temp_path, filename)
            elif file_type in ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a', 'opus', 'aiff']:
                # Audio files - return the filename itself
                filenames = extract_filename_from_single_file(temp_path, filename)
            elif file_type in ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf']:
                # Document files - return the filename itself
                filenames = extract_filename_from_single_file(temp_path, filename)
            elif file_type in ['exe', 'msi', 'deb', 'rpm', 'dmg', 'iso', 'bin', 'apk', 'ipa']:
                # Other files - return the filename itself
                filenames = extract_filename_from_single_file(temp_path, filename)
            else:
                # Try as text file for unknown types
                filenames = extract_filenames_from_text(temp_path)

            # Handle error responses
            if isinstance(filenames, dict) and "error" in filenames:
                return {
                    "success": False,
                    "error": filenames["error"]
                }

            return {
                "success": True,
                "filenames": filenames,
                "count": len(filenames),
                "source_file": filename
            }

        finally:
            # Clean up temp file
            try:
                os.unlink(temp_path)
            except:
                pass

    except Exception as e:
        return {
            "success": False,
            "error": f"Extraction failed: {str(e)}",
            "traceback": traceback.format_exc()
        }


def clean_filenames(input_data: dict) -> dict:
    """
    Clean a list of filenames
    """
    try:
        filenames = input_data.get('filenames', [])
        options = input_data.get('options', {})

        cleaned_filenames = []
        for filename in filenames:
            cleaned = clean_filename(filename, options)
            cleaned_filenames.append({
                'original': filename,
                'cleaned': cleaned
            })

        return {
            "success": True,
            "cleaned_filenames": cleaned_filenames,
            "count": len(cleaned_filenames)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Cleaning failed: {str(e)}",
            "traceback": traceback.format_exc()
        }


def main():
    """Main function to handle input from JSON file"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python file_processor.py <input_json_file>"
        }))
        sys.exit(1)

    input_file = sys.argv[1]

    try:
        # Read input data from JSON file
        with open(input_file, 'r') as f:
            input_data = json.load(f)

        # Process files
        result = process_files(input_data)
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
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Unexpected error: {str(e)}",
            "traceback": traceback.format_exc()
        }))
        sys.exit(1)


if __name__ == "__main__":
    main()
