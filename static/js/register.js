var state=new Object();
state.email=false;
state.password=false;
state.name=false;
var filetype="";
var filecontent;

$(document).ready(function(){
    namespace = '/register'; // change to an empty string to use the global namespace

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

    socket.on('email_check_response', function(msg) {
        console.log(msg.data);
        if(msg.data=="extinct")
        {
            $('#email_remind').html('this email has been registered')
            .css("color","red");
        }
        else if(msg.data=="pass")
        {
            $('#email_remind').html('pass')
            .css("color","green");
            state.email=true;
        }
    });

    socket.on('name_check_response', function(msg) {
        console.log(msg.data);
        if(msg.data=="extinct")
        {
            $('#name_remind').html('this name has been registered')
            .css("color","red");
        }
        else if(msg.data=="pass")
        {
            $('#name_remind').html('pass')
            .css("color","green");
            state.name=true;
        }
    });

    socket.on('signin_response', function(msg) {
        console.log(msg.data);
        if(msg.data=="pass")
        {
            sessionStorage.name=msg.name;
            sessionStorage.portrait=msg.portrait;
            location.href="/chat"
        }
    });

    //检测输入的正确性
    //邮箱
    $('#inputEmail').blur(function(){
        var content=$(this).val();
        var at_check=content.split('@');
        //console.log(at_check.length);
        if((content.length)==0)
        {
            $('#email_remind').html('please input your email address')
            .css("color","red");
        }
        else if((at_check.length)!=2)
        {
            $('#email_remind').html('email address format is wrong')
            .css("color","red");
        }
        else
        {
            socket.emit('email_check',{email: content});
        } 
    });
    //名字
    $('#inputName').blur(function(){
        var content=$(this).val();
        var confine=/[^\u4E00-\u9FA5A-Za-z0-9]/g; //检测只有中文英文数字的正则表达式
        //console.log(confine.test(content));
        if((content.length)==0)
        {
            $('#name_remind').html('please input your name')
            .css("color","red");
        }
        else if((content.length)>10)
        {
            $('#name_remind').html('name\'s length should shorter than 10')
            .css("color","red");
        }
        else if(confine.test(content))
        {
            $('#name_remind').html('name should only contain Chinese, English and number')
            .css("color","red");
        }
        else
        {
            socket.emit('name_check',{name: content});
        } 
    });
    //密码
    $('#inputPassword').blur(function(){
        var content=$(this).val();
        if((content.length)==0)
        {
            $('#password_remind').html('please input your password')
            .css("color","red");
        }
        else if((content.length)<6)
        {
            $('#password_remind').html('password\'s length should longer than 6')
            .css("color","red");
        }
        else if((content.length)>30)
        {
            $('#password_remind').html('password\'s length should shorter than 30')
            .css("color","red");
        }
        else
        {
            $('#password_remind').html('pass')
            .css("color","green");
            state.password=true;
        }
    });
    //提交
    $('form#signin').submit(function(event){
        var val=$('input:radio[name="optionsRadios"]:checked').val();
        console.log(val.toString());
        socket.emit('signin',{email: $('#inputEmail').val(), password: $('#inputPassword').val(), name: $('#inputName').val(), port: val});
    });
});