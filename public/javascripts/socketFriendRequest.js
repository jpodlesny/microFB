$(function(){

	try{


		var where = $('#getUserId').attr('data-user-id');

		var socket = io('/friendRequest', {
            multiplex: false
    });

		if (where !== undefined) {
			socket.emit('friendRequestRender',{'id':where});
		}

		//wysylanie zaproszen
		socket.on('returnFriendRequestResult',function (data) {
			$('#getUserId').html(data.response);
		});

		$('body').on('click','#sendFriendRequests',function() {
			socket.emit('sendFriendRequest',{'id':where});
			return false;
		});



		$('body').on('click','.acceptInvitation',function() {
			var tmp = $(this).attr('data-user-id');
			socket.emit('acceptInvitation',{'id':tmp});
			return false;
		});

		$('body').on('click','.removeInvitation',function() {
			var tmp = $(this).attr('data-user-id');
			socket.emit('removeInvitation',{'id':tmp});
			return false;
		});

		$('body').on('click','.deleteFriend',function() {
			var tmp = $(this).attr('data-user-id');
			if (confirm("Na pewno chcesz usunąć znajomego?") == true) {
					socket.emit('removeFriend',{'id':tmp});
			}
			return false;
		});

		socket.on('acceptInvitationResult',function (data) {
			$('#receiveInvitation').html(data.response);
			var accepts = document.getElementsByClassName('acceptInvitation');
			if (!accepts.length) {
				$('#friendNotification').css("background-color","#EBEFED");
			}
		});

		socket.on('removeInvitationResult',function (data) {
			$('#sentInvitation').html(data.response);
		});

		socket.on('friendsResult',function (data) {
			$('#friends').html(data.response);
		});

		if ($('#friends').length) {
			socket.emit('friendsRequestsRender',{});
		}

		if ($('#receiveInvitation').length) {
			socket.emit('toMeRequestsRender',{});
		}

		if ($('#sentInvitation').length) {
			socket.emit('sentToRequestsRender',{});
		}

		socket.on('changeObservFriendResult',function (data) {
			$('.stopFollow[data-user-id="'+data.id+'"]').text(data.response);
		});

		$('body').on('click','.stopFollow',function () {
			var tmp = $(this).attr('data-user-id');
			socket.emit('stopFollow',{'id':tmp});
			return false;
		});

		//czat grupowy
		$('body').on('click','.btnStartGroupChat',function() {
			var arr = [];
			var inputEl = document.getElementsByClassName('selectUser');
			for (i=0; i<inputEl.length; i++) {
				if (inputEl[i].checked) {
					arr.push(inputEl[i].getAttribute('data-user-id'));
				}
			}
			if (arr.length>1) {
				socket.emit('areSelectedUsersFriends',{'id':arr});
			}
			return false;
		});

		socket.on('areSelectedUsersFriendsResult', function (data) {
				var ret = [];
				for (var d in data.id)
					ret.push(encodeURIComponent(data.id[d]));
				window.open("/chat/"+ret, "_self");
		});

		socket.on('areSelectedUsersFriendsResult2', function (data) {
			var inputEl = document.getElementsByClassName('selectUser');
			$('input[type=checkbox]').each(function() {
			   this.checked = false;
			});
			$('.info').append('<p>'+data.text+' nie ma/mają w znajomych wszystkich wybranych osób</p>');
			setTimeout(function(){
					$('p').remove();
			},3000);
		});


//powiadomienia, emitowanie

		socket.on('returnNotificationResult', function (data) {
			$('#friendNotification').css("background-color","yellow");
		});

		socket.on('removeAcceptInvitation', function (data) {
			$('.acceptInvitation[data-user-id="'+data.id+'"]').parent().parent().remove();
		});

		socket.on('removeRemoveInvitation', function (data) {
			$('.removeInvitation[data-user-id="'+data.id+'"]').parent().parent().remove();
		});

		socket.on('removeFriendPosition', function (data) {
			$('.deleteFriend[data-user-id="'+data.id+'"]').parent().parent().remove();
		});

		socket.on('showOnlineUser', function (data) {
			$(".isOnline[data-user-id="+data.id+"]").append('⚫');
		});

		socket.on('showOfflineUser', function (data) {
			$(".isOnline[data-user-id="+data.id+"]").empty();
		});

	}catch(e){
		console.log(e);
	}
});
