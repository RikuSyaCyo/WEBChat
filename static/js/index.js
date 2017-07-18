$(document).ready(function(){
    namespace = '/test'; // change to an empty string to use the global namespace

    // the socket.io documentation recommends sending an explicit package upon connection
    // this is specially important when using the global namespace
    var socket = io.connect('http://' + document.domain + ':' + location.port + namespace);

    //用于接收客户端发来的信息
    // event handler for server sent data
    // the data is displayed in the "Received" section of the page
    socket.on('my response', function(msg) {
        $('#log').append('<br>' + $('<div/>').text('Received #' + msg.count + ': ' + msg.data).html());
    });

    // event handler for new connections
    socket.on('connect', function() {
        socket.emit('my event', {data: 'I\'m connected!'});
    });

    socket.on('login response', function(msg){
    	if(msg.data == "login success")
    	{
            sessionStorage.name=msg.name;
            sessionStorage.portrait=msg.portrait;
    		location.href = "/chat"
    	}
    	else
    	{
    		var responce=d3.select("#responce")
    	              .html("login fail, please check your email and password")
    	              .style("color","rgb(255,0,0)")
    	              .style("font-size","13px");
    	} 	
    });

    // handlers for the different forms in the page
    // these send data to the server in a variety of ways
    $('form#login').submit(function(event){
    	socket.emit('login',{email: $('#inputEmail').val(), password: $('#inputPassword').val()})
    	return false;
    });
});
function register()
{
    location.href="/register"
}