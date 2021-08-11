# ChatServer
A Template ChatServer using socket.io, cluster, redis from private-messaging example in socket.io

## How to operate?

**in window**
1. Install redis-server in wsl
```
~$ sudo apt-get update
~$ sudo apt-get upgrade
~$ sudo apt-get install redis-server
~$ redis-server -v
```

2. Start
```
~$ sudo service redis-server start
~$ redis-cli
127.0.0.1:6379> exit
~$
```

3. Open Two Terminals

4. run socket.io server & client server
```
cd client
npm install 
npm run serve
```

```
cd server
npm install
npm start
```