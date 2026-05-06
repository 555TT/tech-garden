# Golang数据类型

## 占用的内存大小

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

unsafe.SizeOf() 得到的是变量本身占用的字节大小，而不是实际数据的字节大小

```go
var str = "柒水浩"
fmt.Println(unsafe.Sizeof(str)) // string本质是一个struct{Data *byte Len int}，8字节的指针和8字节的int，16
fmt.Println(len(str))	// 9，UniCode编码中，一个汉字占用三个字节
```

## 数据类型分类

### 按基本/复合来分

1. 基本类型

* 数值类型：
  * 整形：有符号整数 int、int8、int16、int32、int64、byte(int8 的别名)、rune(int32 的别名，代表一个 Unicode 码点)；无符号类型 uint、uint8、uint16、uint32、uint64、uintptr
  * 浮点形：float32、float64
  * 复数：complex64、complex128
* 字符串：string
* 布尔：bool

2. 复合类型

数组[3]int、切片[]int、map、指针、接口 interface、函数 func()、chan、结构体 struct

### 按值语义/引用语义来分

1. 值语义（参数传递时整体拷贝）

基本类型、数组、结构体

2. 引用语义（参数传递时拷贝引用地址，共享底层数据结构）

切片、map、指针、接口、函数、chan

### 按照是否可比较分类

在 Go 中，是否可比较的意思是否可以用`==`来运算。

1. 可比较：基本类型、指针、数组（元素可比较）、结构体（必须全部元素可比较）、chan、接口

基本类型、数组、结构体在用`==`运算时比较的是具体的值是否相等。

指针、`chan`可比较的前提是数据是同类型的指针/同类型的 `chan`，且`==`在运算时比较的是地址是否相同，即是否是一个实例。

```go
func1 := func() {
		fmt.Println(1)
	}
s1 := "111"
ptr1 := &func1
ptr2 := &s1
fmt.Println(ptr1 == ptr2)	// 编译错误,不可比较，*func() 和 *string 类型不匹配
ch1 := make(chan int)
ch2 := make(chan string)
fmt.Println(ch1 == ch2)	//	编译错误，不可比较，chan int 和 chan string不匹配
ch3 := make(chan byte)
ch4 := make(chan byte)
ch5 := ch3
fmt.Println(ch3 == ch4)	//	false，可比较，比较的是内存地址是否相等
fmt.Println(ch3 == ch5)	//	true，可比较
```

接口由两部分 type 和 value 两部分组成，两个接口类型的变量可以比较的前提是 type 是可比较

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

2. 不可比较：函数、切片、map（函数、切片、map 中均未定义`==`这个运算符）

Go 规范明确规定：map 的 key 类型必须支持 `==` 比较操作。可以这么说，**可比较的数据类型一定可以作为 map 的 key，可以作为 map 的 key 的数据类型一定可比较**。

## 数据类型底层剖析
