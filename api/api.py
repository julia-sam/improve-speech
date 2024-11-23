import time
from flask import Flask, send_from_directory, request, jsonify

app = Flask(__name__, static_folder='build', static_url_path="")

# @app.route('/api/time')
# def get_current_time():
#     return {'time': time.time()}

@app.route("/api/hello", methods=["GET", "POST"])
def hello_world():
    if request.method == "GET":
        return jsonify(message="Hello, World!")
    elif request.method == "POST":
        data = request.get_json()
        if data and "name" in data:
            return jsonify(message=f"Hello, {data['name']}!")
        return jsonify(message="Hello, World!")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run()