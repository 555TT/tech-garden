`new` 返回指向零值的指针，`make` 初始化切片、map和通道，并返回它们本身。先看最短的对比：

```go
package main

import "fmt"

func main() {
	p := new(int)
	s := make([]int, 2)
	fmt.Printf("%T %v; %T %v\n", p, *p, s, s)
}
```

输出：

```text
*int 0; []int [0 0]
```

# `new` 返回零值指针

`new(T)` 可用于任何类型，得到的是 `*T`，**`*T`是对应类型的零值**，go1.26起，`new` 的操作数可以是**表达式**，用来指定新变量的初始值：

```go
a := new(11)
fmt.Println(*a)
fmt.Printf("%T", a)
```

输出：

```te
11
*int
```

结构体的字段也取各自的零值：

```go
package main

import "fmt"

type User struct {
	Name string
	Age  int
}

func main() {
	u := new(User)
	fmt.Printf("%q %d\n", u.Name, u.Age)
	u.Name, u.Age = "Lin", 18
	fmt.Printf("%s %d\n", u.Name, u.Age)
}
```

输出：

```text
"" 0
Lin 18
```

`new(User)` 和 `&User{}` 都得到指向零值结构体的指针。复合字面量还能直接设置字段：

```go
package main

import "fmt"

type User struct {
	Name string
	Age  int
}

func main() {
	a, b := new(User), &User{}
	c := &User{Name: "Lin", Age: 18}
	fmt.Println(*a == *b, c.Name, c.Age)
}
```

输出：`true Lin 18`。

`new` 不会替结构体字段里的map、切片等继续分配可写数据；这些字段仍是 nil：

```go
package main

import "fmt"

type Config struct {
	Names map[string]string
	Data  []byte
}

func main() {
	c := new(Config)
	fmt.Println(c.Names == nil, c.Data == nil)
	c.Names = make(map[string]string)
	c.Data = make([]byte, 0)
	fmt.Println(c.Names == nil, c.Data == nil)
}
```

输出：`true true`，然后是 `false false`。

# `make` 初始化切片、map和通道

**`make` 只接受切片、map和通道类型**，返回对应类型本身，不返回指针：

```go
package main

import "fmt"

func main() {
	s := make([]int, 3)
	m := make(map[string]int)
	ch := make(chan int, 2)
	fmt.Printf("%T %T %T\n", s, m, ch)
}
```

输出：`[]int map[string]int chan int`。因此 `make(int)` 和 `make(*[]int)` 都无法通过编译；`new([]int)` 的结果是 `*[]int`。

# 切片：长度、容量和底层数组

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

输出：`3 3 2 3`。复制切片只会复制切片描述信息，底层数组仍可能共享。下面先通过副本修改同一数组，再让 `append` 超出容量：

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

输出：`9`，然后是 `9 7`。`append` 超出容量后会使用足够大的底层存储，但具体扩容策略不是语言规范保证的。

# map：nil 值不能写入

读取 nil map中不存在的键会得到元素零值；向 nil map写入会 panic。用 `make` 初始化后才能正常写入：

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

# 通道：nil 与已初始化的通道

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

输出：`true 0`，然后是 `42`。代码没有对 nil 通道收发，因为那会让程序停住。无缓冲通道的发送和接收需要同步；缓冲通道在未满时可以发送，在有值时可以接收。通道关闭后仍可读出缓冲值；缓冲区读空后，接收会得到元素零值和 `false`：

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

# 两者可以组合使用

`new` 可以得到map、切片或通道变量的指针，但指针指向的值仍是 nil。需要可写map时，先 `make` 再赋给它；大多数情况下直接用 `make` 的结果即可：

```go
package main

import "fmt"

func main() {
	p := new(map[string]int)
	fmt.Println(*p == nil)
	*p = make(map[string]int)
	(*p)["count"] = 1
	fmt.Println((*p)["count"])
}
```

输出：`true`，然后是 `1`。`new([]int)` 与 `make([]int, 0)` 也不同：前者指向 nil 切片，后者是非 nil 的空切片：

```go
package main

import "fmt"

func main() {
	p := new([]int)
	s := make([]int, 0)
	fmt.Println(*p == nil, s == nil)
	*p = append(*p, 1)
	fmt.Println(*p)
}
```

输出：`true false`，然后是 `[1]`。

# 分配位置由逃逸分析决定

`new` 和 `make` 都不保证对象一定分配在堆上。编译器会根据值是否逃出当前函数等情况决定分配方式；当指针不逃出函数时，编译器可能省去堆分配：

```go
package main

import "fmt"

func local() int {
	p := new(int)
	*p = 3
	return *p
}

func escaped() *int {
	p := new(int)
	*p = 3
	return p
}

func main() {
	fmt.Println(local(), *escaped())
}
```

输出：`3 3`。可以用 `go build -gcflags=-m` 查看当前编译器的逃逸分析结果；诊断内容会随 Go 版本和代码上下文变化。运行时如何组织map、通道及切片扩容也属于实现细节，不应当作语言保证。

# 对比

| 项目 | `new(T)` | `make(T, ...)` |
| --- | --- | --- |
| 支持的类型 | 任意类型 | 切片、map、通道 |
| 返回值 | `*T` | `T` 本身 |
| 初始状态 | 指向 `T` 的零值 | 类型已初始化，可按其规则使用 |
| 常见用途 | 需要零值对象的指针 | 创建切片、可写map或可通信的通道 |

```go
package main

import "fmt"

type Record struct{ ID int }

func main() {
	r := new(Record)
	list := make([]Record, 2)
	index := make(map[int]*Record)
	index[1] = r
	fmt.Printf("%T %T %T; %d %d\n", r, list, index, len(list), index[1].ID)
}
```

输出：`*main.Record []main.Record map[int]*main.Record; 2 0`。简单来说：要零值指针用 `new`；要初始化切片、map或通道用 `make`。
