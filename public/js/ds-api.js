// DS Mart - C Engine Bridge
// Communicates with native C backend (ds_core.exe via server.js)
// Includes full in-memory C-struct emulation if running offline/static

class DSApi {
    constructor() {
        this.baseUrl = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:3000';
        this.isBackendOnline = false;
        this.cLogs = [];
        this.memoryCounter = 0x62e67000;
        
        // Local C struct state mirror
        this.state = {
            stack: {
                type: "Stack (LIFO - Last In First Out)",
                top: -1,
                capacity: 32,
                count: 0,
                is_empty: true,
                items: []
            },
            linked_list: {
                type: "Singly Linked List (Pointers)",
                head_address: "0x00000000",
                length: 0,
                nodes: []
            },
            queue: {
                type: "Linear Queue (FIFO - First In First Out)",
                front_address: "0x62e670e0",
                rear_address: "0x62e67230",
                count: 4,
                is_empty: false,
                customers: [
                    { pos: 0, id: 1, name: "Rohan (Customer #1)", items: 2, total: 14.50, address: "0x62e670e0", next: "0x62e67150" },
                    { pos: 1, id: 2, name: "Priya (Customer #2)", items: 4, total: 28.00, address: "0x62e67150", next: "0x62e671c0" },
                    { pos: 2, id: 3, name: "Alex (Customer #3)", items: 1, total: 6.20, address: "0x62e671c0", next: "0x62e67230" },
                    { pos: 3, id: 4, name: "Meera (Customer #4)", items: 3, total: 19.80, address: "0x62e67230", next: "0x00000000" }
                ]
            },
            last_operation: "[C Engine] Initialized Stack, Singly Linked List, and Queue structs."
        };

        this.addCLog("[C Engine] System boot: sizeof(Product)=144, sizeof(Node)=152, sizeof(QueueNode)=88");
        this.checkBackend();
    }

    addCLog(logText) {
        const time = new Date().toLocaleTimeString();
        this.cLogs.unshift(`[${time}] ${logText}`);
        if (this.cLogs.length > 50) this.cLogs.pop();
        if (window.updateCLogDisplay) window.updateCLogDisplay();
    }

    async checkBackend() {
        try {
            const res = await fetch(`${this.baseUrl}/api/ds/state`, { signal: AbortSignal.timeout(1500) });
            if (res.ok) {
                const data = await res.json();
                this.state = data;
                this.isBackendOnline = true;
                this.addCLog("[C Engine Native] Connected to compiled ds_core.exe binary.");
                return true;
            }
        } catch (e) {
            this.isBackendOnline = false;
            this.addCLog("[C Engine Virtual] Running local C-struct virtualization mode.");
        }
        return false;
    }

    nextMemoryAddr() {
        this.memoryCounter += 0x70;
        return "0x" + this.memoryCounter.toString(16);
    }

    async pushProduct(name, price, category) {
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/ds/stack/push`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, price, category })
                });
                const data = await res.json();
                this.state = data;
                this.addCLog(`[C Native] stack_push(&trolley_stack, {"${name}", $${price}}); -> Top: ${data.stack.top}`);
                this.addCLog(`[C Native] list_insert(&inventory_list, {"${name}", $${price}}); -> Head: ${data.linked_list.head_address}`);
                return data;
            } catch (err) {
                console.warn('Backend push failed, falling back to local C emulation', err);
            }
        }

        // C-Struct Fallback Emulation
        const newItem = { index: this.state.stack.items.length, name, price, category };
        this.state.stack.items.push(newItem);
        this.state.stack.top = this.state.stack.items.length - 1;
        this.state.stack.count = this.state.stack.items.length;
        this.state.stack.is_empty = false;

        // Linked List Insert
        const nodeAddr = this.nextMemoryAddr();
        const prevLast = this.state.linked_list.nodes[this.state.linked_list.nodes.length - 1];
        if (prevLast) {
            prevLast.next = nodeAddr;
        } else {
            this.state.linked_list.head_address = nodeAddr;
        }

        const newNode = {
            index: this.state.linked_list.nodes.length,
            name,
            price,
            category,
            address: nodeAddr,
            next: "0x00000000"
        };
        this.state.linked_list.nodes.push(newNode);
        this.state.linked_list.length = this.state.linked_list.nodes.length;

        const opMsg = `[C STACK PUSH & LIST INSERT] Added '${name}' ($${price.toFixed(2)}). Stack Top: ${this.state.stack.top}, Node Address: ${nodeAddr}`;
        this.state.last_operation = opMsg;
        this.addCLog(`[C Code] malloc(sizeof(Node)) => ${nodeAddr}`);
        this.addCLog(`[C Code] stack.items[++stack.top] = "${name}" (top = ${this.state.stack.top})`);
        this.addCLog(`[C Code] list_node->next = NULL; list.size = ${this.state.linked_list.length}`);

        return this.state;
    }

    async popProduct() {
        if (this.state.stack.items.length === 0) {
            return { error: "Stack Underflow! Trolley is already empty." };
        }

        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/ds/stack/pop`, { method: 'POST' });
                const data = await res.json();
                this.state = data;
                this.addCLog(`[C Native] stack_pop(&trolley_stack); -> Top: ${data.stack.top}`);
                return data;
            } catch (err) {
                console.warn('Backend pop failed, using local C emulation', err);
            }
        }

        // C-Struct Pop
        const poppedItem = this.state.stack.items.pop();
        this.state.stack.top = this.state.stack.items.length - 1;
        this.state.stack.count = this.state.stack.items.length;
        this.state.stack.is_empty = this.state.stack.items.length === 0;

        // Linked list delete from tail/matching
        const removeIdx = this.state.linked_list.nodes.findIndex(n => n.name === poppedItem.name);
        if (removeIdx !== -1) {
            const freed = this.state.linked_list.nodes.splice(removeIdx, 1)[0];
            if (this.state.linked_list.nodes.length > 0 && removeIdx > 0) {
                this.state.linked_list.nodes[removeIdx - 1].next =
                    this.state.linked_list.nodes[removeIdx] ? this.state.linked_list.nodes[removeIdx].address : "0x00000000";
            } else if (this.state.linked_list.nodes.length === 0) {
                this.state.linked_list.head_address = "0x00000000";
            }
            this.state.linked_list.length = this.state.linked_list.nodes.length;
            this.addCLog(`[C Code] free(${freed.address}) => Deallocated Node('${freed.name}')`);
        }

        const opMsg = `[C STACK POP] Removed '${poppedItem.name}' (LIFO principle). Stack Top now: ${this.state.stack.top}`;
        this.state.last_operation = opMsg;
        this.addCLog(`[C Code] stack_pop: item = stack.items[top--]; (LIFO)`);

        return { popped: poppedItem, state: this.state };
    }

    async dequeueCustomer() {
        if (this.state.queue.customers.length === 0) {
            return { error: "Queue is empty! All customers have been served." };
        }

        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/ds/queue/dequeue`, { method: 'POST' });
                const data = await res.json();
                this.state = data;
                this.addCLog(`[C Native] queue_dequeue(&billing_queue); -> Remaining: ${data.queue.count}`);
                return data;
            } catch (err) {
                console.warn('Backend dequeue failed, using local emulation', err);
            }
        }

        const served = this.state.queue.customers.shift();
        this.state.queue.count = this.state.queue.customers.length;
        this.state.queue.is_empty = this.state.queue.customers.length === 0;
        if (this.state.queue.customers.length > 0) {
            this.state.queue.front_address = this.state.queue.customers[0].address;
        } else {
            this.state.queue.front_address = "0x00000000";
            this.state.queue.rear_address = "0x00000000";
        }

        // Re-index
        this.state.queue.customers.forEach((c, i) => c.pos = i);

        const opMsg = `[C QUEUE DEQUEUE] Served Customer '${served.name}' (FIFO). Queue count: ${this.state.queue.count}`;
        this.state.last_operation = opMsg;
        this.addCLog(`[C Code] temp = queue.front; queue.front = queue.front->next; free(temp); [FIFO]`);
        this.addCLog(`[C Code] Customer '${served.name}' billed and departed.`);

        return { served, state: this.state };
    }

    async enqueueCustomer(name, items, total) {
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/ds/queue/enqueue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, items, total })
                });
                const data = await res.json();
                this.state = data;
                this.addCLog(`[C Native] queue_enqueue(&billing_queue, "${name}"); -> Count: ${data.queue.count}`);
                return data;
            } catch (err) {
                console.warn('Backend enqueue failed', err);
            }
        }

        const newAddr = this.nextMemoryAddr();
        const prevRear = this.state.queue.customers[this.state.queue.customers.length - 1];
        if (prevRear) {
            prevRear.next = newAddr;
        }

        const newCustomer = {
            pos: this.state.queue.customers.length,
            id: this.state.queue.customers.length + 1,
            name: name || `Customer #${this.state.queue.customers.length + 1}`,
            items: items || 2,
            total: total || 12.50,
            address: newAddr,
            next: "0x00000000"
        };

        this.state.queue.customers.push(newCustomer);
        this.state.queue.rear_address = newAddr;
        if (this.state.queue.customers.length === 1) {
            this.state.queue.front_address = newAddr;
        }
        this.state.queue.count = this.state.queue.customers.length;
        this.state.queue.is_empty = false;

        const opMsg = `[C QUEUE ENQUEUE] Customer '${newCustomer.name}' added to rear (FIFO). Total: ${this.state.queue.count}`;
        this.state.last_operation = opMsg;
        this.addCLog(`[C Code] queue.rear->next = new_node; queue.rear = new_node; (Enqueue)`);

        return this.state;
    }

    async searchList(itemName) {
        if (this.isBackendOnline) {
            try {
                const res = await fetch(`${this.baseUrl}/api/ds/list/search`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: itemName })
                });
                const data = await res.json();
                return data;
            } catch (e) {
                console.warn('Backend search failed', e);
            }
        }

        // Local search simulation with step-by-step traversal
        const steps = [];
        let found = false;
        let foundNode = null;
        let index = 0;

        for (const node of this.state.linked_list.nodes) {
            steps.push({
                index,
                nodeAddress: node.address,
                nodeName: node.name,
                nextAddress: node.next,
                isTarget: node.name.toLowerCase() === itemName.toLowerCase()
            });

            if (node.name.toLowerCase() === itemName.toLowerCase()) {
                found = true;
                foundNode = node;
                break;
            }
            index++;
        }

        this.addCLog(`[C Code] list_search: Traversing linked list for "${itemName}"... Steps: ${steps.length}`);
        return { found, foundNode, steps, target: itemName };
    }

    async reset() {
        if (this.isBackendOnline) {
            try {
                await fetch(`${this.baseUrl}/api/ds/reset`, { method: 'POST' });
            } catch (e) {}
        }
        this.state.stack.items = [];
        this.state.stack.top = -1;
        this.state.stack.count = 0;
        this.state.stack.is_empty = true;

        this.state.linked_list.nodes = [];
        this.state.linked_list.head_address = "0x00000000";
        this.state.linked_list.length = 0;

        this.state.queue.customers = [
            { pos: 0, id: 1, name: "Rohan (Customer #1)", items: 2, total: 14.50, address: "0x62e670e0", next: "0x62e67150" },
            { pos: 1, id: 2, name: "Priya (Customer #2)", items: 4, total: 28.00, address: "0x62e67150", next: "0x62e671c0" },
            { pos: 2, id: 3, name: "Alex (Customer #3)", items: 1, total: 6.20, address: "0x62e671c0", next: "0x62e67230" },
            { pos: 3, id: 4, name: "Meera (Customer #4)", items: 3, total: 19.80, address: "0x62e67230", next: "0x00000000" }
        ];
        this.state.queue.front_address = "0x62e670e0";
        this.state.queue.rear_address = "0x62e67230";
        this.state.queue.count = 4;
        this.state.queue.is_empty = false;
        this.state.last_operation = "[C RESET] Reset all Stack, Linked List, and Queue memory structures.";
        this.addCLog("[C Engine] Memory reset to initial baseline.");
        return this.state;
    }
}

window.dsApi = new DSApi();
