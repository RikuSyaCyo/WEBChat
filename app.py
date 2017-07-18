#!/usr/bin/env python

# Set this variable to "threading", "eventlet" or "gevent" to test the
# different async modes, or leave it set to None for the application to choose
# the best option based on available packages.
async_mode = None

if async_mode is None:
    try:
        import eventlet
        async_mode = 'eventlet'
    except ImportError:
        pass

    if async_mode is None:
        try:
            from gevent import monkey
            async_mode = 'gevent'
        except ImportError:
            pass

    if async_mode is None:
        async_mode = 'threading'

    print('async_mode is ' + async_mode)

# monkey patching is necessary because this application uses a background
# thread
if async_mode == 'eventlet':
    import eventlet
    eventlet.monkey_patch()
elif async_mode == 'gevent':
    from gevent import monkey
    monkey.patch_all()

import os
import time
import sqlite3
from threading import Thread
from flask import *
from flask_socketio import SocketIO, emit, join_room, leave_room, \
    close_room, rooms, disconnect

app = Flask(__name__)
app.secret_key = 'riku_secret_key'
socketio = SocketIO(app, async_mode=async_mode)
thread = None


def load_user(user_id):
    return User.get(user_id)

def background_thread():
    """Example of how to send server generated events to clients."""
    count = 0
    while True:
        time.sleep(10)
        count += 1
        socketio.emit('my response',
                      {'data': 'Server generated event', 'count': count},
                      namespace='/test')

def database_connect(content):
    conn=sqlite3.connect("mydata.db")
    conn.text_factory=str
    c=conn.cursor()
    #print content
    c.execute(content)
    dbresult=c.fetchall()
    conn.commit()
    conn.close()
    return dbresult

@app.route('/')
def index():
    global thread
    if thread is None:
        thread = Thread(target=background_thread)
        thread.daemon = True
        thread.start()
    return render_template('index.html')
@app.route('/chat')
def chat():
    return render_template('chat_page.html')
@app.route('/register')
def register():
    return render_template('register.html')

@socketio.on('login', namespace='/test')
def test_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    content = 'select rowid, name, portrait from account where email="'+message['email']+'" and password="'+message['password']+'"'
    dbresult=database_connect(content)
    result=len(dbresult)
    if result == 0:
        emit('login response',
         {'data': 'login fail', 'count': session['receive_count']})
    else:
        # print session['name']
        emit('login response',
        {'data': 'login success', 'name': dbresult[0][1], 'portrait': dbresult[0][2], 'count': session['receive_count']})
        content = 'update account set state=1 where email="'+message['email']+'"'
        dbresult=database_connect(content)

@socketio.on('email_check', namespace='/register')
def register_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    content = 'select rowid from account where email="'+message['email']+'"'
    dbresult=database_connect(content)
    result=len(dbresult)
    print len(dbresult)
    if result == 0:
        emit('email_check_response',
         {'data': 'pass', 'count': session['receive_count']})
    else:
        emit('email_check_response',
        {'data': 'extinct', 'count': session['receive_count']})

@socketio.on('name_check', namespace='/register')
def register_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    content = 'select rowid from account where name="'+message['name']+'"'
    dbresult=database_connect(content)
    result=len(dbresult)
    print len(dbresult)
    if result == 0:
        emit('name_check_response',
         {'data': 'pass', 'count': session['receive_count']})
    else:
        emit('name_check_response',
        {'data': 'extinct', 'count': session['receive_count']})

@socketio.on('signin', namespace='/register')
def register_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    content = 'insert into account values("'+message['email']+'","'+message['name']+'","'+message['password']+'",'+message['port']+',1,"none")'
    dbresult=database_connect(content)
    content = 'create table '+message['name']+'_friend ( name varchar(10), list varchar(20))'
    dbresult=database_connect(content)
    result=len(dbresult)
    emit('signin_response', {'data': 'pass', 'name':message['name'], 'portrait': message['port'],'count': session['receive_count']})

@socketio.on('logout', namespace='/chatpage')
def chat_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    content='update account set state=0, room="none" where name="'+message['name']+'"'
    dbresult=database_connect(content)
    emit('logout_response', {'data': 'pass', 'count': session['receive_count']})

@socketio.on('friend_info', namespace='/chatpage')
def chat_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    tablename=message['name']+'_friend'
    content='select account.portrait, account.state, account.name,'+tablename+'.list from '+tablename+' inner join account on account.name='+tablename+".name"
    dbresult=database_connect(content)
    emit('friend_response', {'data': dbresult, 'count': session['receive_count']})

@socketio.on('delete_list', namespace='/chatpage')
def chat_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    tablename=message['name']+'_friend'
    content='update '+tablename+' set list= "my friends" where list = "'+message['listname']+'"'
    dbresult=database_connect(content)
    emit('delete_response', {'data': 'pass', 'count': session['receive_count']})

@socketio.on('change_list', namespace='/chatpage')
def chat_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    tablename=message['selfname']+'_friend'
    content='update '+tablename+' set list= "'+message['listname']+'" where name = "'+message['name']+'"'
    dbresult=database_connect(content)
    content='select account.portrait, account.state, account.name,'+tablename+'.list from '+tablename+' inner join account on account.name='+tablename+".name"
    dbresult=database_connect(content)
    emit('friend_response', {'data': dbresult, 'count': session['receive_count']})

@socketio.on('add_list', namespace='/chatpage')
def chat_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    tablename=message['name']+'_friend'
    content='select account.portrait, account.state, account.name,'+tablename+'.list from '+tablename+' inner join account on account.name='+tablename+".name"
    dbresult=database_connect(content)
    emit('friend_response', {'data': dbresult, 'count': session['receive_count']})

@socketio.on('add_friend', namespace='/chatpage')
def chat_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    content='select rowid from account where name="'+message['friend_name']+'"'
    dbresult=database_connect(content)
    result=len(dbresult)
    print len(dbresult)
    if result == 0:
        emit('add_friend_response',
         {'data': 'false', 'count': session['receive_count']})
    else:
        tablename=message['friend_name']+'_friend'
        content='insert into '+tablename+' values("'+message['name']+'","my friends")'
        dbresult=database_connect(content)
        tablename=message['name']+'_friend'
        content='insert into '+tablename+' values("'+message['friend_name']+'","my friends")'
        dbresult=database_connect(content)
        content='select account.portrait, account.state, account.name,'+tablename+'.list from '+tablename+' inner join account on account.name='+tablename+".name"
        dbresult=database_connect(content)
        emit('friend_response', {'data': dbresult, 'count': session['receive_count']})

@socketio.on('delete_friend', namespace='/chatpage')
def chat_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    print message
    tablename=message['name']+'_friend'
    content='delete from '+tablename+' where name = "'+message['selfname']+'"'
    dbresult=database_connect(content)
    tablename=message['selfname']+'_friend'
    content='delete from '+tablename+' where name = "'+message['name']+'"'
    dbresult=database_connect(content)
    content='select account.portrait, account.state, account.name,'+tablename+'.list from '+tablename+' inner join account on account.name='+tablename+".name"
    dbresult=database_connect(content)
    emit('friend_response', {'data': dbresult, 'count': session['receive_count']})

@socketio.on('join', namespace='/chatpage')
def join(message):
    print 'join ' + message['room']
    join_room(message['room'])
    content='update account set room = "'+message['room']+'" where name = "'+message['name']+'"'
    dbresult=database_connect(content)
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('join_response',
         {'data': 'In rooms: ' + ', '.join(rooms()),
          'count': session['receive_count']})


@socketio.on('leave', namespace='/chatpage')
def leave(message):
    print 'leave ' + message['room']
    leave_room(message['room'])
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my response',
         {'data': 'In rooms: ' + ', '.join(rooms()),
          'count': session['receive_count']})

@socketio.on('get_room', namespace='/chatpage')
def get_room(message):
    print message
    session['receive_count'] = session.get('receive_count', 0) + 1
    content='select room from account where name = "'+message['name']+'"'
    dbresult=database_connect(content)
    emit('get_room_response',
         {'room': dbresult[0][0],
          'name': message['friend'],
          'count': session['receive_count']})

@socketio.on('get_room_insend', namespace='/chatpage')
def get_room(message):
    print message
    session['receive_count'] = session.get('receive_count', 0) + 1
    content='select room from account where name = "'+message['name']+'"'
    dbresult=database_connect(content)
    emit('insend_response',
         {'room': dbresult[0][0],
          'count': session['receive_count']})

# @socketio.on('close room', namespace='/test')
# def close(message):
#     session['receive_count'] = session.get('receive_count', 0) + 1
#     emit('my response', {'data': 'Room ' + message['room'] + ' is closing.',
#                          'count': session['receive_count']},
#          room=message['room'])
#     close_room(message['room'])


@socketio.on('room event', namespace='/chatpage')
def room_event(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('room_response',
         {'data': message['data'], 'send_name':message['send_name'], 'count': session['receive_count']},
         room=message['room'])

@socketio.on('send_message', namespace='/chatpage')
def send_room_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    content='insert into message values("'+message['from']+'","'+message['to']+'","'+message['data']+'")'
    dbresult=database_connect(content)
    emit('send_message_response',
         {'data': 'pass','count': session['receive_count']})

@socketio.on('get_message', namespace='/chatpage')
def get_message(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    content='select content from message where to_name="'+message['name']+'" and from_name="'+message['from']+'"'
    dbresult=database_connect(content)
    sendData=dbresult
    content='delete from message where to_name="'+message['name']+'" and from_name="'+message['from']+'"'
    dbresult=database_connect(content)
    emit('get_message_response',
         {'data': sendData,'count': session['receive_count']})

@socketio.on('get_state', namespace='/chatpage')
def get_state(message):
    session['receive_count'] = session.get('receive_count', 0) + 1
    tablename=message['name']+'_friend'
    content='select account.name, account.state from '+tablename+' inner join account on account.name='+tablename+".name"
    dbresult=database_connect(content)
    emit('get_state_response',
         {'data': dbresult,'count': session['receive_count']})

@socketio.on('disconnect request', namespace='/test')
def disconnect_request():
    session['receive_count'] = session.get('receive_count', 0) + 1
    emit('my response',
         {'data': 'Disconnected!', 'count': session['receive_count']})
    disconnect()


@socketio.on('connect', namespace='/test')
def test_connect():
    emit('my response', {'data': 'Connected', 'count': 0})


@socketio.on('disconnect', namespace='/test')
def test_disconnect():
    print('Client disconnected', request.sid)

@app.route('/upload', methods=['POST'])
def upload():
    # conn=sqlite3.connect("mydata.db")
    # conn.text_factory=str
    # c=conn.cursor()
    # content = request.json;
    # print content['sql']
    # c.execute(content['sql'])
    # dbresult=c.fetchall()
    # conn.close()
    # file = request['name']
    # print file
    return jsonify(result= 'Received successfully!')

if __name__ == '__main__':
    app.secret_key='rikusecret'
    socketio.run(app, '0.0.0.0', debug=True)


