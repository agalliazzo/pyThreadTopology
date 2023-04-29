import logging
import threading
import flask
from flask_socketio import SocketIO
from flask_sqlalchemy import SQLAlchemy
from flask_sqlalchemy.model import Model

app = flask.Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

_socket = SocketIO(app, async_mode=None)

db = SQLAlchemy()
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///tnd.db"
db.init_app(app)


class BoardTypes(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    label = db.Column(db.String, unique=False, nullablle=True)
    image = db.Column(db.String, unique=True, nullable=False)



@app.route('/')
def homepage():
    return flask.render_template('index.html')


@app.route('/static/<path:path>')
def send_report(path):
    return flask.send_from_directory('static', path)


@app.route('/upload_floor')
def upload_floor():
    pass


def run(blocking = True):
    if blocking:
        _socket.run(app, port=5001, host='0.0.0.0', allow_unsafe_werkzeug=True)
    else:
        threading.Thread(target=_socket.run, args=[app], kwargs={"port": 5001, "host": '0.0.0.0'}).start()
