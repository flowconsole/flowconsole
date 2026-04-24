using FlowConsole.Core.ValueObjects;

namespace FlowConsole.Graph.Cache;

public sealed class LruGraphCache
{
    private readonly int _capacity;
    private readonly object _lock = new();
    private readonly Dictionary<ModelId, LinkedListNode<CacheEntry>> _map = new();
    private readonly LinkedList<CacheEntry> _order = new();

    public LruGraphCache(int capacity = 50)
    {
        if (capacity <= 0)
            throw new ArgumentOutOfRangeException(nameof(capacity), "Capacity must be positive.");
        _capacity = capacity;
    }

    public int Count
    {
        get { lock (_lock) { return _map.Count; } }
    }

    public GraphSnapshot? Get(ModelId modelId)
    {
        lock (_lock)
        {
            if (!_map.TryGetValue(modelId, out var node))
                return null;

            // Move to front (most recently used)
            _order.Remove(node);
            _order.AddFirst(node);
            return node.Value.Snapshot;
        }
    }

    public void Set(ModelId modelId, GraphSnapshot snapshot)
    {
        lock (_lock)
        {
            if (_map.TryGetValue(modelId, out var existing))
            {
                _order.Remove(existing);
                _map.Remove(modelId);
            }

            var entry = new CacheEntry(modelId, snapshot);
            var node = _order.AddFirst(entry);
            _map[modelId] = node;

            while (_map.Count > _capacity)
            {
                var last = _order.Last!;
                _order.RemoveLast();
                _map.Remove(last.Value.Key);
            }
        }
    }

    public void Invalidate(ModelId modelId)
    {
        lock (_lock)
        {
            if (_map.TryGetValue(modelId, out var node))
            {
                _order.Remove(node);
                _map.Remove(modelId);
            }
        }
    }

    public void InvalidateAll()
    {
        lock (_lock)
        {
            _map.Clear();
            _order.Clear();
        }
    }

    private sealed record CacheEntry(ModelId Key, GraphSnapshot Snapshot);
}
