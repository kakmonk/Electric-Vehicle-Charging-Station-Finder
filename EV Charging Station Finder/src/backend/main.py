from flask import Flask
from flask_cors import CORS # for react requests
from user_routes import user_bp

app = Flask(__name__)
CORS(app) 
app.register_blueprint(user_bp, url_prefix="/api")

@app.route("/")
def home():
	return {"message": "Backend running."}

if __name__ == "__main__":
	app.run(debug=True, host="0.0.0.0", port=5000)