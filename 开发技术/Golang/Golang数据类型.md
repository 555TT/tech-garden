# 占用的内存大小

对于golang的内置数据类型，占用内存大小如下：

| 类型                          | 字节数             | 备注                                                         |
| :---------------------------- | ------------------ | ------------------------------------------------------------ |
| bool                          | 1个字节            | **1** 个字节                                                 |
| intN, uintN, floatN, complexN | N/8 个字节         | **N/8** 个字节                                               |
| int, uint, uintptr            | 计算机字长 / 8     | 64 位系统上占用 8 个字节                                     |
| *T, map, func, chan           | 计算机字长 / 8     | 64 位系统上占用 **8** 个字节                                 |
| string                        | 2 * 计算机字长/8   | 64 位系统上占用 **16** 个字节；data、len 分别 8 个字节       |
| interface                     | 2 * 计算机字长 / 8 | 64 位系统上占用 **16** 个字节。非空接口时，tab 和data 分别占 8 个字节；空接口时，\_type 和 data 分别占用 8 个字节 |
| []T                           | 3 * 计算机字长 / 8 | 64 位系统上占用 **24** 个字节；array、len、cap 分别 8 个字节 |
| struct                        |                    | todo 涉及内存对齐，专门用一篇文章来记录[结构体内存对齐](./结构体内存对齐.md) |

（计算机字长就是 CPU 的原生数据处理位数，也就是我们常说的"32位"或"64位"。）

以64位系统验证一下

```go
var flag bool
fmt.Println("bool:", unsafe.Sizeof(flag)) // 1
var a int64
fmt.Println("int64:", unsafe.Sizeof(a)) // 8
var k string
fmt.Println("string:", unsafe.Sizeof(k))	// 16
var n interface{}
fmt.Println("interface:", unsafe.Sizeof(n))	// 16
var q chan int
fmt.Println("chan int:", unsafe.Sizeof(q))	// 8
var s []int
fmt.Println("[]int:", unsafe.Sizeof(s))	// 24
```

unsafe.SizeOf() 得到的是变量本身占用的字节大小，而不是指向的实际数据的字节大小

```go
var str = "柒水浩"
fmt.Println(unsafe.Sizeof(str)) // string本质是一个struct{Data *byte Len int}，8字节的指针和8字节的int，16
fmt.Println(len(str))	// 9，UniCode编码中，一个汉字占用三个字节
```

# 数据类型分类

## 按基本类型/复合类型来分

1. 基本类型

* 数值类型：
  * 整形：有符号整数 int、int8、int16、int32、int64、byte(int8 的别名)、rune(int32 的别名，代表一个 Unicode 码点)；无符号类型 uint、uint8、uint16、uint32、uint64、uintptr
  * 浮点形：float32、float64
  * 复数：complex64、complex128
* 字符串：string
* 布尔：bool

2. 复合类型

数组[3]int、切片[]int、map、指针、接口 interface、函数 func()、chan、结构体 struct

## 按值语义/引用语义来分

1. 值语义（参数传递时整体拷贝）

基本类型、数组、结构体

2. 引用语义（参数传递时拷贝引用地址，共享底层数据结构）

切片、map、指针、接口、函数、chan

golang中，参数传递全是值传递

## 按照是否可比较分类

在 Go 中，是否可比较的意思是否可以用`==`来运算。

1. 可比较：基本类型、指针、数组（元素可比较的情况下）、结构体（必须全部元素可比较且是两个同类型的结构体实例）、chan、接口

基本类型、数组、结构体在用`==`运算时比较的是具体的值是否相等。

指针、`chan`可比较的前提是两变量是同类型的指针/同类型的 `chan`，且`==`在运算时比较的是地址是否相同，即是否是一个实例。

```go
func1 := func() {
		fmt.Println(1)
	}
s1 := "111"
ptr1 := &func1
ptr2 := &s1
fmt.Println(ptr1 == ptr2)	// 编译错误,不可比较，是不同类型的指针，*func() 和 *string 类型不匹配
ch1 := make(chan int)
ch2 := make(chan string)
fmt.Println(ch1 == ch2)	//	编译错误，不可比较，是不同类型的chan，chan int 和 chan string不匹配
ch3 := make(chan byte)
ch4 := make(chan byte)
ch5 := ch3
fmt.Println(ch3 == ch4)	//	false，可比较，比较的是内存地址是否相等
fmt.Println(ch3 == ch5)	//	true，可比较
```

接口由两部分 type 和 value 两部分组成，两个接口类型的变量可以比较的前提是 type 是可比较的

```go
var a interface{} = []int{1}
var b interface{} = []int{1}
fmt.Println(a == b)	// 编译通过，运行直接panic: runtime error: comparing uncomparable type []int
```

所以两个接口类型的变量`==`的条件是 type 可比较且相同，value 相等

```go
var a interface{} = [1]int{1}
var b interface{} = [1]int{1}
fmt.Println(a == b)	// true
```

2. 不可比较：函数、切片、map（函数、切片、map 中都压根未定义`==`这个运算符）

Go 规范明确规定：map 的 key 类型必须支持 `==` 比较操作。可以这么说，**可比较的数据类型一定可以作为 map 的 key，可以作为 map 的 key 的数据类型一定可比较**。

# 数据类型

## 切片

切片的零值是 nil。nil 切片的长度和容量都是 0，`append` 可以从 nil 切片开始；但按下标访问前，长度必须足够。`make([]T, len, cap)` 中，`len` 是切片长度，`cap` 是容量，且长度不能大于容量：

```go
package main

import "fmt"

func main() {
	var s []int
	fmt.Println(s == nil, len(s), cap(s))
	s = append(s, 7)

	t := make([]int, 2, 4)
	t[0], t[1] = 10, 20
	fmt.Println(t, len(t), cap(t))
}
```

输出：`true 0 0`，然后是 `[10 20] 2 4`。省略容量时，容量等于长度；长度为 0、容量大于 0 的切片需要先 `append`，才能按下标访问元素：

```go
package main

import "fmt"

func main() {
	a := make([]int, 3)
	b := make([]int, 0, 3)
	b = append(b, 1, 2)
	fmt.Println(len(a), cap(a), len(b), cap(b))
}
```

输出：`3 3 2 3`。复制切片只会复制切片描述信息，底层数组仍可能共享。`append` 超出容量后会使用足够大的底层存储，但具体扩容策略不是语言规范保证的：

```go
package main

import "fmt"

func main() {
	a := make([]int, 2, 4)
	a[0], a[1] = 1, 2
	b := a
	b[0] = 9
	fmt.Println(a[0])

	b = append(b, 3, 4, 5)
	b[0] = 7
	fmt.Println(a[0], b[0])
}
```

输出：`9`，然后是 `9 7`。

## map

读取 nil map 中不存在的键会得到元素零值；向 nil map 写入会 panic。用 `make` 初始化后才能正常写入：

```go
package main

import "fmt"

func main() {
	var m map[string]int
	fmt.Println(m["missing"])
	m = make(map[string]int)
	m["score"] = 10
	delete(m, "score")
	fmt.Println(m["score"])
}
```

输出：`0`，然后是 `0`。`make(map[K]V, n)` 中的 `n` 是容量提示，不是元素个数或上限：

```go
package main

import "fmt"

func main() {
	m := make(map[string]int, 100)
	fmt.Println(len(m))
	m["one"] = 1
	fmt.Println(len(m))
}
```

输出：`0`，然后是 `1`。

## 通道

nil 通道的发送和接收都会永久阻塞。`make(chan T)` 创建无缓冲通道；`make(chan T, n)` 创建容量为 `n` 的缓冲通道：

```go
package main

import "fmt"

func main() {
	var nilCh chan int
	fmt.Println(nilCh == nil, cap(nilCh))

	ch := make(chan int, 1)
	ch <- 42
	fmt.Println(<-ch)
	close(ch)
}
```

输出：`true 0`，然后是 `42`。无缓冲通道的发送和接收需要同步；缓冲通道在未满时可以发送，在有值时可以接收。通道关闭后仍可读出缓冲值；缓冲区读空后，接收会得到元素零值和 `false`：

```go
package main

import "fmt"

func main() {
	ch := make(chan string, 1)
	ch <- "ready"
	close(ch)

	value, ok := <-ch
	fmt.Println(value, ok)
	value, ok = <-ch
	fmt.Printf("%q %t\n", value, ok)
}
```

输出：`ready true`，然后是 `"" false`。
