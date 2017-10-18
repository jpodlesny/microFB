$(function(){

	try{

		var where = $('#chatToId').attr('data-user-id');
		var myId = $('#getUserId').attr('data-user-id');

		var socket = io('/chat', {
			multiplex: false
		});


		socket.emit('showChat',{'id':where,'myId':myId});

		socket.on('returShowChat', function (data) {
			$('#chatToId').html(data.view);
			socket.emit('joinToRoom',{'others':where, 'me':myId});
		});

		$('body').on('click','#sendChatMsg',function () {
			var tmp = $('#msg').val();
			if (tmp!='') {
				socket.emit('sendMsg',{'msg':tmp, 'id': where, 'myId':myId});
				$('#msg').val('');
			}
			return false;
		});

		socket.on('returnSendMsgResult', function (data) {
			$('#messages').append('<li><p class="content"><b>'+data.user+'</b>: '+data.msg+'</p><p class="date">'+data.created+'</p></li>');
			$('#messages').scrollTop($(document).height());
		});


//powiadomienia

		socket.on('returnNotificationResult', function (data) {
			$('#messageNotification').css("background-color","yellow");
		});


	}catch(e){
		console.log(e);
	}
});
