$( document ).ready(function(){
	try{
		//var socket = io.connect();
		var socket = io('/searchBar', {
        multiplex: false
    });

		socket.on('returnSearch',function (data) {
			$('#searchFriendsList').html(data.view);
		});


		$('body').on('input propertychange paste','#searchFriends',function() {
			var tmp = $(this).val();
			if(tmp!=""){
				socket.emit('sendSearch',{'content':tmp});
			} else {
				$('#searchFriendsList').css({'display':'none'});
			}

		});

		$('body').on('focus','#searchFriends',function () {
			$('#searchFriendsList').css({'display':'block'});
		});

		$('body').on('focusout','#searchFriends',function () {
			setTimeout(function () {
				$('#searchFriendsList').css({'display':'none'});
			},100);
		});

	}catch(e){
		console.log(e);
	}
});
