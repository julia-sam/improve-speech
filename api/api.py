import time
from flask import Flask, send_from_directory

app = Flask(__name__, static_folder='build', static_url_path="")

@app.route('/api/time')
def get_current_time():
    return {'time': time.time()}

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react_app(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run()