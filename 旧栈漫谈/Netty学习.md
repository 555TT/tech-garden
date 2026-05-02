# 1.Java NIO

Java的NIO一般说的是JDK1.4出的nio包下的api，N可以理解为非阻塞(non-block)IO或者新(new)IO。并且通过以下组件实现了对底层操作系统的IO多路复用的封装：

- `Channel`（通道）：替代传统 `InputStream`/`OutputStream`，支持非阻塞模式（如 `SocketChannel`、`ServerSocketChannel`）。

传统的文件IO如`InputStream`/`OutputStream`是将数据通道抽象成了stream，并且这个流要么是输入的要么是输出的，也就是只能是单向的；而nio包下的网络IO是将数据通道抽象成了channel，并且这个channel是双向的，其次还可以将channel设为非阻塞（`socketChannel.configureBlocking(false)`），这也是为什么一般称nio包下的IO叫NIO、非阻塞IO

- `Buffer`（缓冲区）：数据读写的中转容器。
- `Selector`（选择器）：基于IO多路复用的核心组件，用于监听多个通道的事件。**nio包下的IO对于传统文件IO的另一个改进：封装了底层操作系统的IO多路复用**。

## 1.1对阻塞IO的理解

何为阻塞？

以read操作为例，一次read操作的大致过程：用户线程调用channel.read后，cpu会切换至内核态由操作系统来完成对数据的读取，读取又分为两个阶段：等待数据阶段和复制数据阶段（将数据从内核空间复制到用户空间）

![image-20250503154148756](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250503154148756.png)

![image-20250503154226009](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250503154226009.png)

阻塞具体指的是当数据没有准备好，用户线程会一直阻塞在等待数据阶段。

Java中BIO的Server：

```java

        ByteBuffer buffer = ByteBuffer.allocate(16);
        // 1. 创建了服务器
        ServerSocketChannel ssc = ServerSocketChannel.open();

        // 2. 绑定监听端口
        ssc.bind(new InetSocketAddress(8080));

        // 3. 连接集合
        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            // 4. accept 建立与客户端连接， SocketChannel 用来与客户端之间通信
            log.debug("connecting...");
            SocketChannel sc = ssc.accept(); // 阻塞方法，线程停止运行
            log.debug("connected... {}", sc);
            channels.add(sc);
            for (SocketChannel channel : channels) {
                // 5. 接收客户端发送的数据
                log.debug("before read... {}", channel);
                channel.read(buffer); // 阻塞方法，线程停止运行
                buffer.flip();
                debugRead(buffer);
                buffer.clear();
                log.debug("after read...{}", channel);
            }
        }
```

accept会使线程阻塞，等待客户端连接。没法建立连接时，没有读取到数据时，都会被阻塞在这。

其次，从channel中read数据时也是阻塞的，客户端没有把数据准备好，也会一直阻塞在这。

如果一个客户端发送一个数据后，服务端read了这个数据，再发送一个数据，再发送的数据服务端是没办法接收到的，因为又被阻塞在了accept方法上，只有再新建一个客户端连接时走过accept的阻塞，再次遍历channels时才能读到。阻塞IO使用单线程时就只能这样，干一件事的时候没法干另一件事，**这是阻塞IO最大的问题**。

其次办法是使用多线程，每建立一个channel时，就new Thread一个线程去read这个channel上的数据，新线程里也是不断while(true)的去read。当然这里可以用线程池去优化，而不是每个channel都新建一个线程。

## 1.2对非阻塞IO的理解

何为非阻塞

![image-20250503154339859](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250503154339859.png)

非阻塞read一般在while(true)中调用，当数据没有准备好时，用户线程并不会阻塞住，而是直接返回。**复制数据也是会阻塞住的**。

Java中NIO的Server：

```java

        ByteBuffer buffer = ByteBuffer.allocate(16);
        ServerSocketChannel ssc = ServerSocketChannel.open();
		ssc.configureBlocking(false);//将accept设为非阻塞
        ssc.bind(new InetSocketAddress(8080));
        // 连接集合
        List<SocketChannel> channels = new ArrayList<>();
        while (true) {
            //accept 建立与客户端连接， SocketChannel 用来与客户端之间通信
            log.debug("connecting...");
            SocketChannel sc = ssc.accept();//非阻塞
            //if(sc!=null)
            sc.configureBlocking(false);
            log.debug("connected... {}", sc);
            channels.add(sc);
            for (SocketChannel channel : channels) {
                // 接收客户端发送的数据
                log.debug("before read... {}", channel);
                channel.read(buffer); //非阻塞方法，线程不会停止运行
                buffer.flip();
                debugRead(buffer);
                buffer.clear();
                log.debug("after read...{}", channel);
            }
        }
```

accept这是是非阻塞的，没有客户端连接，返回null。并且channel上的read()方法也可以设为非阻塞，如果read不到数据，就返回0。

从而就能实现**一个线程处理多个客户端连接**！而不用像前面那样对每个channel连接新开一个线程。这是非阻塞IO对阻塞IO的改进。但是这样的实现，在没有客户端连接时，线程会一直处于空转状态。

但是每次read调用都要从用户态切换至内核态，相对于阻塞IO并没有多大的性能提升。

## 1.3对IO多路复用的理解

通过nio包下的API实现的IO多路复用经典Demo：

```java
		Selector selector = Selector.open();
		//创建出server端的channel
        ServerSocketChannel serverChannel = ServerSocketChannel.open();
        serverChannel.configureBlocking(false);
        serverChannel.bind(new InetSocketAddress(8080));
        //将channel注册到这个selector上，并设置这个channel interest accept事件
        serverChannel.register(selector, SelectionKey.OP_ACCEPT);

        System.out.println("NIO服务器启动，监听端口：8080");

        while (true) {
            try {
                // 阻塞到所有事件上，不单单是accept
                selector.select();
                Set<SelectionKey> keys = selector.selectedKeys();
                Iterator<SelectionKey> iter = keys.iterator();

                while (iter.hasNext()) {
                    SelectionKey key = iter.next();
                    iter.remove();
 
                    if (key.isValid()) { // 检查key是否仍然有效
                        if (key.isAcceptable()) {
                            handleAccept(key, selector);
                        }

                        if (key.isReadable()) {
                            handleRead(key);
                        }
                    }
                }
            } catch (IOException e) {
                e.printStackTrace();
                // 可以选择继续运行或退出
            }
        }
```

事件的分类：

* accept：服务端接收到客户端的连接时触发的事件，对应channel的accept方法
* connect：客户端连接服务端时触发的事件
* read：可读事件，对应channel的read方法
* write：可写事件

我们创建ServerSocketChannel后，将这个channel注册到一个selector上，调用selector.select()，这个selector可以阻塞在**所有客户端连接上的所有事件上**，而不是只单单阻塞在某个事件（如accept）或某个客户端连接上。某个或某些事件就绪后，会得到这个事件的SelectionKey，selectionKey根据事件的类型也分为相对应的类型。可以通过这个selectionKey获取这个事件对应的channel，然后就可以在这个channel上进行accept或read了。accept到的客户端连接的channel也要注册到这个Selector上。

IO多路复用的优化点：通过**一个线程**中的**一个selector**，来管理多个客户端的channel的所有事件，而不是只单单阻塞在某个事件（如accept）或某个客户端连接上，从而**可以在不用创建多个线程也不用让线程一直空转的情况下实现一个线程处理多个客户端连接！**

api的具体其它细节：

1. 当获得的selectionKey对应的事件没有处理时，像下面这样

![image-20250425201933139](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250425201933139.png)

下次循环到selector.select()也不会阻塞，因为有一个还未处理的selectionKey。如果不想处理，也可以调用selectionKey的cannel方法，下次循环到selector.select()就会将该selectionKey判定为已处理过了。

2. 服务端的channel和accept到的客户端的channel到要设为非阻塞模式，selector只能工作在非阻塞模式下。因为Selector的核心作用是通过 单线程同时监控多个通道的事件（如可读、可写），从而实现高效的多路复用。若允许阻塞模式的 Channel注册，当某个通道的 I/O 操作（如 `channel.read()`）被调用时，若该通道处于阻塞模式，线程会被阻塞，导致无法继续处理其他通道的事件。

3. 处理完一个selectionKey，要把它从集合中删除。如果某次已经处理过了accept事件，没删除，下一次遍历到这个selectionKey时，会accept到的channel为null，再去channel.accept就会发生空指针。
4. **客户端正常断开时，服务端也会收到一个read事件，read到的结果是-1**。异常断开时，read会抛出IOException，要在catch块中处理这个异常。正常或异常断开的selectionKey都要cannel掉

具体selectot的实现，在linux下有select、poll、epoll的实现。

## 1.4对同步异步的理解

同步：线程自己去获取结果（一个线程）。异步：线程自己不去获取结果，而是由其它线程送结果（至少两个线程。我们在使用异步api时，都会写一个回调方法，这个回调方法不是立刻被调用的，而是由另外一个线程在结果已经就绪时调用的），以read操作为例，用户线程既不会阻塞在等待数据阶段也不会阻塞在复制数据阶段。

所以，上面的**阻塞IO、非阻塞IO、IO多路复用都是同步**的。**而且异步只能搭配非阻塞，异步阻塞没有任何意义**。

# 2.Netty

官方解释

Netty is an asynchronous event-driven network application framework for rapid development of maintainable high performance protocol servers & clients.

Netty 是一个异步的、基于事件驱动的网络应用框架，用于快速开发可维护、高性能的网络服务器和客户端。

这里的异步并不是指的的异步IO。

Netty在Java自己的NIO基础上做了封装和增强。底层也是基于 NIO搭配的selector 实现的多路复用。

## 2.1核心组件

### 2.1.1EventLoop

事件循环对象

EventLoop本质是一个单线程执行器（同时维护了一个 Selector），里面有 run 方法处理 Channel 上源源不断的 io 事件。

一个NioEventLoop内部维护了一个线程和一个任务队列。线程启动时会调用NioEventLoop的run方法来执行IO任务和非IO任务：

io任务：accept、connect、read、write事件等，由processSelectedKeys方法触发

非io任务：如register()、bing()等任务会被添加到taskQueue中，由runAllTasks方法触发

它的继承关系比较复杂

* 一条线是继承自 j.u.c.ScheduledExecutorService 因此包含了线程池中所有的方法
* 另一条线是继承自 netty 自己的 OrderedEventExecutor，
  * 提供了 boolean inEventLoop(Thread thread) 方法判断一个线程是否属于此 EventLoop
  * 提供了 parent 方法来看看自己属于哪个 EventLoopGroup

事件循环组

EventLoopGroup 是一组 EventLoop，Channel 一般会调用 EventLoopGroup 的 register 方法来绑定其中一个 EventLoop，**后续这个 Channel 上的 io 事件都由此 EventLoop 来处理**（保证了 io 事件处理时的线程安全）

* 继承自 netty 自己的 EventExecutorGroup
  * 实现了 Iterable 接口提供遍历 EventLoop 的能力
  * 另有 next 方法获取集合中下一个 EventLoop

### 2.1.2Channel

**bootStrap的bind、connect是异步的**

```java
ChannelFuture channelFuture = serverBootstrap.bind(9090);//异步
ChannelFuture channelFuture  = bootstrap.connect("127.0.0.1", 9090);//也是异步
```

调用bind方法会启动Netty程序，但是bind(客户端的connect也是)是异步的，即主线程并不会等待netty启动完毕，而是继续向下执行代码，具体的启动是由eventLoopGroup里的线程启动的。

channelFuture也是个future，所以就可以对channelFuture同步获取结果或者异步回调

同步获取：channelFuture.sync();

添加回调：

```java
channelFuture.addListener(future -> {
                if (future.isSuccess()) {
                    log.info("服务端启动成功");
                } else {
                    log.info("服务端启动失败");
                }
            });
//这里回调方法是由eventLoopGroup里的线程执行的
```

**channel的close是异步的**

```java
Channel channel = channelFuture.channel();
channel.close();//异步
```

具体的关闭也是由eventLoopGroup里的某个线程执行的

当我们要在channel关闭后释放一些资源（比如关闭eventLoopGroup，eventLoopGroup也是个线程池，主线程运行完后，不shutdown掉线程池，jvm也不会关闭，因为线程池里的线程又不是守护线程）等操作时，就要使用

```java
Channel channel = channelFuture.channel();
ChannelFuture closeFuture = channel.closeFuture();
```

得到了这个future后，就可以同步处理或者异步回调了。

```java
closeFuture.sync();
//或
closeFuture.addListener(new ChannelFutureListener() {
         @Override
         public void operationComplete(ChannelFuture future) throws Exception {
              log.debug("处理关闭之后的操作");
              group.shutdownGracefully();
          }
      });
//这里的回调方法也是由eventLoopGroup里的线程执行的
```

（体会 Netty中所有东西都是异步 的这句话）

### 2.1.3Future&Promise

在异步处理时，经常用到这两个接口

首先要说明 netty 中的 Future 与 jdk 中的 Future 同名，但是是两个接口，netty 的 Future 继承自 jdk 的 Future，而 Promise 又继承 netty Future 进行了扩展。

* jdk Future 只能同步等待任务结束（或成功、或失败）才能得到结果
* netty Future 可以同步等待任务结束得到结果，也可以异步方式得到结果，但都是要等任务结束
* netty Promise 不仅有 netty Future 的功能，而且脱离了任务独立存在，只作为两个线程间传递结果的容器。我们可以自己创建Promise，不像前面两个只能由其它api的返回值获取。

| 功能/名称    | jdk Future                     | netty Future                                                 | Promise      |
| ------------ | ------------------------------ | ------------------------------------------------------------ | ------------ |
| cancel       | 取消任务                       | -                                                            | -            |
| isCanceled   | 任务是否取消                   | -                                                            | -            |
| isDone       | 任务是否完成，不能区分成功失败 | -                                                            | -            |
| get          | 获取任务结果，阻塞等待         | -                                                            | -            |
| getNow       | -                              | 获取任务结果，非阻塞，还未产生结果时返回 null                | -            |
| await        | -                              | 等待任务结束，如果任务失败，不会抛异常，而是通过 isSuccess 判断 | -            |
| sync         | -                              | 等待任务结束，如果任务失败，抛出异常                         | -            |
| isSuccess    | -                              | 判断任务是否成功                                             | -            |
| cause        | -                              | 获取失败信息，非阻塞，如果没有失败，返回null                 | -            |
| addLinstener | -                              | 添加回调，异步接收结果                                       | -            |
| setSuccess   | -                              | -                                                            | 设置成功结果 |
| setFailure   | -                              | -                                                            | 设置失败结果 |

### 2.1.4Handler&Pipeline

ChannelHandler 用来处理 Channel 上的各种事件，分为入站、出站两种。所有 ChannelHandler 被连成一串，就是 Pipeline

* 入站处理器通常是 ChannelInboundHandlerAdapter 的子类，主要用来读取客户端数据，写回结果
* 出站处理器通常是 ChannelOutboundHandlerAdapter 的子类，主要对写回结果进行加工

handler链上的入站和出站

以服务端代码角度，在服务端里添加下面handler

```java
ChannelPipeline pipeline = ch.pipeline();
pipeline.addLast(new StringDecoder());//String解码器是一个入站handler
pipeline.addLast(new StringEncoder());//String编码器是一个出站handler
pipeline.addLast(new ChatServerHandler());//这个handler继承入站handler
```

入站

这个顺序组织好handler后就像下面这样(这里注意，除了我们自己添加的handler，首尾还有自带的head和tail，下面真实的顺序应该是head->解码handler->编码handler->业务handler->tail,addLast方法是在tail的前面添加)

![image-20250425164302806](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250425164302806.png)

客户端向服务端发数据，对服务端来说就是入站，先经过解码handler，而解码handler正好就是一个入站handler，于是channle上的二进制数据被解码为了字符串，然后经过编码handler，但编码handler是一个出站handler，所以不会执行该handler。

出站

![image-20250425165044670](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250425165044670.png)

服务端在业务handler中向客户端写数据时，对服务端来说就是出站，经过了编码handler，而编码handler正好是一个出站handler，于是字符串就会被编码为二进制数据。

以客户端代码角度，也是添加上面handler。

```java
ChannelPipeline pipeline = ch.pipeline();
pipeline.addLast(new StringDecoder());//String解码器是一个入站handler
pipeline.addLast(new StringEncoder());//String编码器是一个出站handler
pipeline.addLast(new 业务Handler());//这个handler继承入站handler
```



![image-20250425165713510](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250425165713510.png)

客户端向服务端写数据时，对客户端来说是出站，业务处理handler里写数据，经过了出站的编码handler，将字符串编码为了二进制。

### 2.1.5ByteBuf

#### 先来看原生nio包中的ByteBuffer

ByteBuffer的关键类图关系：

```tex
Buffer (抽象基类)
│
├── ByteBuffer (抽象类)
│   │
│   ├── HeapByteBuffer (堆内存实现)
│   │   ├── HeapByteBufferR (只读堆内存)
│   │
│   ├── DirectByteBuffer (直接内存实现)
│   │   ├── DirectByteBufferR (只读直接内存)
│   │
│   └── MappedByteBuffer (内存映射文件)
│       └── DirectByteBuffer (间接继承)
│
└── 其他类型Buffer (如 CharBuffer, IntBuffer 等)
```

堆内存实现的ByteBuffer和直接内存实现的ByteBuffer区别

* HeapByteBuffer
  - 内存分配在JVM堆（Heap）中，受JVM管理（垃圾回收机制影响）。
  - 底层是普通的Java数组（`byte[]`）。
  - 适合频繁创建和销毁的小对象，但可能引发GC压力。
* DirectByteBuffer
  - 内存通过`Unsafe.allocateMemory`直接分配在堆外（Native Memory），不受JVM堆管理。
  - 需要手动释放（通过`Cleaner`机制，或显式调用`DirectBuffer.cleaner().clean()`）。

所以HeapByteBuffer访问速度快，但和IO设备交互时需要额外一次拷贝（jvm内存和堆外内存之间的拷贝），因为操作系统无法直接访问jvm内存；DirectByteBuffer直接使用堆外内存，减少了额外拷贝，但分配和释放成本较高，访问速度略慢于堆内存

创建一个容量为16的ByteBuffer。

```java
ByteBuffer byteBuffer = ByteBuffer.allocate(16);//创建的是HeapByteBuffer
ByteBuffer byteBuffer = ByteBuffer.allocateDirect(16);//创建的是DirectByteBuffer
```

ByteBuffer使用细节

ByteBuffer 有以下重要属性

* capacity 容量
* position 读写的位置
* limit 读取限制或写入限制

ByteBuffer刚创建时，是这样

![image-20250508211246719](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250508211246719.png)

limit表示写入限制，容量就是最多能写的大小

写入了四个字节后，position就移动到了第四个位置

![image-20250508211413206](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250508211413206.png)

当想读取内容时，要调用**flip()**方法，flip方法的作用是将limit=当前position，position=0。也就是切换到了读模式，可以根据position（要读取的位置）和limit（读取限制）读取数据了，就像下面这样

![image-20250508211734185](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250508211734185.png)

读了四个字节后

![image-20250508211848069](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250508211848069.png)

这时，如果再想写数据，需要调用**clear()**方法，clear的作用是将position=0，limit=capacity。像下面这样

![image-20250508213530648](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250508213530648.png)

**此时，就能继续写数据了。如果不调用clear方法然后写数据，会因为position已经到了limit的限制，而写入失败，报错。那如果读取的时候不读取4个字节，只读2个字节，这时不调用clear然后写数据，就不会被limit限制了？是的，不会限制了，写入时也不会报错，但是这次写入覆盖了前面的写入！**

compact 方法，是把未读完的部分向前压缩，然后切换至写模式，像下面这样

![image-20250508213916899](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250508213916899.png)

向 buffer 写入数据

有两种办法

* 调用 channel 的 read 方法
* 调用 buffer 自己的 put 方法

```java
int readBytes = channel.read(buf);
```

和

```java
buf.put((byte)127);
```

从 buffer 读取数据

同样有两种办法

* 调用 channel 的 write 方法
* 调用 buffer 自己的 get 方法

```java
int writeBytes = channel.write(buf);
```

和

```java
byte b = buf.get();
```

get 方法会让 position 读指针向后走，如果想重复读取数据

* 可以调用 rewind 方法将 position 重新置为 0
* 或者调用 get(int i) 方法获取索引 i 的内容，它不会移动读指针

**需要注意的是，ByteBuffer并没有一个显式的字段（如 `boolean isReadMode`）来直接标记当前是读模式还是写模式。读写模式的本质是通过 position 和 limit 两个指针的逻辑关系隐式定义的。**

#### 再来看Netty中的ByteBuf

Netty中的ByteBuf是对原生nio包中的ByteBuffer的改进。但是两者并没有继承关系。

ByteBuf的关键类图关系：

```tex
ByteBuf (抽象基类)
├── AbstractByteBuf
│   ├── PooledByteBuf          // 池化实现基类
│   │   ├── PooledHeapByteBuf
│   │   └── PooledDirectByteBuf
│   └── UnpooledByteBuf       // 非池化实现基类
│       ├── UnpooledHeapByteBuf
│       └── UnpooledDirectByteBuf
├── CompositeByteBuf          // 组合缓冲区
└── WrappedByteBuf            // 包装缓冲区
```

##### 创建

1. 通过ByteBufAllocator创建

```java
//创建池化的、基于堆的ByteBuf
ByteBuf buffer = ByteBufAllocator.DEFAULT.heapBuffer(10);

//创建池化的、基于直接内存的ByteBuf
ByteBuf buffer = ByteBufAllocator.DEFAULT.directBuffer(10);

//不指定默认创建的就是池化的、基于直接内存的（PooledDirectByteBuf）
ByteBuf buffer = ByteBufAllocator.DEFAULT.buffer(10);
```

Netty默认创建的是池化的ByteBuf，要创建非池化的ByteBuf，可以添加一个虚拟机参数：

```java
-Dio.netty.allocator.type=unpooled
```

然后上面代码创建的都是非池化ByteBuf

2. 通过Unpooled创建（非池化）

```java
// 创建堆内内存的ByteBuf
ByteBuf heapBuffer = Unpooled.buffer(1024); 

// 创建堆外内存的ByteBuf
ByteBuf directBuffer = Unpooled.directBuffer(1024); 

// 从现有数据（如byte[]、String）创建
ByteBuf wrappedBuffer = Unpooled.wrappedBuffer("Hello Netty".getBytes()); 

// 复制一个ByteBuf（深拷贝）
ByteBuf copiedBuffer = Unpooled.copiedBuffer(originalBuffer); 
```

##### 组成

![image-20250516151556761](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250516151556761.png)

Netty的ByteBuf用了两个指针（读指针readerIndex，写指针writerIndex）来确定读写位置，而nio包中的ByteBuffer只用了一个position，所以ByteBuf使用起来比ByteBuffer更方便，不用像ByteBuffer那样每次读之前flip，写之前clear。

##### 扩容

扩容规则是

* 如果写入后数据大小未超过 512，则选择下一个 16 的整数倍，例如写入后大小为 12 ，则扩容后 capacity 是 16
* 如果写入后数据大小超过 512，则选择下一个 2^n，例如写入后大小为 513，则扩容后 capacity 是 2^10=1024（2^9=512 已经不够了）
* 扩容不能超过 max capacity 会报错

ByteBuf 优势

* 池化 - 可以重用池中 ByteBuf 实例，更节约内存，减少内存溢出的可能
* 读写指针分离，不需要像 ByteBuffer 一样切换读写模式
* 可以自动扩容
* 支持链式调用，使用更流畅
* 很多地方体现零拷贝，例如 slice、duplicate、CompositeByteBuf

## 粘包和拆包

TCP作为⼀个基于字节流的传输协议，数据在TCP中传输是没有边界的。也就是说，客户端发送的多条数据，有可能会被认为是⼀条数据。或者，客户端发送的⼀条数据，有可能会被分成多条数据。这是由于TCP协议并不了解上层业务数据的具体含义，在使⽤TCP协议传输数据时，是根据TCP缓冲区的实际情况进⾏数据包的划分。

粘包：缓冲区数据量满了就会作为整体来发送，⽽这个整体中包含了多个数据包，那这种情况就是粘包。

半包：在客户端缓冲区数据量满的时候，把⼀条数据分成了两次缓冲区发送，这种情况就是半包。

也就是我们常说的，TCP不能直接用，要定义出数据的边界。

解决方案

Netty为粘包和拆包提供了多个解码器，每个解码器配有相应的分包解决⽅案。

* LineBasedFrameDecoder：回⻋换⾏分包，以回⻋换⾏为分包的依据。

```java
pipeline.addLast(new LineBasedFrameDecoder(1024));
```

* DelimiterBasedFrameDecoder：特殊分隔符分包，以指定的特殊分隔符为分包依据，局限是消息内容中不能出现特殊分隔符。

```java
pipeline.addLast(new DelimiterBasedFrameDecoder(1024,
Unpooled.copiedBuffer("_".getBytes())));
```

* FixedLengthFrameDecode：固定⻓度报⽂分包，消息⻓度被指定，不⾜的以空格补⾜。

```java
pipeline.addLast(new FixedLengthFrameDecoder(1024));
```

* **自定义编码解码器**

这是较为常⽤的解决⽅案。

![image-20250424174024017](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250424174024017.png)

比如我们自定义一个MessageProtocol，指定消息长度和具体的消息内容。读取时，先读到消息长度，例如为12个字节，那么就向后读取12个字节作为本次消息内容。