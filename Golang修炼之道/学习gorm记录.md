1. 标签serializer:json/gob/unixtime，json/gob/unixtime是gorm自带的三个序列化器。json：将go复杂数据类型序列化为json存储到数据库，读取时再将json反序列化为go类型，数据库中的数据类型默认为longtext；gob：将值序列化为二进制存储到数据库中，数据库中的数据类型默认为longtext；unixtime将go中的时间戳序列化为数据库中的datetime，需要使用type标签将字段类型定义为datetime，即时使用type标签将类型定义为time，创建的字段类型也是datetime。且这个序列化器只能秒级时间戳序列化为datetime，即时传来的时毫秒时间戳，他也会当做为秒级，并不会自动识别。

2. gorm中的dialector（方言/适配器），可以使 GORM 能够以统一的方式支持多种不同类型的关系型数据库（如 MySQL、PostgreSQL、SQLite、Oracle 等），例如mysql.Open返回的就是一个实现了 Dialector 接口的对象。

3. gorm中模型对应的结构体中的字段数据类型只能是 基本数据类型、基本数据类型的指针类型、time.time、数据库空值类型、实现了sql.Scanner和 driver.Valuer 接口的类型等，不能是复合类型，例如string[]，除非定义了序列化器或者实现了Scanner和Valuer两个接口，总之要定义如何存入数据库和从数据库中查出来。

4. json中的数据类型不区分整数和浮点数，只有number类型。直接将一个json使用encoding/json反序列为map[string]interface{}，数值类型会反序列为float64。但是如果自己定义结构体，将字段类型定义为int，那就会直接反序列为你定义的int类型。

5. mysql中不同数据类型后面的()的含义：**时间类型**。datetime(3)、time(3)和timestamp(3)表示秒后面的小数保留几位，范围0~6；**浮点类型**。float(8,3)表示总长度8位，小数点后最多3位；**整数类型**。int(8)完全不改变存储范围和数值大小，仅影响显示长度和历史遗留的 `ZEROFILL` 属性有关，mysql高版本中int(8)这种语法已被废弃。**字符类型**。char(8)和varchar(8)严格控制最多存储8个字符（不是字节！），类似的有**二进制类型**binary(8)，严格控制最多存储8个字节；**定点数**。decimal(8,3)，和浮点类似，表示最多8位，小数点后最多3位，decimal(8,3)最大值为99999999；enum/set，enum("1","2")，定义允许的字符串列表。

6. mysql中，timestamp和datetime的显示格式看着一样，但两个数据类型有本质区别。区别点：时区；取值范围；存储空间。

7. gorm自己定义的error：gorm.io/gorm/errors.go

8. github.com/go-sql-driver/mysql实现了database/sql/driver，gorm.io/driver/mysql使用了go-sql-driver/mysql

9. msyql中的timestamp 最早有效瞬间是1970-01-01 00:00:01 UTC，而不是1970-01-01 00:00:00 UTC
10. gorm中的Clauses方法

```go
	result := tx.Table(progressTable(progress.StudentUid)).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "student_uid"}, {Name: "article_id"}},
		DoNothing: true,
	}).Create(&progress)
```

最终执行的sql大致如下

```sql
INSERT INTO `tblUserArticleProgressNN`
    (
        `created_at`,
        `updated_at`,
        `student_uid`,
        `article_id`,
        `task_id`,
        `week`,
        `read_duration`,
        `read_status`,
        `practice_status`,
        `is_credit_granted`
    )
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE `id` = `id`;
```

 MySQL 不支持 PostgreSQL 风格的：

```sql
ON CONFLICT (student_uid, article_id) DO NOTHING
```

GORM 的 MySQL 驱动会把它转换成：

```sql
ON DUPLICATE KEY UPDATE `id`=`id`
```

且当gorm.io/gorm v1.25.10、gorm.io/driver/mysql v1.5.7、gorm.io/sharding v0.6.1时，sharding和Clauses不兼容，例如

```go
tx.Model(&UserArticleProgress{}).
    Clauses(clause.OnConflict{DoNothing: true}).
    Create(&progress)
```

会报错。
