from flask import Flask, jsonify, request
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

app = Flask(__name__)
Base = declarative_base()


class OrderService:
    """Business logic for orders"""

    def get_all(self):
        return []

    def create(self, data):
        return {"id": 1}


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True)
    status = Column(String(50))


@app.route('/orders', methods=['GET'])
def get_orders():
    return jsonify([])


@app.route('/orders', methods=['POST'])
def create_order():
    data = request.get_json()
    return jsonify({"id": 1}), 201


@app.route('/orders/<int:order_id>', methods=['DELETE'])
def delete_order(order_id):
    return '', 204
