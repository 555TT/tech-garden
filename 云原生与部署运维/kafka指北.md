为自己总结一下kafka指北

# 集群

kafka集群中每个broker的id是唯一的，在server.properties中配置。并且kafka集群架构也是用的常见的主从(Master-slave)架构，这个mater节点就是controller，集群中只能有一个controller，controller用来管理集群中的broker、topic、partation。

## controller选举过程

zookeeper前置知识：

- 和zookeeper连接的客户端在zookeeper建立的节点分为临时节点和持久化节点。临时节点：这种节点的生命周期与创建它的客户端会话绑定。当客户端会话结束时（例如客户端断开连接），临时节点会自动被删除。持久化节点：这种节点一旦创建，就会一直存在于zookeeper中，除非显式地删除它。
- 节点的唯一性。zookeeper中的节点路径是唯一的，这意味着在同一个父节点下，不能有两个同名的子节点。当多个客户端尝试创建同一个节点时，只有一个客户端会成功，其他客户端会收到创建失败的响应。
-  监听器（Watcher）。zookeeper允许客户端在节点上设置监听器，用于监听节点的状态变化。当节点的状态发生变化时（例如节点被创建、删除、数据更新等），zookeeper会通知所有监听该节点的客户端，触发相应的回调函数。并且监听器是一次性的，即一旦触发后，客户端需要重新注册监听器才能继续监听节点的变化。

根据zookeeper这三个特性，controller选举过程就是这样的：

当kafka集群首次启动后，每个broker都会向zookeeper请求注册/controller节点，并且注册是临时节点的（在pettyZoo-1.9.7可视化工具中就是黄色的节点），但zookeeper节点是唯一，所以只会有一个节点成为controller，可以理解为先来后到原则。其它没注册成功的就会监听/controller节点。当controller发生故障时，其它broker就会监听到临时节点消失了，就竞争再次创建/controller临时节点，成为controller。

（从这也能看出kafka节点的管理都要依赖第三方zookeeper，和zookeeper有强耦合性，制约了kafka的发展，甚至成为kafka的性能瓶颈，所以kafka在后续的版本中尝试加入了一些节点间协调算法来代替zookeeper的作用，目标是彻底替代）

## broker启动流程

根据上面controller的选举过程，则broker的启动流程大概如下：

第一个broker启动流程：1.注册broker节点，在/broker/ids下创建一个节点。2.监听/controller节点。3.发现还没人创建/controller，自己注册创建/controller节点，成为controller。4.监听/broker/ids下的节点，用来感知到后续broker的加入和退出。

![image-20250313105717069](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313105717069.png)

第二个broker启动：1.注册broker节点。2.监听/controller节点3.注册/controller，但不成功。4.由于controller节点监听了/brokers/ids，所以这时zookeeper会通知controller集群的变化。5.controller连接其它broker，发送集群相关的元信息

![image-20250313110602682](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313110602682.png)

controller节点故障被删除的情况：1.zookeeper通知其它broker节点controller节点的删除。2.其它broker监听注册controller节点，但只有一个节点能注册成功。3.controller节点在/brokers/ids上增加监听器。4.controller连接其它所有broker，发送集群相关元信息。

![image-20250313111012967](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313111012967.png)

# 主题创建

查看topic详情的命令：

```sh
./kafka-topics.sh --bootstrap-server 127.0.0.1:9092--describe--topic topicname
```

kafka默认开启了主题自动创建，当生产者向一个不存在的主题发送了消息，会自动创建该主题，默认一个分区，一个leader副本。

## 副本分布

在创建主题时，每个副本放在哪个broker节点上？

如果使用了replica-assignment参数，那么就按照指定的方案来进行分区副本的创建；如果没有指定replica-assignment参数，那么就按照Kafka内部逻辑来分配，内部逻辑按照机架信息分为两种策略：【未指定机架信息】和【指定机架信息】

未指定机架信息：

![image-20250315172932820](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250315172932820.png)

用一个例子代入：

```
假设：当前分区编号 : 0；BrokerList:[1，2，3，4]；副本数量:4 ；随机值: 2；副本分配间隔随机值: 2

第一个副本（也就是leader副本）的索引为：（分区编号 + 随机值）% BrokerID列表长度 =（0 + 2）% 4 = 2
索引为2的brokerID为3，则第一个副本所在BrokerID : 3

 第二个副本索引（第一个副本索引 + （1 +（副本分配间隔 + 0）% （BrokerID列表长度 - 1））） % BrokerID列表长度 = （2 +（1+（2+0）%3））% 4 = 1
 则第二个副本所在BrokerID：2

第三个副本索引：（第一个副本索引 + （1 +（副本分配间隔 + 1）% （BrokerID列表长度 - 1））） % BrokerID列表长度 = （2 +（1+（2+1）%3））% 4 = 3
则第三个副本所在BrokerID：4

第四个副本索引：（第一个副本索引 + （1 +（副本分配间隔 + 2）% （BrokerID列表长度 - 1））） % BrokerID列表长度 = （2 +（1+（2+2）%3））% 4 = 0
则第四个副本所在BrokerID：1

最终0号分区的副本所在的Broker节点列表为【3，2，4，1】
其他分区采用同样算法
```

最后得到的【3，2，4，1】列表也就是ISR。因为算法中用到了几个随时值，所以每次计算出来的结果不一定是一样的。

副本分布最理想的情况是各个leader和follower副本均匀的分布在各个broker节点上，这样IO读写可以均衡的散落到各个服务器上，避免单点读写瓶颈。但kafka是一个一个创建主题的，人家又不知道你以后会创建什么样的主题，它没办法去站在上帝视角去均匀的分配副本，所以默认的分配策略分配的并不是最理想的，我们可以自己指定副本分布在哪个分区上

![image-20250315172435953](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250315172435953.png)

3号节点指的是server.properties配置文件中broker.id为3的节点

另外需要说明的是，将leader副本和follower副本分布在一个节点上没有任何意义，follower副本存在的意义就是当leader宕掉了，follower中选一个重新作为leader，提供一种容错机制。但是分布在了一个节点上，不就一损俱损了吗。

## ISR

ISR（In-Sync Replicas）副本同步列表。一个分区有leader和follower副本，leader副本负责读写消息，follower负责从leader中同步消息。保持着数据同步的这些副本，就称这些副本在一个副本同步列表中。ISR中存储的都是副本所在的节点的brokerid。例如就像这样[1,3,2,4]

在没有网络延迟等任何问题，一个最理想的情况下，一个分区的ISR包括这个分区所有副本所在的brokerid。但当某个follower副本的最后一个消息的偏移量落后于leader最后一个消息的偏移量超过一个阈值时，leader将从ISR中删除该follower。

具体来说，是由这个参数决定的replica.lag.time.max.ms

![image-20250315192804728](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250315192804728.png)

还有一个影响参数是replica.lag.max.messages，但在新版kafka中已经被删除了

![image-20250315193002642](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250315193002642.png)

## leader副本选举机制

在创建主题时，就会计算出ISR列表顺序（计算逻辑就是前面副本分布中说明的），ISR列表中第一个broker上的副本就是leader副本。

当leader副本所在的节点宕掉时，就会直接将ISR列表中后一个节点上的副本作为leader副本，如果原leader副本重新加入了ISR，也是加在ISR的最后面。比如，原ISR:[1,3,2,4]，1节点所在的副本是leader副本，1节点宕掉了，就会直接将1后面的3节点上的副本作为leader副本。如果然后1又回来了，直接加在ISR的最后面，ISR变成了:[3,2,4,1]。

但是如果当leader宕掉后，ISR为空了（例如所有副本均被移出 ISR），Kafka 的行为取决于配置参数 **`unclean.leader.election.enable`**：

**`unclean.leader.election.enable=false`（默认值）**：**禁止从非 ISR 副本选举**，分区将不可用，生产者写入会抛出 `NoLeaderForPartitionException`。这是为了 严格保证数据一致性，避免数据丢失。

**`unclean.leader.election.enable=true`**：**允许从 AR（Assigned Replicas，所有副本）中选举新 Leader**，即使该副本不在 ISR 中。但是这样有风险：新 Leader 可能丢失部分未同步的消息，导致数据不一致。

**整个选举过程是由controller节点负责完成的。**

## LEO

LEO：日志末端偏移量 (Log End Offset)，记录某副本消息日志(log)中下一条消息的偏移量，也就是下一个消息写入的偏移量。注意是下一条消息，也就是说，如果LEO=10，那么表示该副本只保存了偏移量值是[0, 9]的10条消息；

LEO是副本上的概念，不要搞混了

# 生产数据

## 流程

![image-20250318122536896](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250318122536896.png)

**主线程**：准备数据->拦截器->得到集群元数据->序列化器->分区器->数据校验->将数据追加到数据收集器（RecordAccumulator）中。

数据收集器也是一个缓冲区，并且数据是一批一批的被sender线程发送的，一批大小默认为16k（但不一定就是16k，只是超过了16k就不再放数据了，有可能原来有15k，又放了一个数据变成了20k，这时就不再放数据了），以主题为组。

生产者主线程也就是我们的用户线程至此就结束了。

**sender发送线程**：从RecordAccumulator取一批次数据，**按broker分组**，每个请求对应一个Broker，包含多个分区的消息批次->构建成ProduceRequest->通过`NetworkClient`发送请求到broker，与broker网络IO通信（内部使用Java的NIO）->回调函数处理响应

![image-20250318125535214](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250318125535214.png)

所以真正将数据发送到kafka的是sender线程，并不是我们的用户主线程

**整个发送消息的过程也是一个生产者消费者模型**

### 同步发送和异步发送

```java
// 异步发送：主线程不阻塞
producer.send(new ProducerRecord<>("topic", "key", "value"));

producer.send(new ProducerRecord<>("topic", "key", "value"), (metadata, exception) -> {
    if (exception != null) {
        log.error("发送失败", exception);
    } else {
        log.info("消息已发送到分区 {}", metadata.partition());
    }
});
```

kafka发送消息默认都是异步的，上面两种不管有没有设置回调都是异步发送的。只有对send返回的Future阻塞获取才是同步发送。

```java
// 同步发送：主线程阻塞等待发送结果
Future<RecordMetadata> future = producer.send(new ProducerRecord<>("topic", "key", "value"));
RecordMetadata metadata = future.get(); // 阻塞直到收到 Broker 响应
```

另外需要注意的，该回调是对sender线程的回调。也就是主线程在将消息放到RecordAccumulator缓冲区中就立即返回了

### 发送次数达到最大重试次数了，还是失败？

1. **失败上报**
   - 达到最大重试次数或整体超时后，Kafka 生产者会**停止重试**并将该条消息标记为失败：
     - **异步调用**时，`send(record, callback)` 中的 `callback.onCompletion(...)` 会携带一个非空的 `exception`；
     - **使用 Future** 时，调用 `future.get()` 会抛出异常，通常为 `TimeoutException`（`MessageTimedOut`）或根因异常
2. **消息丢弃**
   - 失败的消息会从生产者缓冲区中丢弃，不会被再次发送；后续消息发送不会因这条失败消息而阻塞或重试。
3. **补偿处理**
   - 应用层需捕获上述异常并进行补偿，例如：
     - 写入死信队列（DLQ）；
     - 持久化到数据库，后续重试发送；
     - 触发告警以人工干预等。
   - 生产者本身不提供自动 DLQ 功能，必须由业务逻辑实现。

## 分区策略

生产者发送消费的分区策略决定了生产者要将该消息发送到哪个分区。分区编号从0开始

计算分区的逻辑大致如图：

![image-20250314144500003](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250314144500003.png)

从图中代码可以看出四个分区策略的优先级为：是否指定分区>是否指定分区器>是否定义了消息的key>随机

也就是，当指定分区时发送到指定的分区（指定partition参数）

![image-20250314120316545](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250314120316545.png)

没指定具体分区，也没指定分区器，但消息有key时根据key来计算发送的分区，对应DefaultPartitioner分区器类

![image-20250314120836175](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250314120836175.png)



DefaultPartitioner的分区逻辑大概是：计算key的序列化字节数组的hashcode，然后hashcode对分区数取模

未具体指定分区，消息也没有key，也没有指定生产者的分区器时，会用一个随机数对可用分区取模，对应的是UniformStickyPartitioner分区器类

![image-20250314145149770](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250314145149770.png)

除了DefaultPartitioner和UniformStickyPartitioner，还有一个RoundRobinPartitioner分区器。

![image-20250314153059094](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250314153059094.png)

（依赖下载了两个版本，所以会有两份，不用关心这个）

我们可以自己传递生产者配置指定用该分区器

用法：需要自己定义KafkaProducer，定义partitioner.class参数

```java
 @Bean
    public KafkaTemplate<String, String> kafkaTemplate() {
        Map<String, Object> configs = new HashMap<>();
        configs.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "192.168.200.130:9092");
        configs.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, RoundRobinPartitioner.class);
        configs.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");
        configs.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, "org.apache.kafka.common.serialization.StringSerializer");
        DefaultKafkaProducerFactory defaultKafkaProducerFactory = new DefaultKafkaProducerFactory<>(configs);
        return new KafkaTemplate<>(defaultKafkaProducerFactory);
    }
```

除了以上三个自带的，我们还可以定义一个类，实现Partitioner接口，从而实现自己的分区逻辑。

## ack应答

生产者发送一条消息，broker会给生产者一个应答,Kafka提供了3种应答处理

ACK = 0

当生产数据时，生产者对象（sender线程）将数据通过网络客户端将数据发送到网络数据流中的时候，Kafka就对当前的数据请求进行了响应（确认应答）。生产者不会等待任何确认。

ACK=1

生产者会等待 Leader 副本成功写入消息后返回确认。

ACK=all（或 ack=-1）**kafka3开始的默认值**

生产者会等待所有同步副本（ISR）都成功写入消息后返回确认。

<u>**这里的“成功写入”指的是消息被写入到Broker的操作系统页面缓存（即日志文件的Page Cache），而不一定立即持久化到物理磁盘！！！！！**</u>

## 生产者发送消息的幂等性

当Producer的acks设置成1或-1时，Producer每次发送消息都是需要获取Broker端返回的RecordMetadatal的。这个过程中就需要两次跨网络请求。当网络出现延迟等原因时，生产者就会重试发送没有接受到应答的消息。（默认无限次重试，int的最大值），这就会导致消息重复发送，kafka对该幂等性问题做了设计。

首先需要理解数据传递过程中的三个数据语义：**at-least-once**:至少一次；**at-most-once**:最多一次；**exactly-once**:精确一次。

通常意义上，at-least-once可以保证数据不丢失，但是不能保证数据不重复。而at-most-once保证数据不重复，但是又不能保证数据不丢失。这两种语义虽然都有缺陷，实现起来相对来说比较简单。但是对一些敏感的业务数据，往往要求数据即不重复也不丢失，这就需要支持Exactly-once语义。而要支持Exactly-once语义，需要有非常精密的设计。
回到Producer发消息给Broker这个场景，如果要保证at-most-once语义，可以将ack级别设置为0即可，此时，是不存在幂等性问题的。如果要保证at-least-once语义，就需要将ack级别设置为1或者-1，这样就能保证Leader Partition中的消息至少是写成功了一次的，但是不保证只写了一次。如果要支持Exactly-once语义怎么办呢？这就需要使用到幂等性（idempotence）属性了。
Kafka为了保证消息发送的Exactly-once语义，增加了几个概念：

- PID:唯一标识一个生产者实例。**由Broker在生产者初始化时分配**，**重启生产者会重新分配**。
- Sequence Numer:生产者为每个分区维护一个单调递增的序列号。标识生产者发送的每条消息的顺序。
- Broker端则会针对每个<PID,Partition>维护一个序列号(SN),只有当发来的消息的SequenceNumber=SN+1时，Broker才会接收消息，同时将SN更新为SN+1。否则， SequenceNumber过小就认为消息已经写入了，不需要再重复写入。而如果SequenceNumber过大，就会认为中间可能有数据丢失了。对生产者就会抛出一个 OutOfOrderSequenceException。

这样，Kafka在打开幂等性（idempotence）控制后，在Broker端就会保证每条消息在一次发送过程中，Broker端最多只会刚刚好持久化一条。这样就能保证at-most-once语义。再加上之前分析的将生产者的acks参数设置成1或-1，保证at-least-once语义，这样就整体上保证了**Exactaly-once**语义。

**开始幂等性需要生产者做以下配置**：

![image-20250307163223648](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250307163223648.png)

翻译过来也就是

| **配置项**                                | **配置值** | **说明**                                                  |
| ----------------------------------------- | ---------- | --------------------------------------------------------- |
| **enable.idempotence**                    | true       | 开启幂等性，默认值                                        |
| **max.in.flight.requests.per.connection** | 小于等于5  | 每个连接的在途请求数，不能大于5，取值范围为[1,5]，默认是5 |
| **acks**                                  | all(-1)    | 确认应答，不能修改，默认是-1                              |
| **retries**                               | >0         | 重试次数，推荐使用Int最大值，默认是0                      |

但是kafka无法保证生产者重启前后的幂等性，因为生产者重启后PID会改变，无法做到跨生产者会话幂等性。

想要解决跨会话幂等性问题就要用到kafka的事务了。

## <u>跨分区幂等性问题！！？？</u>

外面看到很多文章都说kafka的幂等性机制无法保障跨分区的幂等性。我想说一下我的理解：

我想问，什么情况下会产生多分区幂等性？kafka发送消费的重试机制，也只是将消息发送到原来计算好的分区，又不是重新计算分区？怎么会产生消息重复存储问题的？或者这样一种情况：一个生产者向不同分区发送了两条相同业务含义的消息，又根据某个分区策略发送到了不同的分区，从而存储了两份相同的消息？我只想说，这对于kafka来讲本来就是两个消息，本来就要当两个消息来存储，这不是kafka的问题，这是开发者（你）编写的生产者发送消息的代码的问题，何谈幂等性问题？

想要真正解决幂等性问题，只有我们开发者自己解决，比如通过业务主键、流水表等

## 事务

生产者用事务发消息可以保证一个生产者的PID重启后不变，也就解决了生产者跨会话的幂等失效问题。在事务中发送的消息可以保证要么全部成功要么全部失败。

事务提交流程

Kafka中的事务是分布式事务，所以采用的也是二阶段提交

第一个阶段提交事务协调器会告诉生产者事务已经提交了，所以也称之预提交操作，事务协调器会修改事务为预提交状态

![img](data:image/png;base64,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)

第二个阶段提交事务协调器会向分区Leader节点中发送数据标记，通知Broker事务已经提交，然后事务协调器会修改事务为完成提交状态

 

![img](data:image/png;base64,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)

特殊情况下，事务已经提交成功，但还是读取不到数据，那是因为当前提交成功只是一阶段提交成功，事务协调器会继续向各个Partition发送marker信息，此操作会无限重试，直至成功。

但是不同的Broker可能无法全部同时接收到marker信息，此时有的Broker上的数据还是无法访问，这也是正常的，因为kafka的事务不能保证强一致性，只能保证最终数据的一致性，无法保证中间的数据是一致的。不过对于常规的场景这里已经够用了，事务协调器会不遗余力的重试，直至成功。

代码演示

```java
import org.apache.kafka.clients.producer.*;
import org.apache.kafka.common.serialization.StringSerializer;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.Future;

public class ProducerTransactionTest {
    public static void main(String[] args) {
        Map<String, Object> configMap = new HashMap<>();
        configMap.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        configMap.put( ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        configMap.put( ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        // TODO 配置幂等性
        configMap.put( ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        // TODO 配置事务ID
        configMap.put( ProducerConfig.TRANSACTIONAL_ID_CONFIG, "my-tx-id");
        // TODO 配置事务超时时间
        configMap.put( ProducerConfig.TRANSACTION_TIMEOUT_CONFIG, 5);
        // TODO 创建生产者对象
        KafkaProducer<String, String> producer = new KafkaProducer<>(configMap);
        // TODO 初始化事务
        producer.initTransactions();
        try {
            // TODO 启动事务
            producer.beginTransaction();
            // TODO 生产数据
            for ( int i = 0; i < 10; i++ ) {
                ProducerRecord<String, String> record = new ProducerRecord<String, String>("test", "key" + i, "value" + i);
                final Future<RecordMetadata> send = producer.send(record);
            }
            // TODO 提交事务
            producer.commitTransaction();
        } catch ( Exception e ) {
            e.printStackTrace();
            // TODO 终止事务
            producer.abortTransaction();//一旦正常调用commitTransaction后，abortTransaction调用会报错
        }
        // TODO 关闭生产者对象
        producer.close();

    }
```

开启事务的前提是已经开启了幂等性配置，因为事务就是用来解决原本的幂等保证机制遗留的问题的

**调用producer.commitTransaction()才会真正将消息发送到broker**。需要强调的是，**一旦正常调用了commitTransaction，消息就能被消费者消费了（即使消费者的隔离级别是读未提交），再调用abortTransaction也没用了**（会报错）

# 数据存储

一条消息的内容有这些（ProducerRecord）

![image-20250318121634259](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250318121634259.png)

## log、index、timeindex文件

kafka的topic的每个分区都对应一个物理文件夹，比如创建一个名为test的topic，分区数量为3，副本数量为1。则在物理磁盘上像这样：![image-20250301170237368](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301170237368.png)

从这也能看出，kafka中的topic只是逻辑上的概念，分区才是真正的物理存储结构。

每个文件夹里一般有这些内容：![image-20250301170309297](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301170309297.png)

log文件是消息存储的文件；index文件是索引文件，作用是记录消息的偏移量和消息在log文件中的具体位置的关联，这样就能根据index文件和消息偏移量在log文件中找到消息了；timeindex是时间索引文件，作用是根据时间戳去找log文件中找消息。

消息就存储在log文件中。但是消息发送后并不会立即写到文件里，而是由一个logManger组件周期性的将消息从内存写到磁盘上。具体什么时候刷盘有配置文件决定：

![image-20250301171308325](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301171308325.png)

kafka官方认为消息的可靠性应该主要靠分区副本来保证，而不是立即将消息刷写到磁盘上。

并且log文件会进行拆分，由多个文件段组成，并不是将所有消息都存储到一个log文件中。具体拆分条件由配置决定，比如按照文件大小拆分：

![image-20250301171444945](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301171444945.png)

多个文件段就像这样：

![image-20250301171635919](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301171635919.png)

三个文件是一组，叫一个文件段。并且文件名数字（20位）就是这组文件的起始偏移量，比如上图第一组的文件的起始偏移量是0，第二组的是16。从这里也能知道第一组文件存储了16条消息（0~15）

想要查看log文件里的内容可以用kafka-dump-log.sh

```shell
kafka-dump-log.sh --files /mysoftware/kafka_2.13-3.8.0/data/kafka/test-tran-0/00000000000000000000.log
```

index文件内容一般像这样：

![image-20250301175540909](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301175540909.png)

log文件中又有每个消息的postition，所以就能根据index文件和偏移量在log文件中找到某条消息。

但是，index文件不会把每条消息都写入，而是达到一定大小阈值才写入一条（默认大小是4k），所以又叫稀疏索引文件。那既然index文件里的内容和log文件里的内容不是一一对应的，假如要查找的消息在index文件中没有记录索引，怎么办？那就只能在某个log文件中从头开始找了。因为kafka中大部分情况都是根据偏移量顺序读取消息的。

timeindex文件和index类似，它放的是时间戳和位置的对应信息

![image-20250301180652357](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301180652357.png)

## 刷盘机制

Kafka **默认没有同步刷盘机制**（即Broker不会等待消息持久化到磁盘后再返回ack），但可以通过配置达到类似同步刷盘的效果。

Kafka的默认行为：异步刷盘

消息写入流程：生产者发送消息到Broker后，Broker先将消息追加到操作系统的Page Cache（内存缓冲区）。操作系统异步将Page Cache中的数据刷盘（持久化到磁盘）。

ack机制：即使`acks=-1`（所有ISR副本确认），Broker也只需将消息写入Page Cache即可返回ack，**无需等待磁盘持久化**。真正的磁盘落盘由**后台调度线程**异步执行。

**如何配置强刷盘？**

Kafka提供以下参数强制刷盘（牺牲性能换取持久性）：

- **`log.flush.interval.messages`**
  每积累指定数量的消息后，强制刷盘一次（例如设置为1，表示每条消息都刷盘）。
- **`log.flush.interval.ms`**
  每隔指定时间（毫秒）强制刷盘一次（例如设置为1，表示每毫秒刷盘）。

示例配置：

```
# Broker的server.properties中配置
log.flush.interval.messages=1
log.flush.interval.ms=1
```

## 数据同步和HW

HW：(High Watermark)，即高水位值，它代表一个偏移量信息。

![image-20250301181618045](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301181618045.png)

多个follower副本在从leader副本同步数据时，各个follower同步的数据不一定一致。在leader挂了时，会从ISR列表（ISR列表是有顺序的）中找到下一个follower（上图中就是follower-1）成为leader，但是follower-1只有2条数据，原leader有4条数据呢，这怎么办？

kafka有水位线的概念，消费者能消费到哪个数据取决于消息数最少的（木桶效应）

![image-20250301181949373](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250301181949373.png)

水位线以上都是不可见的。水位线也会随着follower同步数据而不断上涨



# 消费数据

当不设置auto.offset.reset，默认是从LEO(Log End Offset，LEO=消息条数+1)开始消费消息的，在消费者开启之前的消息都消费不到。

偏移量默认是自动提交的，提交时间间隔默认是5秒。

![image-20250307193140591](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250307193140591.png)

自动提交有可能导致重复消费。设置为手动提交。手动提交有同步和异步提交consumer.commitAsync();consumer.commitSync();

**__consumer_offsets-xx内置主题**

当消费者组内的消费者数量大于分区数量时，就会有消费者空闲，某个消费者宕掉了，这个空闲的消费者就会顶替上去，但是新顶替上来的消费者要从哪开始消费，它自己是不知道的，就要用什么东西来记录消费者消费到哪了，这个东西就是__consumer_offsets-xx主题。该主题是kafka的内置主题，默认有50个分区，编号0~49，并且可配置。消费者提交偏移量就会记录到这个主题内，具体记录到哪个分区上？："groupid".hashcode%分区数量。也就是默认是用消费者组的名字的hashcode对50取模计算，该分区位于哪个broker就由哪个broker负责记录更新消费者的消费偏移量。

## 事务隔离级别

kafka并没有提供消费者事务。如果数据处理完毕，提交偏移量失败，重新拉取消息时可能导致重复消费，这要自己通过其它方式解决。

这里要说的是和生产者事务有关的消费者的事务隔离级别。

![image-20250307195833824](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250307195833824.png)

只有两个取值read_committed和read_uncommitted。读已提交表示只有生产者事务正确提交后消费者才能看到数据，而读未提交，默认是读未提交！！！

需要强调的是，**一旦正常调用了commitTransaction，消息就能被消费者消费了（即使是读未提交），再调用abortTransaction也没用了**（会报错），例如下面这样

![image-20250308191317464](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250308191317464.png)

![image-20250308191536620](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250308191536620.png)

## 调度（协调）器Coordinator

消费者想要拉取数据，首先必须要加入到一个组中，成为消费组中的一员，同样道理，如果消费者出现了问题，也应该从消费者组中剥离。而这种加入组和退出组的处理，都应该由专门的管理组件进行处理，这个组件在kafka中，我们称之为消费者组调度器（协调）（Group Coordinator）

Group Coordinator是Broker上的一个组件，用于管理和调度消费者组的成员、状态、分区分配、偏移量等信息。**每个Broker都有一个Group Coordinator**，负责管理多个消费者组，但每个消费者组只有一个Group Coordinator

消费者组选择Coordinator节点：groupid的hashcode%50(50是_consumser\_offsets主题的分区数量)，得到的分区leader副本在哪个broker节点上，就选择哪个broker上的Coordinator

## 消费者消费分区分配策略

基本特性：一个消费者组中的消费者可以消费不同的topic；一个分区只能由一个消费者消费，但一个消费者可以消费多个分区。

消费者想要拉取主题分区的数据，首先必须要加入到一个组中。但是一个组中有多个消费者的话，那么每一个消费者该消费哪个分区呢？这是由分区分配策略决定的。具体是由消费者的**Leader**决定的，这个Leader我们称之为群主。群主是多个消费者中，第一个加入组中的消费者，其他消费者我们称之为Follower。消费者加入群组的时候，会发送一个JoinGroup请求。群主负责给每一个消费者分配分区。

每个消费者只知道自己的分配信息，只有群主知道群组内所有消费者的分配信息。leader从协调器那里获取群组的活跃成员列表，并负责给每一个消费者分配分区，leader确定了分配关系后再上报给Coordinator

几种分区分配策略：

RoundRobinAssignor（轮询分配策略）

每个消费者组中的消费者都会含有一个自动生产的UUID作为memberid。将每个消费者按照memberid进行排序，所有member消费的主题分区根据主题名称进行排序。

![image-20250313113901948](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313113901948.png)

将主题分区轮询分配给对应的订阅用户，注意未订阅当前轮询主题的消费者会跳过。

![image-20250313113921808](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313113921808.png)

轮询分配分配的不是很均衡。

RangeAssignor（范围分配策略）

基本原则：按照订阅的每个（注意，这里用词是“每个”，也就是说是一个主题一个主题算的）topic的partition数计算出每个消费者应该分配的分区数量，然后分配，一个主题的分区尽可能的平均分，如果不能平均分，那就按顺序向前补齐。

按顺序向前补齐解释：

假设【1,2,3,4,5】5个分区分给2个消费者：5 / 2 = 2, 5 % 2 = 1 **=>** 剩余的一个补在第一个中\[2+1\]\[2\] **=>** 结果为\[1,2,3]\[4,5\]

假设【1,2,3,4,5】5个分区分到3个消费者:

5 / 3 = 1, 5 % 3 = 2 **=>** 剩余的两个补在第一个和第二个中\[1+1\]\[1+1\]\[1\] => 结果为\[1,2\]\[3,4\]\[5\]

因为是一个主题一个主题算的，Range分配策略针对单个Topic的情况下显得比较均衡，但是假如Topic多的话, member排序靠前的可能会比member排序靠后的负载多很多。是不是也不够理想。例如：

![image-20250313114840061](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313114840061.png)

左边的分配方式解释：因为是一个主题一个主题算的，所以主题一中，紫色消费者分配三个分区，主题二中，紫色消费者也是分配三个主题。这样紫色就消费6个分区，黄色才消费4个分区。

再看右边，分配的更不合理。

 StickyAssignor（粘性分区）

在第一次分配后，每个组成员都保留分配给自己的分区信息。当发生重平衡时，在进行分区再分配时（一般情况下，消费者退出45s后，才会进行再分配，因为需要考虑可能又恢复的情况），尽可能保证消费者原有的分区不变，重新对加入或退出消费者的分区进行分配。

![image-20250313120404582](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313120404582.png)

![image-20250313120412981](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250313120412981.png)

从图中可以看出，粘性分区分配策略分配的会更加均匀和高效一些。

CooperativeStickyAssignor

前面的三种分配策略再进行重分配时使用的是EAGER协议，会让当前的所有消费者放弃当前分区，关闭连接，资源清理，重新加入组和等待分配策略。明显效率是比较低的，所以从Kafka2.4版本开始，在粘性分配策略的基础上，优化了重分配的过程，使用的是COOPERATIVE协议。COOPERATIVE协议将一次全局重平衡，改成每次小规模重平衡，直至最终收敛平衡的过程。

**<u>Kafka消费者默认的分区分配就是RangeAssignor，CooperativeStickyAssignor</u>**。首次使用范围分配，后面使用优化后的粘性分区策略。

## 消费者组内leader选举

消费者leader的选举由Group Coordinator来完成，可以看作是先到先得原则，但有个细节：当有一个新的消费者加入组后（也就是发生了重平衡），会将原来所有消费者都踢出组，然后全部消费者重新竞争leader

## rebalance机制

（一部分内容参考了极客时间里kafka的课程）

当消费者组消费的分区关系发生变化，例如有消费者加入或退出、订阅的主题数量发生变化、主题分区增多了，就会发生组内重平衡，重新分配每个消费者该消费哪个分区。

**Kafka的心跳机制 与 Rebalance**

Kafka的心跳机制 与 Rebalance 有什么关系呢？ 事实上，重平衡过程是靠消费者端的心跳线程（Heartbeat Thread）通知到其他消费者实例的 每当消费者向其 coordinator 汇报心跳的时候， 如果这个时候 coordinator 决定开启 Rebalance ， 那么 coordinator 会将`REBALANCE_IN_PROGRESS`封装到心跳的响应中， 当消费者接受到这个`REBALANCE_IN_PROGRESS`， 他就知道需要开启新的一轮 Rebalance  了, 所以`heartbeat.interval.ms`除了是设置心跳的间隔时间， 其实也意味着 Rebalance 感知速度， 心跳越快，那么 Rebalance 就能更快的被各个消费者感知。

在 Kafka 0.10.1.0 版本之前， 发送心跳请求是在消费者主线程完成的， 也就是你写代码调用`KafkaConsumer.poll`方法的那个线程。 这样做有诸多弊病，最大的问题在于，消息处理逻辑也是在这个线程中完成的。 因此，一旦消息处理消耗了过长的时间， 心跳请求将无法及时发到协调者那里， 导致协调者“错误地”认为该消费者已“死”。 自 0.10.1.0 版本开始， 引入了一个单独的心跳线程来专门执行心跳请求发送，避免了这个问题。

consumer实例的五种状态：

| 状态                | 描述                                                         |
| ------------------- | ------------------------------------------------------------ |
| Empty               | 组内没有任何成员，但是消费者可能存在已提交的位移数据，而且这些位移尚未过期 |
| Dead                | 同样是组内没有任何成员，但是组的元数据信息已经被协调者端移除，协调者保存着当前向他注册过的所有组信息 |
| PreparingRebalance  | 消费者组准备开启重平衡，此时所有成员都需要重新加入消费者组   |
| CompletingRebalance | 消费者组下所有成员已经加入，各个成员中等待分配方案           |
| Stable              | 消费者组的稳定状态，该状态表明重平衡已经完成，组内成员能够正常消费数据 |

状态机：

![img](https://ask.qcloudimg.com/http-save/6552462/k6a6jiwzzt.jpeg)

状态流转说明：

一个消费者组最开始是Empty状态， 当重平衡过程开启后， 它会被置于PreparingRebalance状态 等待成员加入， 成员都加入之后变更到CompletingRebalance状态等待分配方案， 当coordinator分配完个消费者消费的分区后， 最后就流转到Stable状态完成重平衡。 当有新成员加入或已有成员退出时， 消费者组的状态 从Stable直接跳到PreparingRebalance状态， 此时，所有现存成员就必须重新申请加入组。 当所有成员都退出组后，消费者组状态变更为Empty。

Kafka定期自动删除过期位移的条件就是，组要处于Empty状态。 因此，如果你的消费者组停掉了很长时间（超过7天）， 那么Kafka很可能就把该组的位移数据删除了。

### **消费者端端重平衡流程**

在消费者端，重平衡分为两个步骤：

1.  加入组。 当组内成员加入组时，它会向 coordinator 发送JoinGroup请求。 在该请求中，每个成员都要将自己订阅的主题上报， 这样协调者就能收集到所有成员的订阅信息。 一旦收集了全部成员的JoinGroup请求后， Coordinator 会从这些成员中选择第一个发送JoinGroup请求的成员成为领导者。 领导者消费者的任务是收集所有成员的订阅信息， 然后根据这些信息，制定具体的分区消费分配方案。 选出leader之后， Coordinator 会把消费者组订阅信息封装进JoinGroup请求的 响应中，然后发给领导者，由领导者统一做出分配方案后， 进入到下一步：发送SyncGroup请求。
2.   领导者向 Coordinator 发送SyncGroup请求， 将刚刚做出的分配方案发给协调者。其他成员也会向 Coordinator发送SyncGroup请求，只不过请求体中并没有实际的内容。 这一步的主要目的是让 Coordinator 接收分配方案， 然后统一以 <u>SyncGroup 响应</u>的方式分发给所有成员， **这样组内所有成员就都知道自己该消费哪些分区了。**

### Broker端重平衡

要剖析协调者端处理重平衡的全流程， 我们必须要分几个场景来讨论。 这几个场景分别是

- 新成员加入组
- 组成员主动离组
- 组成员崩溃离组
- 组成员提交位移。

接下来，我们一个一个来讨论。

-  新成员入组。 新成员入组是指组处于Stable状态后，有新成员加入。 如果是全新启动一个消费者组，Kafka是有一些自己的小优化的，流程上会有些许的不同。 我们这里讨论的是，组稳定了之后有新成员加入的情形。 当协调者收到新的JoinGroup请求后， 它会通过心跳请求响应的方式通知组内现有的所有成员， 强制它们开启新一轮的重平衡。 具体的过程和之前的客户端重平衡流程是一样的。 现在，我用一张时序图来说明协调者一端是如何处理新成员入组的。

![img](https://ask.qcloudimg.com/http-save/6552462/aqrlbpuybr.jpeg)

-  组成员主动离组。 何谓主动离组？就是指消费者实例所在线程或进程调用close()方法主动通知协调者它要退出。 这个场景就涉及到了第三类请求：LeaveGroup请求。 协调者收到LeaveGroup请求后，依然会以心跳响应的方式通知其他成员

![img](https://ask.qcloudimg.com/http-save/6552462/g6ni079dve.jpeg)

-  组成员崩溃离组。 崩溃离组是指消费者实例出现严重故障，突然宕机导致的离组。 它和主动离组是有区别的， 因为后者是主动发起的离组，协调者能马上感知并处理。 但崩溃离组是被动的，协调者通常需要等待一段时间才能感知到， 这段时间一般是由消费者端参数session.timeout.ms控制的。 也就是说，Kafka一般不会超过session.timeout.ms就能感知到这个崩溃。 当然，后面处理崩溃离组的流程与之前是一样的，我们来看看下面这张图。

![img](https://ask.qcloudimg.com/http-save/6552462/bg2b0rjo1c.jpeg)

 **重平衡时协调者对组内成员提交位移的处理**

 正常情况下，每个组内成员都会定期汇报位移给协调者。 当重平衡开启时，协调者会给予成员一段缓冲时间， 要求每个成员必须在这段时间内快速地上报自己的位移信息， 然后再开启正常的JoinGroup/SyncGroup请求发送。 还是老办法，我们使用一张图来说明。

![img](https://ask.qcloudimg.com/http-save/6552462/epev617xq9.jpeg)

# 扩展

零拷贝

![image-20250308191824275](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250308191824275.png)

**怎么保证顺序消费**

![image-20250315121456712](C:\Users\DELL\AppData\Roaming\Typora\typora-user-images\image-20250315121456712.png)

无论是单分区还是让同一批因果依赖的消息分到一个分区都不能**完全**保证消息的顺序性。

单分区也可能导致消息乱序！！以kafka消息中间件为例，只有单个分区，有多个消息生产者投递消息到这个分区，生产者A将要发送a消息，生产者B将要发送b消息，期望的消息顺序是a、b，但由于网络延迟或生产者A那个时刻的机器负载比较高，导致消息b先投递到了broker中，消息的处理顺序变为了b、a，也就是单分区也不一定能保证消息顺序正确。

怎么解决？

1. 强制用一个 Producer 消息。可以将各个地方的消息汇总起来，最后交由单个生产者来发送消息。

2. 在生产者和broker之间加一层中间层聚合器，所以的生产者都将消息发送到这个聚合器上，聚合器排好序后再发送给真正的broker。

3. 在消息中加入全局唯一递增序号，在消费端进行缓存和排序。

   

**消息中间件怎么保证消息100%不丢失？**

首先，任何消息中间件靠自身的机制都没办法保证消息100%不丢失。

回答思路：kafka自身为消息可靠性做了哪些--->哪些环节，什么情况下还可能导致消息丢失--->(怎么发现消息丢失了)--->怎么设计可以保证消息100%不丢失？

以kafka为例，kafka为消息可靠性保障做了哪些机制。

生产者：1.发送消息时同步发送或设置发送回调。发送消息默认都是异步发送的，只是将消息发送到RecordAccumulator缓冲区。可靠性发送要么同步发送producer.send().get()要么设置回调producer.send(msg,callback)，可以在回调中做补偿措施。

2.acks。设置生产端的ack为-1(all)，所有的ISR副本都接受到了消息才返回ack，可靠性由多副本机制来保证，即使一个副本宕机了，还有其它副本。

broker：1.持久化存储的刷盘策略。（kafka没有同步刷盘，broker不是等到真正持久化到磁盘中才向生产者返回ack。）可以设置kafka的刷盘策略让其刷盘更频繁。2.ISR复制机制。可以为topic设置更多的follower副本。

消费者端：设置手动ack。并且消费失败，消息会重投。最大重新投递9次，一共消费10次。

分析哪个环节可能导致消息丢失。

生产者发送消息时：发送失败，重试到最大次数了还是失败（这时会向生产者抛异常，我们可以处理异常，这种情况还可以处理）。如果在重试发送的过程中，生产者崩溃宕机了，由于RecordAccumulator缓冲区都是存储内存中的，重启后消息就会丢失！！！

broker：由于只有异步刷盘策略，发送到broker中，还没来得及持久化，ISR中的副本全部宕机，消息不就丢失了！！

怎么发现消息丢失？

为每个消息设置一个全局唯一递增id，定期在消费者端统计id，从最小到最大id之间是不是连续的，如果有断连，则消息丢失了。

怎么完全解决消息丢失问题？

引入mysql，采用本地消息表。将其它本地业务操作和将mq消息写入本地消息表放在一个本地事务中，初始消息状态设为0，然后再执行生产者发送消息。发送消息如果失败，可以使用定时任务做补偿，重新发送。消费者成功消费后再操作本地消息表将消息状态改为1。但是这样可能导致消息重复消费。消费者端要做好业务幂等。
