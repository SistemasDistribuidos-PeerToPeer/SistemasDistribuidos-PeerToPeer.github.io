peerapp = (function() {
    'use strict';

    console.log("Peer client started");

    var PEER_SERVER = 'peer-servidor.herokuapp.com';
    var PORT = 443;
    var connectedPeers = {};
    var myPeerID = generateRandomID(4);
    var peer;
    var peerIdAlreadyTakenCount = 3;

    // Compatibility shim
    navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

    // Connect to server
    function connectToServerWithId(peerId) {
        myPeerID = peerId || myPeerID;
        myPeerID = myPeerID.toLowerCase();
        if(peer && peer.disconnected == false) {
            peer.disconnect()
        }
        peer = new Peer(myPeerID, { host: PEER_SERVER, port: PORT, path: '/', secure: true });  
        peerCallbacks(peer);
    }    
    // var peer = new Peer({ host: 'my-peer.herokuapp.com', port: '443', path: '/', secure: true });
    // connectToServerWithId(myPeerID);
    console.log(peer)

    // initializeLocalMedia({'audio': true, 'video': true});

    // Generate random ID
    function generateRandomID(length) {
        var chars = '123456789abcdefghijklmnopqrstuvwxyz'
        var result = '';
        for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
        return result;
    }

    // canal de dados
    // Manipular objetos de conexão de texto
    function connect(c) {
        console.log(c)
        // Handle a chat connection.
        if (c.label === 'chat') {
            // c.peer
            myapp.createChatWindow(c.peer)

            c.on('data', function(data) {
                console.log(c.peer + ' : ' + data);
                // Append data to chat history
                myapp.appendHistory(c.peer, data)   
            });

            c.on('close', function() {
                delete connectedPeers[c.peer];
                myapp.closeChatWindow(c.peer)
            });
            connectedPeers[c.peer] = c;
        } else if (c.label === 'file') {
            c.on('data', function(data) {
                // If we're getting a file, create a URL for it.
                if (data.constructor === ArrayBuffer) {
                    var dataView = new Uint8Array(data);
                    var dataBlob = new Blob([dataView]);
                    var url = window.URL.createObjectURL(dataBlob);
                    // $('#' + c.peer).find('.messages').append('<div><span class="file">' +
                    //     c.peer + ' has sent you a <a target="_blank" href="' + url + '">file</a>.</span></div>');
                }
            });
        }
    }

    // // Handle Audio and Video Calls
    // function callConnect(call) {
        
    //     // Hang up on an existing call if present
    //     if (window.existingCall) {
    //         window.existingCall.close();
    //     }

    //     // Wait for stream on the call, then set peer video display
    //     call.on('stream', function(stream) {
    //         myapp.setTheirVideo(stream)
    //     });

    //     // UI stuff
    //     window.existingCall = call;
    //     call.on('close', function() {
    //         console.log("Call Ending")
    //         myapp.closeVideoCall()
    //     });
    // }

    function peerCallbacks(peer) {
        peer.on('open', function(id) {
            console.log('My peer ID is: ' + id);
            console.log(new Date());
            myapp.setPeerId(id);
            fetchOnlinePeers();
        });

        peer.on('connection', connect);

        // peer.on('call', function(call) {
        //     console.log("Receiving a call")
        //     console.log(call)
        //     // New call requests from users
        //     // Ask Confirm before accepting call
        //     // if(window.incomingCall) {
        //     //     window.incomingCall.answer()
        //     //     setTimeout(function () {
        //     //         window.incomingCall.close();
        //     //         window.incomingCall = call
        //     //         myapp.showIncomingCall(call.peer);
        //     //     }, 1000)
        //     // } else {
        //     if(window.existingCall) {
        //         // If already in a call, rejecting the new calls
        //         rejectIncomingCall(call)
        //     } else {
        //         window.incomingCall = call
        //         myapp.showIncomingCall(call.peer, call.options.metadata);
        //     }
        //     // }
        // });

        peer.on('close', function(conn) {
            // New connection requests from users
            console.log("Peer connection closed");
        });

        peer.on('disconnected', function(conn) {
            console.log("Peer connection disconnected : " + conn);
            console.log(new Date());
            if(conn != myPeerID) {
                return
            }            
            setTimeout(function () {
                connectToServerWithId();
            }, 5000);
            
            // peer.reconnect()
        });

        peer.on('error', function(err) {
            console.log(new Date());
            console.log("Peer connection error:")
            console.log(err)
            if("unavailable-id" == err.type) {
                // ID Already taken, so assigning random ID after 3 attempts
                peerIdAlreadyTakenCount++;
                if(peerIdAlreadyTakenCount >= 3) {
                    peerIdAlreadyTakenCount = 0;
                    myPeerID = generateRandomID(4);
                }
            } else if ("peer-unavailable" == err.type) {
                myapp.showError(err.message)
            }
        });
    };

    function connectToId(id) {
        if(!id || peer.disconnected)
            return;
        var requestedPeer = id;
        console.log("aqui")
        if (!connectedPeers[requestedPeer]) {
            // Create 2 connections, one labelled chat and another labelled file.
            var c = peer.connect(requestedPeer, {
                label: 'chat',
                serialization: 'none',
                metadata: { message: 'hi i want to chat with you!' }
            });
            c.on('open', function() {
                connect(c);
            });
            c.on('error', function(err) { alert(err); });

        }
    }

    function sendMessage(peerId, msgText) {
        
        if(connectedPeers[peerId]) {
            var conn = connectedPeers[peerId]
            conn.send(msgText)
        }
    }

    function close(id){
        delete connectedPeers[id];
        myapp.closeChatWindow(id)
    }

    function closeConnection(id) {
        var conns = peer.connections[peerId];
        if(connectedPeers[peerId]) {
            var conn = connectedPeers[peerId]
            conn.send(msgText)
        }
    }

    // Make sure things clean up properly.
    window.onunload = window.onbeforeunload = function(e) {
        if (!!peer && !peer.destroyed) {
            peer.destroy();
        }
    };

    function fetchOnlinePeers() {
        $.ajax("https://" + PEER_SERVER + "/peerjs/" + myPeerID + "/onlineusers")
        .done(function( data ) {
            // console.log(data);
            if(data.msg == 'Success') {
                data.users.splice(data.users.indexOf(myPeerID), 1)
                myapp.updateOnlieUsers(data.users)
            }
        });
    }

    // Update Online users on every 5 seconds
    setInterval(function () {
        fetchOnlinePeers()
    }, 1000)

    return {
        close:close,
        // makeCall : makeCall,
        // endCall : endCall,
        sendMessage : sendMessage,
        connectToId : connectToId,
        connectToServerWithId : connectToServerWithId,
        // acceptIncomingCall : acceptIncomingCall,
        // rejectIncomingCall : rejectIncomingCall,
        // muteAudio : muteAudio,
        // muteVideo : muteVideo
    }
})();
