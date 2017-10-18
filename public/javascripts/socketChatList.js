$(function(){

	try{

		var socket = io('/chats', {
      multiplex: false
    });


		socket.on('singleChatListResult',function (data) {
			$('#singleChat').html(data.response);
			socket.emit('isSingleChatRead');
		});

		if ($('#singleChat').length>0) {
			socket.emit('singleChatListRender',{});
		}

		socket.on('showUnreadSingleChat', function (data) {
			for (var i=0; i<data.id.length; i++) {
				$('.singleUser[data-user-id="'+data.id[i]+'"]').css({"font-weight":"bold","font-size":"16px", "color":"blue"});
			}
		});


		socket.on('groupChatListResult',function (data) {
			$('#groupChat').html(data.response);
			socket.emit('isGroupChatRead');
		});

		if ($('#groupChat').length) {
			socket.emit('groupChatListRender',{});
		}

		socket.on('showUnreadGroupChat', function (data) {
			for (var i=0; i<data.id.length; i++) {
				$('.groupUser[data-chat-id="'+data.id[i]+'"]').css({"font-weight":"bold","font-size":"16px", "color":"blue"});
			}
		});



		$('body').on('click','.everyoneMsgSend',function () {
			var tmp = $('#everyoneMsg').val();
			var single = $('#toSingle')[0].checked;
			var group = $('#toGroup')[0].checked;

			if (tmp!='') {
				socket.emit('sendEveryoneMsg',{'msg':tmp, 'single': single, 'group':group});
				$('#everyoneMsg').val('');
				$('input[type=checkbox]').each(function() {
					 this.checked = false;
				});
				//window.location.reload();
			}
			return false;
		});

		socket.on('returnSendMsgResult', function (data) {
			$('#messages').append('<li><p class="content"><b>'+data.user+'</b>: '+data.msg+'</p><p class="date">'+data.created+'</p></li>');
			$('#messages').scrollTop($(document).height());
		});

		socket.on('returnSendEveryoneMsgResult', function(data){
			$('.info').append('<p>'+data.info+'</p>').fadeOut(3000);
		});


		$('body').on('click','.deleteSingleChat',function () {
			var tmp = $(this).attr('data-chat-id');
			if (confirm("Na pewno chcesz usunąć czat?") == true) {
				socket.emit('deleteSingleChat', {'id':tmp});
			}
			return false;
		});

		socket.on('hideDeletedSingleChat', function(data) {
			var dataVal = $.map(data, function(value, index) {
				return [value];
			});
			$("[data-chat-id="+dataVal+"]").parent().remove();
		});


		$('body').on('click','.deleteGroupChat',function () {
			var tmp = $(this).attr('data-chat-id');
			if (confirm("Na pewno chcesz usunąć czat?") == true) {
				socket.emit('deleteGroupChat', {'id':tmp});
			}
			return false;
		});

		socket.on('hideDeletedGroupChat', function(data) {
			var dataVal = $.map(data, function(value, index) {
				return [value];
			});
			$("[data-chat-id="+dataVal+"]").parent().remove();
		});


		$('#singleChat').on('click','a',function () {
			var tmp = $(this).attr('data-chat-id');
			socket.emit('setChatRead', {'id':tmp});
		});

		$('#groupChat').on('click','a',function () {
			var tmp = $(this).attr('data-chat-id');
			socket.emit('setChatRead', {'id':tmp});
		});

		$('#groupChat').on('click','a',function () {
			var tmp = $(this).text().trim();
			if (tmp.indexOf(',') > -1) {
				socket.emit('areYourFriends', {'usernames':tmp});
			}
		});

		socket.on('areYourFriendsResult', function(data) {
			location.reload();
			alert('NIE MOŻESZ WEJŚĆ W KONWERSACJĘ !\nNIE MASZ WSZYSTKICH JEJ CZŁONKÓW W ZNAJOMYCH !');
		});


// powiadomienia

		socket.on('returnNotificationResult', function (data) {
			$('#messageNotification').css("background-color","yellow");
		});


	}catch(e){
		console.log(e);
	}
});
