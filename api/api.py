from flask import Flask, send_from_directory, request, jsonify
import os
import parselmouth
import tempfile

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

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run()
