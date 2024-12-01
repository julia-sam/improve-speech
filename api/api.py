from flask import Flask, send_from_directory, request, jsonify, send_file
import os
import parselmouth
import tempfile
from pathlib import Path
from openai import OpenAI
import logging

app = Flask(__name__, static_folder='build', static_url_path="")

@app.route('/api/analyze_pitch', methods=['POST'])
def analyze_pitch():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    
    # Save the uploaded audio to a temporary file
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_wav:
        audio_file.save(temp_wav.name)
        temp_wav_path = temp_wav.name

    try:
        # Process the audio file using Parselmouth
        sound = parselmouth.Sound(temp_wav_path)
        pitch = sound.to_pitch()
        pitch_values = pitch.selected_array['frequency']
        time_stamps = pitch.xs()

        # Format the result as a list of time-frequency pairs
        result = [
            {'time': time, 'frequency': freq}
            for time, freq in zip(time_stamps, pitch_values)
            if freq > 0  # Only include voiced frequencies
        ]

        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_wav_path):
            os.remove(temp_wav_path)

@app.route('/api/text_to_speech', methods=['POST'])
def text_to_speech():
    # Parse the incoming JSON data
    data = request.get_json()
    text = data.get('text')
    api_key = data.get('api_key')

    # Validate the inputs
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    if not api_key:
        return jsonify({'error': 'No API key provided'}), 400

    try:
        # Initialize OpenAI client with the provided API key
        client = OpenAI(api_key=api_key)

        # Create a temporary file for the speech output
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_audio:
            speech_file_path = Path(temp_audio.name)

        # Generate speech using OpenAI's TTS API
        response = client.audio.speech.create(
            model="tts-1",  # Use the model optimized for real-time applications
            voice="alloy",  # Use the desired voice
            input=text      # Provide the text input
        )

        # Stream the audio content into the temporary file
        response.stream_to_file(speech_file_path)

        # Return the audio file to the client
        return send_file(
            speech_file_path,
            as_attachment=True,
            download_name="speech.mp3",
            mimetype="audio/mpeg"
        )

    except Exception as e:
        logging.error(f"Error in text-to-speech generation: {e}")
        return jsonify({'error': str(e)}), 500


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run()
