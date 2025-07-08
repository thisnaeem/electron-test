#!/usr/bin/env python3
"""
YouTube Transcriber Script
Extracts transcripts from YouTube videos using youtube-transcript-api
"""

import sys
import json
import re
import requests
from urllib.parse import urlparse, parse_qs
import traceback

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    from youtube_transcript_api.formatters import TextFormatter
except ImportError:
    print(json.dumps({
        "success": False,
        "error": "youtube-transcript-api package not installed. Please run: pip install youtube-transcript-api"
    }))
    sys.exit(1)


def extract_video_id(url: str) -> str:
    """
    Extract video ID from various YouTube URL formats

    Args:
        url: YouTube URL

    Returns:
        Video ID string or raises ValueError if invalid
    """
    # Common YouTube URL patterns
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([^&\n?#]+)',
        r'youtube\.com/v/([^&\n?#]+)',
        r'youtube\.com/shorts/([^&\n?#]+)'
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)

    # Try parsing as URL parameters
    try:
        parsed_url = urlparse(url)
        if 'youtube.com' in parsed_url.netloc:
            query_params = parse_qs(parsed_url.query)
            if 'v' in query_params:
                return query_params['v'][0]
    except Exception:
        pass

    # If it's just a video ID
    if re.match(r'^[a-zA-Z0-9_-]{11}$', url.strip()):
        return url.strip()

    raise ValueError(f"Could not extract video ID from URL: {url}")


def get_video_info(video_id: str) -> dict:
    """
    Get video information using YouTube's oEmbed API

    Args:
        video_id: YouTube video ID

    Returns:
        Dictionary with video information or error
    """
    try:
        # Use YouTube's oEmbed API (no API key required)
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"

        response = requests.get(oembed_url, timeout=10)
        response.raise_for_status()

        video_data = response.json()

        # Get higher quality thumbnail
        thumbnail_url = f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg"

        # Check if high quality thumbnail exists, fall back to medium quality
        try:
            thumb_response = requests.head(thumbnail_url, timeout=5)
            if thumb_response.status_code != 200:
                thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
        except:
            thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"

        return {
            "success": True,
            "title": video_data.get("title", ""),
            "author_name": video_data.get("author_name", ""),
            "author_url": video_data.get("author_url", ""),
            "thumbnail_url": thumbnail_url,
            "thumbnail_width": video_data.get("thumbnail_width", 480),
            "thumbnail_height": video_data.get("thumbnail_height", 360),
            "video_url": f"https://www.youtube.com/watch?v={video_id}",
            "video_id": video_id
        }

    except requests.exceptions.RequestException as e:
        return {
            "success": False,
            "error": f"Failed to fetch video information: {str(e)}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Error processing video information: {str(e)}"
        }


def get_transcript(video_id: str, language_codes: list = None) -> dict:
    """
    Get transcript for a YouTube video

    Args:
        video_id: YouTube video ID
        language_codes: List of preferred language codes (e.g., ['en', 'es'])

    Returns:
        Dictionary with success status and transcript data
    """
    try:
        # Get available transcripts
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Try to get transcript in preferred languages or auto-generated
        transcript = None
        language_used = None
        is_auto_generated = False

        # If specific languages requested, try them first
        if language_codes:
            for lang_code in language_codes:
                try:
                    # Try manual transcript first
                    transcript = transcript_list.find_manually_created_transcript([lang_code])
                    language_used = lang_code
                    break
                except:
                    try:
                        # Try auto-generated transcript
                        transcript = transcript_list.find_generated_transcript([lang_code])
                        language_used = lang_code
                        is_auto_generated = True
                        break
                    except:
                        continue

        # If no specific language or none found, try English first
        if not transcript:
            try:
                transcript = transcript_list.find_manually_created_transcript(['en'])
                language_used = 'en'
            except:
                try:
                    transcript = transcript_list.find_generated_transcript(['en'])
                    language_used = 'en'
                    is_auto_generated = True
                except:
                    # Get any available transcript
                    try:
                        # Try any manual transcript
                        for t in transcript_list:
                            if not t.is_generated:
                                transcript = t
                                language_used = t.language_code
                                break

                        # If no manual, try any auto-generated
                        if not transcript:
                            for t in transcript_list:
                                if t.is_generated:
                                    transcript = t
                                    language_used = t.language_code
                                    is_auto_generated = True
                                    break
                    except:
                        pass

        if not transcript:
            # List available languages for error message
            available_languages = []
            for t in transcript_list:
                available_languages.append({
                    'language': t.language,
                    'language_code': t.language_code,
                    'is_generated': t.is_generated
                })

            return {
                "success": False,
                "error": "No transcript available for this video",
                "available_languages": available_languages
            }

        # Fetch the transcript
        transcript_data = transcript.fetch()

        # Format transcript as plain text
        formatter = TextFormatter()
        formatted_transcript = formatter.format_transcript(transcript_data)

        # Also provide timestamped version
        timestamped_transcript = []
        for entry in transcript_data:
            timestamped_transcript.append({
                'start': entry.start,
                'duration': entry.duration,
                'text': entry.text
            })

        return {
            "success": True,
            "transcript": formatted_transcript,
            "timestamped_transcript": timestamped_transcript,
            "language": transcript.language,
            "language_code": language_used,
            "is_auto_generated": is_auto_generated,
            "video_id": video_id,
            "total_entries": len(transcript_data)
        }

    except Exception as e:
        return {
            "success": False,
            "error": f"Error fetching transcript: {str(e)}",
            "traceback": traceback.format_exc()
        }


def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python youtube_transcriber.py <youtube_url_or_video_id> [language_codes...]"
        }))
        sys.exit(1)

    url_or_id = sys.argv[1]
    language_codes = sys.argv[2:] if len(sys.argv) > 2 else None

    try:
        # Extract video ID from URL
        video_id = extract_video_id(url_or_id)

        # Get video information
        video_info = get_video_info(video_id)

        # Get transcript
        transcript_result = get_transcript(video_id, language_codes)

        # Combine results
        result = {
            "video_info": video_info,
            "transcript_result": transcript_result
        }

        print(json.dumps(result))

    except ValueError as e:
        print(json.dumps({
            "success": False,
            "error": str(e)
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
