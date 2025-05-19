from flask import Blueprint, request, jsonify
import boto3
import uuid

user_bp = Blueprint("user", __name__)

# create dynamodb resource
dynamodb = boto3.resource("dynamodb", region_name="us-east-1")
table = dynamodb.Table("evcsf_users")

@user_bp.route("/signup", methods=["POST"])
def signup():
	data = request.json
	email = data.get("email")
	password = data.get("password")

	if not email or not password:
		return jsonify({"error": "Email and password required"}), 400

    # simple user id methodology, w3 schools
	user_id = str(uuid.uuid4())

	table.put_item(Item={
		"user_id": user_id,
		"email": email,
		"password": password,
		"preferences": {}
	})

	return jsonify({"message": "User created succesfully", "user_id": user_id})

@user_bp.route("/login", methods=["POST"])
def login():
	data = request.json
	email = data.get("email")
	password = data.get("password")

    # looks through db for matching email, scan returns user's table
	response = table.scan(
		FilterExpression="email = :e",
		ExpressionAttributeValues={":e": email}
	)

    # rudementary way of login
	items = response.get("Items", [])
	if not items or items[0]["password"] != password:
		return jsonify({"error": "Invalid login"}), 401

	return jsonify({"message": "Login successful", "user_id": items[0]["user_id"]})

@user_bp.route("/preferences/<user_id>", methods=["GET"])
def get_preferences(user_id):
    response = table.get_item(Key={"user_id": user_id})
    user = response.get("Item") # gets user data (settings and preferences)

    if not user:
        return jsonify({"error": "User not found"}), 404

    # returns user data with jsonify
    return jsonify({
        "email": user.get("email"),
        "name": user.get("name", ""),
        "preferences": user.get("preferences", {})
    })

@user_bp.route("/preferences/<user_id>", methods=["POST"])
def update_preferences(user_id):
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")
    preferences = data.get("preferences", {})

    update_expression = "SET "
    expression_attrs = {} # vector for storing procedure for dynamboDB
    updates = [] # table for storing updates

    if name:
        updates.append("name = :n")
        expression_attrs[":n"] = name
    if email:
        updates.append("email = :e")
        expression_attrs[":e"] = email
    if password:
        updates.append("password = :p")
        expression_attrs[":p"] = password
    if preferences:
        updates.append("preferences = :pref")
        expression_attrs[":pref"] = preferences

    if not updates:
        return jsonify({"error": "No updates provided"}), 400

    # formatting for dynamodb requests
    update_expression += ", ".join(updates)

    # updates table in db with new user settings and preferences
    table.update_item(
        Key={"user_id": user_id},
        UpdateExpression=update_expression,
        ExpressionAttributeValues=expression_attrs
    )

    return jsonify({"message": "Preferences updated successfully"})