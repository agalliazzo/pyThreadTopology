import logging
import threading
import flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.model import Model
from openthread_cli_interface import OTCommunicator
import json
from json import JSONEncoder
from typing import Any

class myEncoder(JSONEncoder):
    def default(self, o: Any) -> str:
        if isinstance(o, dict):
            return o
        if isinstance(o, bytearray or bytes):
            return o.hex()
        return o.__dict__

app = flask.Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

_socket = SocketIO(app, async_mode=None)

db = SQLAlchemy()
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///tnd.db"
db.init_app(app)

comm = OTCommunicator()


class BoardTypes(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String, unique=False, nullable=True)
    image = db.Column(db.String, unique=True, nullable=False)


@app.route('/')
def homepage() -> flask.Response or str:
    return flask.render_template('index.html', ports=OTCommunicator.get_port_list())


@app.route('/static/<path:path>')
def send_report(path) -> flask.Response:
    return flask.send_from_directory('static', path)


@app.route('/upload_floor')
def upload_floor() -> flask.Response:
    pass


@app.route('/connect/<string:port>')
def connect(port: str) -> str:
    comm.open(port)
    comm.initialize_communication(0x1234, '00112233445566778899aabbccddeeff', 26, False)
    return scan()


@app.route('/disconnect')
def disconnect() -> str:
    comm.close()
    return ''


@app.route('/scan')
def scan() -> str:
    comm.query_routers()
    comm.build_nodes_from_tlvs()
    return json.dumps(comm.nodes, cls=myEncoder)


@app.route('/scan_results')
def get_scan_results():
    return json.dumps(comm.nodes, cls=myEncoder)


@app.route('/update_node/<int:node_id>', methods=['POST'])
def update_node(node_id):
    data = json.loads(flask.request.form['json'])
    print(data)
    for ip, node in comm.nodes.items():
        if node.router_id != node_id:
            continue
        node.label = data['Label']

    return ''
    pass

def run(blocking: bool = True) -> None:
    if blocking:
        _socket.run(app, port=5001, host='0.0.0.0', allow_unsafe_werkzeug=True)
    else:
        threading.Thread(target=_socket.run, args=[app], kwargs={"port": 5001, "host": '0.0.0.0'}).start()
