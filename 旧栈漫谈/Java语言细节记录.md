*本文章记录平时遇到的Java语法/语言上的一些细节问题*

# 集合

1. LinkedList当做栈使用时的方法是：push/addFirst和pop/removeFirst。也就是说**栈口在链表头部**；当队列使用时的方法是：offer/add和poll/无参的remove，也就是说**队头在链表尾部**，**队尾在链表头部**，在链表右边添加新元素，在链表左边删除元素。
2. ArrayList的set(index,element)是替换index处的值，前提是该处已经存在元素，否则会下标越界抛异常。
3. 判断两个list集合是否equals，不仅要包含相同的元素，元素的顺序还得要一致。
4. LinkedList里面有重载的两个remove方法：remove(int index) - 移除指定位置的元素和remove(Object o) - 移除第一个出现的指定元素。当LinkedList\<Integer\>时，remove(1)，它怎么知道我是想删除下标为1的元素，还是想删除1这个元素的？
   Java的自动装箱(autoboxing)不是在所有情况下都优先的。当有完全匹配的非装箱版本方法时，Java会优先选择它。所以remove(1)是删除下标为1的元素，remove(Integer.valueOf(1))才是删除1这个元素。

# 基本语法

1. 加减乘除运算符的优先级是高于位运算符的。
1. Java中，子类是能通过继承得到父类的私有字段的，对象的内存结构中是包含父类的私有字段的，并且可以通过反射用父类的class对象得到该私有字段的值，但是子类访问不到父类的私有字段。
1. protected或default修饰的字段和方法，本包的子包也不可以访问。Java中的包不存在父子关系，a.b和a.b.c是两个完全独立的包。另外，子类中也无法访问父类实例的protected修饰的字段和方法，但子类中可以访问子类实例的protected修饰的字段和方法。
1. Java中，单继承多实现说的类，一个接口是可以继承多个接口的。
1. 创建非静态内部类对象要先创建出外部类实例，new Outer().new Inner();静态内部类对象可以不用先创建出外部类实例，new Outer.Inner();