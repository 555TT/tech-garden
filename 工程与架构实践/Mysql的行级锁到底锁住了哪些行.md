# 前置知识
首先明确明确几点：

+ Innodb的行级锁本质上锁的是索引记录！！因为Innodb表中的数据都是按<font style="color:rgb(64, 64, 64);">主键索引（即使自己没有明确指定主键行，MySQL会默认选择一个唯一的非空索引作为聚簇索引，如果没有适合的非空唯一索引，则会创建一个隐藏的主键(row id)作为聚簇索引）组织起来的，数据都存储在叶子结点上。二级索引存储主键值，查询时需回表到主键索引获取数据。若通过二级索引更新，先锁二级索引条目，</font>**<font style="color:rgb(64, 64, 64);">如果命中了索引覆盖这种情况，则不会再锁主键索引条目</font>**<font style="color:rgb(64, 64, 64);">。若WHERE条件无可用索引，InnoDB会全表扫描（遍历主键索引），导致所有扫描的行（包括不符合条件的行）被加锁。在可重复读隔离级别下，还会添加间隙锁，</font>**<font style="color:rgb(64, 64, 64);">可能退化为表级锁</font>**<font style="color:rgb(64, 64, 64);">效果。</font>
+ <font style="color:rgb(64, 64, 64);">只有在RR隔离级别才会有间隙锁。演示证明：</font>

<font style="color:rgb(64, 64, 64);">一个course表,cno为主键。预先插入一些数据</font>

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741421927681-029cbe2e-ebf1-49bf-8802-83d656f2101e.png)

开启两个会话，隔离级别都设置为RR

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741422097198-242de78d-6f7d-4308-ad18-d962be5256ae.png)

接着会话1用加了写锁的select锁住了>=4002的索引记录

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741422356885-4018c12d-bee0-4333-a595-c26326c4dbd4.png)

会话2尝试插入4003一行，被阻塞

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741422443132-8f9b1bf4-091d-4bbc-9e88-350173d20703.png)

说明会话1对4003这一间隙也加了锁。

接着将隔离级别都设为RC

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741422790687-e7bcd6f1-d1e0-4efd-8649-3894419a22ae.png)

会话1锁住>=4002的行记录

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741422928418-8dce349f-cb1f-4fa4-9d67-d457bbf6a6ce.png)

会话2插入4003，插入成功

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741422967787-affc0baa-5d28-456b-9ae7-ca4a8b80ebbd.png)

会话2commit后，会话1再查询>=4002的记录

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741423045043-1b72406d-5396-4eb0-aa80-112fa82a1955.png)

<font style="color:rgb(64, 64, 64);">多出来了一行记录，也就是出现了幻读。从这也能看出RR的间隙锁解决了部分场景下的幻读问题。幻读问题可见另一篇博客：</font>

[Mysql的Innodb的RR隔离级别到底有没有解决幻读问题？_mysql中的rr隔离级别,到底有没有解决幻读问题-CSDN博客](https://blog.csdn.net/m0_73520938/article/details/142928555)

<font style="color:rgb(64, 64, 64);">明确这两点后，</font>**<font style="color:rgb(64, 64, 64);">那么一条update（不只是update，还有加锁的select、delete都会加行级锁）语句到底锁住了哪些行？</font>**

# <font style="color:rgb(64, 64, 64);">加锁规则</font>
（参考丁奇大佬的《mysql实战45讲》）

<font style="color:rgb(51, 51, 51);">因为间隙锁在可重复读隔离级别下才有效，所以本篇文章接下来的描述，若没有特殊说明，默认是可重复读隔离级别。</font>

![](https://cdn.nlark.com/yuque/0/2025/png/39049391/1741426443580-44646d35-9555-41d7-b6a9-93d8252b4daf.png)

### 具体场景的加锁规则

#### 1. 唯一索引的等值查询

- 记录存在：

```
SELECT * FROM user WHERE id = 10 FOR UPDATE; -- id 是唯一索引
```

- 加锁：仅对 `id=10` 加 记录锁（X 锁）。
- 记录不存在：

```
SELECT * FROM user WHERE id = 7 FOR UPDATE; -- 表中无 id=7 的记录
```

- 加锁：锁定 `id=7` 所在的间隙（如 `(5, 10)`）。

#### 2. 非唯一索引的等值查询

- 记录存在：

```
SELECT * FROM user WHERE age = 20 FOR UPDATE; -- age 是非唯一索引
```

- 加锁：锁定 `age=20` 的 Next-Key Lock（如 `(15, 20]`），继续向右遍历到 `age=25` 时，退化为间隙锁 `(20, 25)`。
- 记录不存在：

```
SELECT * FROM user WHERE age = 22 FOR UPDATE; -- 表中无 age=22 的记录
```

- 加锁：锁定 `age=22` 所在的间隙（如 `(20, 25)`）。

#### 3. 范围查询（唯一索引）

```
SELECT * FROM user WHERE id >= 10 AND id < 15 FOR UPDATE;
```

- 加锁：

1. 定位到 `id=10`，加 Next-Key Lock `(5, 10]`，根据优化 1 退化为记录锁（仅锁 `id=10`）。
2. 向右扫描到 `id=15`，加 Next-Key Lock `(10, 15]`。

#### 4. 无索引查询

```
UPDATE user SET name = 'Bob' WHERE name = 'Alice'; -- name 无索引
```

- 加锁：全表扫描主键索引，对所有行加记录锁，并对所有间隙加间隙锁（等效于 表锁）。

# 其它
<font style="color:rgb(51, 51, 51);">在RC级别下还有一个优化，即：语句执行过程中加上的行锁，在语句执行完成后，就要把“不满足条件的行”上的行锁直接释放了，不需要等到事务提交。</font>

