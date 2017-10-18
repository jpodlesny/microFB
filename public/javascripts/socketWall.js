$(function(){

	try{

		var where = $('#whichUserThisWallIs').attr('data-user-id');

		var socket = io('/wall', {
      multiplex: false
    });

    var myWall = false;

    if ($('[data-user-myWall="true"]').length>0) { myWall=true; }

		socket.emit('getWall',{'id':where, 'myWall':myWall});

		socket.on('returnWall',function (data) {
			$('#whichUserThisWallIs').html(data.view);
		});


		$('body').on('click','#sendPostMsg',function() {
			var tmp = $('#postMsg').val();
			if(tmp != "") {
				socket.emit('sendPostMsg',{'data':tmp,'id':where,'share':false});
				$('#postMsg').val('');
			}
			return false;
		});

		socket.on('returnNewPost',function (data) {
			if ($('.emptyWall').length>0) {
				$('.emptyWall').html(data.view);
			}else{
				$(data.view).insertAfter('.post');
			}
		});


		$('body').on('click','.btn-like',function() {
			var tmp = $(this).parents('.posts').attr('data-post-id');
			if(tmp != '') {
				socket.emit('sendPostLike',{'id':tmp});
			}
			return false;
		});

		socket.on('returnPostLike',function (data) {
			var tmp = $('.posts[data-post-id="'+data.id+'"]');
			tmp.find('.numberOfLikes').text(data.amount);

			if (data.state === 1) {
				tmp.find('.textLike').text("Lubisz to");
			} else {
				tmp.find('.textLike').text("Polub");
			}
		});


		$('body').on('click','.btn-sharePost',function () {
			var tmp = $(this).parents('.posts').find('.postDescription').text().trim();
			var username = $(this).parents('.posts').find('.sharePostUsername').text().trim();
			socket.emit('sendPostMsg',{'data':tmp,'username':username, 'share':true});
			return false;
		});


		$('body').on('click','.btn-deletePost',function () {
			var tmp = $(this).parents('.posts').attr('data-post-id');
			if (tmp != "") {
				socket.emit('deletePost', {'id':tmp});
			}
			return false;
		});

		socket.on('hideDeletedPost', function(data) {
			var dataVal = $.map(data, function(value, index) {
				return [value];
			});
			$("[data-post-id="+dataVal+"]").remove();
		});

		socket.on('hideDeletePostDiv', function(data) {
			$('.posts[data-post-id='+data.id+']').find('.deletePost').remove();
		});


	}catch(e){
		console.log(e);
	}
});
