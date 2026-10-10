#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_STACK_SIZE 32
#define STATE_FILE "ds_state.bin"

/* Product struct stored in Stack & Linked List */
typedef struct {
    int id;
    char name[64];
    double price;
    char category[64];
    long timestamp;
} Product;

/* Stack implementation (Trolley - LIFO) */
typedef struct {
    Product items[MAX_STACK_SIZE];
    int top;
} Stack;

/* Linked List Node (Product Inventory - Sequential & Pointer-linked) */
typedef struct Node {
    Product data;
    unsigned long memory_address; /* For visual inspection */
    struct Node* next;
} Node;

typedef struct {
    Node* head;
    int size;
} LinkedList;

/* Customer struct for Queue */
typedef struct {
    int id;
    char name[64];
    int items_count;
    double total_amount;
} Customer;

/* Queue Node (Billing Line - FIFO) */
typedef struct QueueNode {
    Customer data;
    unsigned long memory_address;
    struct QueueNode* next;
} QueueNode;

typedef struct {
    QueueNode* front;
    QueueNode* rear;
    int count;
} Queue;

/* Global state pointers */
static Stack g_stack;
static LinkedList g_list;
static Queue g_queue;
static char g_last_op[256] = "System initialized";
static char g_c_logs[1024] = "[C Engine] Stack, Linked List, and Queue structures ready.\n";

/* Stack operations */
void stack_init(Stack* s) {
    s->top = -1;
}

int stack_is_empty(Stack* s) {
    return s->top == -1;
}

int stack_is_full(Stack* s) {
    return s->top >= MAX_STACK_SIZE - 1;
}

int stack_push(Stack* s, Product p) {
    if (stack_is_full(s)) return 0;
    s->items[++(s->top)] = p;
    return 1;
}

int stack_pop(Stack* s, Product* out) {
    if (stack_is_empty(s)) return 0;
    if (out) *out = s->items[(s->top)--];
    else (s->top)--;
    return 1;
}

Product* stack_peek(Stack* s) {
    if (stack_is_empty(s)) return NULL;
    return &s->items[s->top];
}

/* Linked List operations */
void list_init(LinkedList* list) {
    list->head = NULL;
    list->size = 0;
}

void list_insert(LinkedList* list, Product p) {
    Node* new_node = (Node*)malloc(sizeof(Node));
    new_node->data = p;
    new_node->memory_address = (unsigned long)(uintptr_t)new_node;
    new_node->next = NULL;

    if (list->head == NULL) {
        list->head = new_node;
    } else {
        Node* curr = list->head;
        while (curr->next != NULL) {
            curr = curr->next;
        }
        curr->next = new_node;
    }
    list->size++;
}

int list_delete(LinkedList* list, const char* name) {
    if (list->head == NULL) return 0;

    Node* curr = list->head;
    Node* prev = NULL;

    while (curr != NULL) {
        if (strcmp(curr->data.name, name) == 0) {
            if (prev == NULL) {
                list->head = curr->next;
            } else {
                prev->next = curr->next;
            }
            free(curr);
            list->size--;
            return 1;
        }
        prev = curr;
        curr = curr->next;
    }
    return 0;
}

int list_search(LinkedList* list, const char* name, int* out_index, Node** out_node) {
    Node* curr = list->head;
    int index = 0;
    while (curr != NULL) {
        if (strcmp(curr->data.name, name) == 0) {
            if (out_index) *out_index = index;
            if (out_node) *out_node = curr;
            return 1;
        }
        curr = curr->next;
        index++;
    }
    return 0;
}

/* Queue operations */
void queue_init(Queue* q) {
    q->front = NULL;
    q->rear = NULL;
    q->count = 0;
}

int queue_is_empty(Queue* q) {
    return q->front == NULL;
}

void queue_enqueue(Queue* q, Customer c) {
    QueueNode* new_node = (QueueNode*)malloc(sizeof(QueueNode));
    new_node->data = c;
    new_node->memory_address = (unsigned long)(uintptr_t)new_node;
    new_node->next = NULL;

    if (q->rear == NULL) {
        q->front = q->rear = new_node;
    } else {
        q->rear->next = new_node;
        q->rear = new_node;
    }
    q->count++;
}

int queue_dequeue(Queue* q, Customer* out) {
    if (queue_is_empty(q)) return 0;

    QueueNode* temp = q->front;
    if (out) *out = temp->data;

    q->front = q->front->next;
    if (q->front == NULL) {
        q->rear = NULL;
    }
    free(temp);
    q->count--;
    return 1;
}

Customer* queue_peek(Queue* q) {
    if (queue_is_empty(q)) return NULL;
    return &q->front->data;
}

/* Serialization / Deserialization helper to persist across CLI executions */
void save_state() {
    FILE* fp = fopen(STATE_FILE, "wb");
    if (!fp) return;

    /* Write stack */
    fwrite(&g_stack.top, sizeof(int), 1, fp);
    if (g_stack.top >= 0) {
        fwrite(g_stack.items, sizeof(Product), g_stack.top + 1, fp);
    }

    /* Write list */
    fwrite(&g_list.size, sizeof(int), 1, fp);
    Node* curr = g_list.head;
    while (curr) {
        fwrite(&curr->data, sizeof(Product), 1, fp);
        curr = curr->next;
    }

    /* Write queue */
    fwrite(&g_queue.count, sizeof(int), 1, fp);
    QueueNode* qcurr = g_queue.front;
    while (qcurr) {
        fwrite(&qcurr->data, sizeof(Customer), 1, fp);
        qcurr = qcurr->next;
    }

    /* Write last op */
    fwrite(g_last_op, sizeof(char), 256, fp);
    fclose(fp);
}

void load_state() {
    stack_init(&g_stack);
    list_init(&g_list);
    queue_init(&g_queue);

    FILE* fp = fopen(STATE_FILE, "rb");
    if (!fp) {
        /* Initialize default queue with 4 supermarket customers matching screenshot! */
        Customer c1 = {1, "Rohan (Customer #1)", 2, 14.50};
        Customer c2 = {2, "Priya (Customer #2)", 4, 28.00};
        Customer c3 = {3, "Alex (Customer #3)", 1, 6.20};
        Customer c4 = {4, "Meera (Customer #4)", 3, 19.80};
        queue_enqueue(&g_queue, c1);
        queue_enqueue(&g_queue, c2);
        queue_enqueue(&g_queue, c3);
        queue_enqueue(&g_queue, c4);
        save_state();
        return;
    }

    /* Read stack */
    if (fread(&g_stack.top, sizeof(int), 1, fp) == 1) {
        if (g_stack.top >= 0 && g_stack.top < MAX_STACK_SIZE) {
            fread(g_stack.items, sizeof(Product), g_stack.top + 1, fp);
        }
    }

    /* Read list */
    int list_size = 0;
    if (fread(&list_size, sizeof(int), 1, fp) == 1) {
        for (int i = 0; i < list_size; i++) {
            Product p;
            if (fread(&p, sizeof(Product), 1, fp) == 1) {
                list_insert(&g_list, p);
            }
        }
    }

    /* Read queue */
    int q_size = 0;
    if (fread(&q_size, sizeof(int), 1, fp) == 1) {
        for (int i = 0; i < q_size; i++) {
            Customer c;
            if (fread(&c, sizeof(Customer), 1, fp) == 1) {
                queue_enqueue(&g_queue, c);
            }
        }
    }

    fread(g_last_op, sizeof(char), 256, fp);
    fclose(fp);
}

/* Output formatted JSON for frontend consumption */
void print_json_state(int success, const char* message) {
    printf("{\n");
    printf("  \"status\": \"%s\",\n", success ? "success" : "error");
    printf("  \"message\": \"%s\",\n", message);
    printf("  \"last_operation\": \"%s\",\n", g_last_op);

    /* Output Stack JSON */
    printf("  \"stack\": {\n");
    printf("    \"type\": \"Stack (LIFO - Last In First Out)\",\n");
    printf("    \"top\": %d,\n", g_stack.top);
    printf("    \"capacity\": %d,\n", MAX_STACK_SIZE);
    printf("    \"count\": %d,\n", g_stack.top + 1);
    printf("    \"is_empty\": %s,\n", stack_is_empty(&g_stack) ? "true" : "false");
    printf("    \"items\": [\n");
    for (int i = 0; i <= g_stack.top; i++) {
        printf("      {\"index\": %d, \"name\": \"%s\", \"price\": %.2f, \"category\": \"%s\"}%s\n",
               i, g_stack.items[i].name, g_stack.items[i].price, g_stack.items[i].category,
               (i == g_stack.top) ? "" : ",");
    }
    printf("    ]\n");
    printf("  },\n");

    /* Output Linked List JSON */
    printf("  \"linked_list\": {\n");
    printf("    \"type\": \"Singly Linked List (Pointers)\",\n");
    printf("    \"head_address\": \"0x%p\",\n", (void*)g_list.head);
    printf("    \"length\": %d,\n", g_list.size);
    printf("    \"nodes\": [\n");
    Node* curr = g_list.head;
    int idx = 0;
    while (curr) {
        printf("      {\"index\": %d, \"name\": \"%s\", \"price\": %.2f, \"category\": \"%s\", \"address\": \"0x%lx\", \"next\": \"0x%p\"}%s\n",
               idx, curr->data.name, curr->data.price, curr->data.category,
               curr->memory_address, (void*)curr->next,
               (curr->next == NULL) ? "" : ",");
        curr = curr->next;
        idx++;
    }
    printf("    ]\n");
    printf("  },\n");

    /* Output Queue JSON */
    printf("  \"queue\": {\n");
    printf("    \"type\": \"Linear Queue (FIFO - First In First Out)\",\n");
    printf("    \"front_address\": \"0x%p\",\n", (void*)g_queue.front);
    printf("    \"rear_address\": \"0x%p\",\n", (void*)g_queue.rear);
    printf("    \"count\": %d,\n", g_queue.count);
    printf("    \"is_empty\": %s,\n", queue_is_empty(&g_queue) ? "true" : "false");
    printf("    \"customers\": [\n");
    QueueNode* qcurr = g_queue.front;
    int qidx = 0;
    while (qcurr) {
        printf("      {\"pos\": %d, \"id\": %d, \"name\": \"%s\", \"items\": %d, \"total\": %.2f, \"address\": \"0x%lx\", \"next\": \"0x%p\"}%s\n",
               qidx, qcurr->data.id, qcurr->data.name, qcurr->data.items_count, qcurr->data.total_amount,
               qcurr->memory_address, (void*)qcurr->next,
               (qcurr->next == NULL) ? "" : ",");
        qcurr = qcurr->next;
        qidx++;
    }
    printf("    ]\n");
    printf("  }\n");
    printf("}\n");
}

int main(int argc, char* argv[]) {
    load_state();

    if (argc < 2) {
        print_json_state(1, "Current state retrieved from C memory");
        return 0;
    }

    const char* cmd = argv[1];

    if (strcmp(cmd, "state") == 0) {
        print_json_state(1, "Current state retrieved from C memory");
    }
    else if (strcmp(cmd, "push") == 0) {
        if (argc < 3) {
            print_json_state(0, "Error: Product name required for push");
            return 1;
        }
        const char* name = argv[2];
        double price = (argc >= 4) ? atof(argv[3]) : 2.50;
        const char* cat = (argc >= 5) ? argv[4] : "Groceries";

        Product p;
        p.id = g_stack.top + 2;
        strncpy(p.name, name, sizeof(p.name) - 1);
        p.name[sizeof(p.name) - 1] = '\0';
        p.price = price;
        strncpy(p.category, cat, sizeof(p.category) - 1);
        p.category[sizeof(p.category) - 1] = '\0';
        p.timestamp = (long)time(NULL);

        if (stack_push(&g_stack, p)) {
            list_insert(&g_list, p);
            snprintf(g_last_op, sizeof(g_last_op),
                     "[C STACK PUSH & LIST INSERT] Added '%s' ($%.2f). Stack Top: %d, List Size: %d",
                     p.name, p.price, g_stack.top, g_list.size);
            save_state();
            print_json_state(1, "Product pushed to Stack & inserted into Linked List");
        } else {
            print_json_state(0, "Stack Overflow! Trolley is full");
        }
    }
    else if (strcmp(cmd, "pop") == 0) {
        Product popped;
        if (stack_pop(&g_stack, &popped)) {
            list_delete(&g_list, popped.name);
            snprintf(g_last_op, sizeof(g_last_op),
                     "[C STACK POP & LIST DELETE] Popped '%s' from Stack (LIFO). Top: %d",
                     popped.name, g_stack.top);
            save_state();
            print_json_state(1, "Top product popped from Stack and deleted from Linked List");
        } else {
            print_json_state(0, "Stack Underflow! Trolley is already empty");
        }
    }
    else if (strcmp(cmd, "search") == 0) {
        if (argc < 3) {
            print_json_state(0, "Product name required for search");
            return 1;
        }
        int index = -1;
        Node* found_node = NULL;
        if (list_search(&g_list, argv[2], &index, &found_node)) {
            snprintf(g_last_op, sizeof(g_last_op),
                     "[C LIST SEARCH] Found '%s' at Node Index %d (Address: 0x%lx)",
                     argv[2], index, found_node->memory_address);
            print_json_state(1, "Item found in Linked List");
        } else {
            snprintf(g_last_op, sizeof(g_last_op),
                     "[C LIST SEARCH] Product '%s' not found in Linked List", argv[2]);
            print_json_state(0, "Product not in cart");
        }
    }
    else if (strcmp(cmd, "dequeue") == 0) {
        Customer served;
        if (queue_dequeue(&g_queue, &served)) {
            snprintf(g_last_op, sizeof(g_last_op),
                     "[C QUEUE DEQUEUE] Served Customer '%s' (FIFO). Queue count remaining: %d",
                     served.name, g_queue.count);
            save_state();
            print_json_state(1, "Customer served from front of queue");
        } else {
            print_json_state(0, "Queue is empty! No more customers in line");
        }
    }
    else if (strcmp(cmd, "enqueue") == 0) {
        const char* cname = (argc >= 3) ? argv[2] : "New Shopper";
        int items = (argc >= 4) ? atoi(argv[3]) : 3;
        double amt = (argc >= 5) ? atof(argv[4]) : 15.00;

        Customer c;
        c.id = g_queue.count + 1;
        strncpy(c.name, cname, sizeof(c.name) - 1);
        c.name[sizeof(c.name) - 1] = '\0';
        c.items_count = items;
        c.total_amount = amt;

        queue_enqueue(&g_queue, c);
        snprintf(g_last_op, sizeof(g_last_op),
                 "[C QUEUE ENQUEUE] Enqueued Customer '%s' at rear. Total in Queue: %d",
                 c.name, g_queue.count);
        save_state();
        print_json_state(1, "New customer joined queue");
    }
    else if (strcmp(cmd, "reset") == 0) {
        remove(STATE_FILE);
        stack_init(&g_stack);
        list_init(&g_list);
        queue_init(&g_queue);
        Customer c1 = {1, "Rohan (Customer #1)", 2, 14.50};
        Customer c2 = {2, "Priya (Customer #2)", 4, 28.00};
        Customer c3 = {3, "Alex (Customer #3)", 1, 6.20};
        Customer c4 = {4, "Meera (Customer #4)", 3, 19.80};
        queue_enqueue(&g_queue, c1);
        queue_enqueue(&g_queue, c2);
        queue_enqueue(&g_queue, c3);
        queue_enqueue(&g_queue, c4);
        snprintf(g_last_op, sizeof(g_last_op), "[C RESET] All Data Structures re-initialized to initial state.");
        save_state();
        print_json_state(1, "Data structures reset to fresh state");
    }
    else {
        print_json_state(0, "Unknown command");
    }

    return 0;
}
