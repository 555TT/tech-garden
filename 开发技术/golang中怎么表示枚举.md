# golang中怎么表示枚举？

golang 不像 Java 等其它语言有 enum，golang本身并没有枚举这种数据类型。那在 go 中该怎么表示枚举呢？

## golang表示枚举

首先枚举本质上就是定义一组功能相似的常量，每一个常量代表一定的含义。所以就可以简单这样定义：

```go
type HttpMethod int		// 给 int 定义一个别名

const (
	GET    HttpMethod = 1
	POST   HttpMethod = 2
	PUT    HttpMethod = 3
	DELETE HttpMethod = 4
)

func (h HttpMethod) String() string {
	switch h {
	case GET:
		return "GET"
	case POST:
		return "POST"
	case PUT:
		return "PUT"
	case DELETE:
		return "DELETE"
	default:
		return "UNKNOWN"
	}
}
```

手动给 GET、POST、PUT 等赋值是不是很麻烦， go 中有 iota 这个特殊的关键字，就是来解决这个的：

```go
const (
	GET HttpMethod = iota
	POST
	PUT
	DELETE
)
```

`iota` 是 Go 语言中一个特殊的常量生成器，用在 `const` 块中，从0开始自动递增。所以上面的GET的值就为1，POST 的值为2，一次递增。如果你不想从 0 开始，比如就想让 GET 的值为1，POST 的值为2......，你也可以：

```go
const (
	GET HttpMethod = iota + 1
	POST	//2
	PUT		//3
	DELETE	//4
)
```

**并且他们都是HttpMethod类型的变量。**

其次我们要限制枚举实例的外部创建，比如我们系统的http请求方法只有上面定义的 GET、POST、PUT、DELETE ，我们不希望外部定义新的http方法。例如，我们不希望其它开发人员在其它包中自己再定义其它http方法：

```go
const PATCH enum.HttpMethod = 4
```

做法很简单，直接将type httpMethod int	小写就行了。

所以最终定义枚举就是：

```go
package enum

type httpMethod int

const (
	GET httpMethod = iota // 0
	PUT
	POST
	DELETE
)

func (h httpMethod) String() string {
	switch h {
	case GET:
		return "GET"
	case POST:
		return "POST"
	case PUT:
		return "PUT"
	case DELETE:
		return "DELETE"
	default:
		return "UNKNOWN"
	}
}
// 另一种String实现方式
func (h httpMethod) String() string {
  if h < GET || h > DELETE{
    return "UNKNOWN"
  }
  return [4]string{"GET","PUT","POST""DELETE"}[h]
}
```

## 基准测试两个String方式

两种String实现方式跑一个基准测试对比：

```go
// 以我某次实际业务里遇到的权益包状态枚举为例
type Status int

const (
	StatusInUse Status = iota + 1
	StatusInactive
	StatusExhausted
	StatusRefunded
)

func (s Status) String() string {
	switch s {
	case StatusInUse:
		return "使用中"
	case StatusInactive:
		return "未激活"
	case StatusExhausted:
		return "已用尽"
	case StatusRefunded:
		return "已退费"
	default:
		return "UNKNOWN"
	}
}

func (s Status) StringByArray() string {
	if s < StatusInUse || s > StatusRefunded {
		return "UNKNOWN"
	}
	return [...]string{"", "使用中", "未激活", "已用尽", "已退费"}[s]
}
// Benchmark代码
func BenchmarkStatusStringSwitch(b *testing.B) {
	status := StatusRefunded
	for i := 0; i < b.N; i++ {
		_ = status.String()
	}
}

func BenchmarkStatusStringArray(b *testing.B) {
	status := StatusRefunded
	for i := 0; i < b.N; i++ {
		_ = status.StringByArray()
	}
}
```

**结果**（执行三次）

goos: darwin
goarch: amd64
pkg: jxappui/service/equitypackage
cpu: Intel(R) Core(TM) i5-8257U CPU @ 1.40GHz
BenchmarkStatusStringSwitch-8           1000000000               0.2801 ns/op          0 B/op          0 allocs/op
BenchmarkStatusStringArray-8            1000000000               0.2851 ns/op          0 B/op          0 allocs/op
PASS
ok      jxappui/service/equitypackage   0.669s

------

goos: darwin
goarch: amd64
pkg: jxappui/service/equitypackage
cpu: Intel(R) Core(TM) i5-8257U CPU @ 1.40GHz
BenchmarkStatusStringSwitch-8           1000000000               0.2774 ns/op          0 B/op          0 allocs/op
BenchmarkStatusStringArray-8            1000000000               0.2784 ns/op          0 B/op          0 allocs/op
PASS
ok      jxappui/service/equitypackage   0.651s

------

goos: darwin
goarch: amd64
pkg: jxappui/service/equitypackage
cpu: Intel(R) Core(TM) i5-8257U CPU @ 1.40GHz
BenchmarkStatusStringSwitch-8           1000000000               0.2757 ns/op          0 B/op          0 allocs/op
BenchmarkStatusStringArray-8            1000000000               0.2768 ns/op          0 B/op          0 allocs/op
PASS
ok      jxappui/service/equitypackage   0.646s

差距可以忽略不计或在误差范围内。结论就是两种方式性能没有差别。switch方式可读性更好、且适合枚举值有跳跃的（数组得补空位）；数组代码更简洁、性能可能稍微好那么一丢丢吧。根据个人代码风格来抉择吧。

## iota的特殊用法

1. 可以自定义运算表达式，比如 iota*2+1 或 1 << (10 * iota) 等等....。但是并不推荐，因为 iota 本来就是依次递增为变量赋值，自定义表达式就会变得混乱：

```go
const (
	GET HttpMethod = iota + 1 // 1
	POST = iota * 2 + 1 // 3
	PUT		// 5
	DELETE  // 7
)
```

**注意：这里GET是HttpMethod类型的，其余POST PUT DELETE都是 int 类型的，如果给HttpMethod绑定方法，其余三个是用不了的。**自己仔细对比一下和前面写法的区别。

2. 其次还可以用 _ 占位来跳过某个值：

```go
const (
    _  = iota // 0，跳过
    KB = 1 << (10 * iota) // 1024
    MB                    // 1048576
    GB                    // 1073741824
)
```

3. 还可以多常量同行，同一行的多个常量，iota 值相同：

```go
const (
    A, B = iota, iota + 10 // A=0, B=10
    C, D                   // C=1, D=11
)
```

