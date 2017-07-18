var username=sessionStorage.name;
var portrait=sessionStorage.portrait;
var friend_list=new Object();
var friend=new Object();
var room_id=new Object();
var t; //计时器
var socket;

$(document).ready(function(){
    //console.log(sessionStorage.name);
    d3.select("#username")
      .html(username);
    d3.select("#portrait")
      .attr("src","static/pic/"+portrait+".jpg");
    namespace = '/chatpage'; // change to an empty string to use the global namespace

    // the socket.io documentation recommends sending an explicit package upon connection
    // this is specially important when using the global namespace
    socket = io.connect('http://' + document.domain + ':' + location.port + namespace);

    //用于接收客户端发来的信息
    // event handler for server sent data
    // the data is displayed in the "Received" section of the page
    socket.on('logout_response', function(msg) {
        console.log(msg);
        if(msg.data=="pass")
        {
            location.href="./"
        }
    });

    // event handler for new connections
    socket.on('connect', function() {
        socket.emit('my event', {data: 'I\'m connected!'});
    });

    socket.on('friend_response', function(msg) {
        console.log(msg.data);
        d3.select("#friendlist")
          .remove();
        d3.select("#listcontent")
          .append("div")
          .attr("id","friendlist")
          .attr("class","list-group")
          .append("div")
          .attr("id","my_friends")
          .append("a")
          .attr("class","list-group-item list-group-item-info")
          .html("my friends");
        //friend_list=new Object();
        if(msg.data.length!=0)
        {
            console.log("draw");
            for(var p in msg.data)
            {
                if(friend_list.hasOwnProperty(msg.data[p][3]));
                else
                    friend_list[msg.data[p][3]]=true;
                console.log(friend_list);
            }
            for(var p in friend_list)
            {
                draw_list(p, socket, msg);
            }
            for(var p in msg.data)
            {
                draw_friend(friend, msg.data[p][3], msg.data[p][0], msg.data[p][2], msg.data[p][1], socket)
            }
        }
    });

    socket.on('iden_response', function(msg) {
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

    socket.on('join_response', function(msg) {
        console.log(msg);
    });
     socket.on('room_response', function(msg) {
        console.log(msg.data);
        console.log(msg.send_name);
        var rect=d3.select("#chatpanel")
             .append("div")
             .attr("class","inchat")
             .html(msg.data);
        if(msg.send_name==username)
        {
          rect.style("float","right")
              .style("background-color","#5bc0de");
        }
        d3.select("#chatpanel")
          .append("div")
          .style("clear","both");
    });

    socket.on('get_state_response',function(msg){
      //console.log(msg);
      for(var p in msg.data)
      {
        var state=d3.select("#"+msg.data[p][0])
                    .select(".state");
        if(msg.data[p][1]=="1")
          state.html("on-line");
        else
          state.html("off-line");
        
      }
    });

    //获取原始房间信息 先离开之前的房间 再加入新的房间
    socket.on('get_room_response',function(msg){
      console.log(msg.name);
      if(msg.room=="none")
      {
        socket.emit('join', {room: room_id[msg.name], name: username});
      }
      else
      {
        socket.emit('leave',{room: msg.room});
        socket.emit('join',{room: room_id[msg.name], name: username});
      }
    });

    socket.on('get_message_response',function(msg){
      for(var p in msg.data)
      {
        d3.select("#chatpanel")
          .append("div")
          .attr("class","inchat")
          .html(msg.data[p]);
        d3.select("#chatpanel")
          .append("div")
          .style("clear","both");
      }
    });

    socket.on('add_friend_response',function(msg){
      if(msg.data=="false")
      {
        alert("please check the name");
      }
    })

    socket.on('insend_response',function(msg){
      var friend_name=d3.select("#title").html();
      console.log(msg.room);
      if(msg.room!=room_id[friend_name])
      {
        console.log("off-line");
        socket.emit('send_message',{from:username, to:friend_name, data:$('#message').val()});
      }
      else
      {
        socket.emit('room event', {room: room_id[friend_name], data: $('#message').val(), send_name: username});
        $('#message').val("");
      }
    });

    socket.on('send_message_response',function(msg){
      if(msg.data=="pass")
      {
        d3.select("#chatpanel")
          .append("div")
          .attr("class","inchat")
          .html($('#message').val())
          .style("float","right")
          .style("background-color","#5bc0de")
          .style("clear","both");
        d3.select("#chatpanel")
          .append("div")
          .style("clear","both");
        $('#message').val("");
      }
      else
      {
        console.log("wrong");
        $('#message').val("");
      }
    });

    //获取好友信息
    socket.emit('friend_info',{name: username});
    $('#logout').click(function(){
        console.log("logout");
        socket.emit('logout',{name: username});
    });
    
    //Send
    $('#send').click(function(){
        var friend_name=d3.select("#title").html();
        socket.emit('get_room_insend',{name:friend_name, type: "send"});
    });

    
    //添加好友
    $('#friend_send').click(function(){
      socket.emit('add_friend',{friend_name:$('#friend_input').val(), name: username});
    })

    //添加列表
    $('#list_send').click(function(){
      draw_list($('#list_input').val(), socket, null);
      friend_list[$('#list_input').val()]=true;
      socket.emit("add_list",{name:username});
    })

    //获取用户状态信息
    setInterval("get_state()",5000);
});
function get_state()
{
  socket.emit('get_state',{name:username});
}
function draw_list(p, socket, msg)
{
  if(p=="my friends")
  {
      friend[p]=d3.select("#my_friends")
  }
  else
  {
      var listname=p.replace(/\s+/g,'_');
      var list_info=new Array();
      list_info[0]=p;
      list_info[1]=listname;
      friend[p]=d3.select("#friendlist")
               .append("div")
               .attr("id",listname);
      var single_friend=friend[p].append("a")
           .attr("class","list-group-item list-group-item-info")
           .html(p);
      single_friend.append("button")
           .attr("class","btn btn-xs btn-danger")
           .style("position","absolute")
           .style("left","265px")
           .html("delete")
           .datum(list_info)
           .on("click",function(d){
              // console.log(d);
              socket.emit('delete_list',{listname: d[0], name: username});
              d3.select("#"+d[1])
                .remove();
              if(msg==null) return;
              for(var j in msg.data)
              {
                  if(msg.data[j][3]==d[0])
                  {
                      msg.data[j][3]="my friends"
                      draw_friend(friend, msg.data[j][3], msg.data[j][0], msg.data[j][2], msg.data[j][1], socket);
                  }
              }
              delete friend_list[d[0]];
              console.log(friend_list);
              var menu=d3.selectAll(".dropdown-menu")
              menu.selectAll("li")
                  .remove();
              for(var i in friend_list)
              {
                  if(friend_list[i]!=d[0])
                      menu.append("li")
                          .append("a")
                          .attr("href","#")
                          .html(i);
              }
           });
  }
}
function draw_friend(friend, listname, portrait, friend_name, friend_state, socket)
{

    var list=friend[listname];
    var table=list.append("a")
                 .attr("class","list-group-item")
                 .attr("href","#")
                 .append("table")
                 .append("tbody")
                 .append("tr")
                 .attr("id",friend_name)
                 .on("click", function(){
                    d3.select("#title")
                      .html(friend_name);
                    d3.select("#chatpanel")
                      .selectAll("div")
                      .remove();
                    //获取离线信息
                    console.log("get message");
                    socket.emit('get_message',{name:username, from:friend_name});

                    if(username>friend_name)
                      room_id[friend_name]=username+friend_name;
                    else
                      room_id[friend_name]=friend_name+username;
                    socket.emit('get_room',{name: username, friend: friend_name, type: "get"});
                 });
    console.log(friend);
    var src="static/pic/"+portrait+'.jpg';
    table.append("td")
          .append("img")
          .attr("src",src)
          .style("width","60px");
    table.append("td")
          .style("width","20px");
    var name=table.append("td")
                    .style("width","70px");
    name.append("p")
         .html("name:");
    name.append("p")
        .html(friend_name);
    var state=table.append("td")
                    .style("width","80px");
    state.append("p")
         .html("state:");
    if(friend_state=="1")
        state.append("p")
             .attr("class","state")
             .html("on-line");
    else
        state.append("p")
             .attr("class","state")
             .html("off-line");
    var btn_group=table.append("td")
                       .style("width","100px")
                        .append("div")
                        .attr("class","btn-group");
    btn_group.append("button")
             .attr("class","btn btn-default dropdown-toggle")
             .attr("data-toggle","dropdown")
             .attr("aria-haspopup","true")
             .attr("aria-expanded","false")
             .html("moveto")
             .append("span")
             .attr("class","caret");
    var menu=btn_group.append("ul")
                      .attr("class","dropdown-menu")
                      .attr("id","menu_"+friend_name);
    for(var j in friend_list)
    {
        if(j!=listname)
        menu.append("li")
            .append("a")
            .attr("class",friend_name)
            .attr("href","#")
            .html(j)
            .datum(j)
            .on("click",function(d)
            {
                socket.emit('change_list',{name: friend_name, selfname: username, listname: d});
            });
    }
    table.append("td")
         .append("button")
         .attr("class","btn btn-default")
         .html("-")
         .on("click",function(){
          socket.emit('delete_friend',{name:friend_name, selfname:username});
         });
}
