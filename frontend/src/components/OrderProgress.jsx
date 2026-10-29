const getTrackingSteps = (item) => item.type === 'Cho thuê'
    ? ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Đang giao', 'Đang thuê', 'Chờ trả đồ', 'Đã trả']
    : ['Chờ xác nhận', 'Đã xác nhận', 'Đang chuẩn bị', 'Đang giao', 'Đã giao'];

const formatDate = (date) => new Date(date).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
});

const OrderProgress = ({ item }) => {
    const currentStatus = item.item_status === 'SOLD' ? 'Đã xác nhận' : item.item_status;
    const steps = getTrackingSteps(item);
    const currentIndex = steps.indexOf(currentStatus);
    const terminalStatus = ['Từ chối', 'Đã hủy'].includes(currentStatus);
    const history = Array.isArray(item.status_history) ? item.status_history : [];

    return (
        <section className="order-progress" aria-label={`Tiến trình đơn hàng: ${currentStatus}`}>
            <div className="order-progress-heading">
                <strong>Tiến trình</strong>
                <span className={`order-progress-current${terminalStatus ? ' is-terminal' : ''}`}>{currentStatus}</span>
            </div>
            {terminalStatus ? (
                <p className="order-progress-terminal">
                    {currentStatus === 'Đã hủy' ? 'Yêu cầu này đã được hủy.' : 'Người bán đã từ chối yêu cầu này.'}
                    {history.length > 0 && <> Cập nhật lúc {formatDate(history[history.length - 1].created_at)}.</>}
                </p>
            ) : (
                <ol className="order-progress-steps">
                    {steps.map((status, index) => {
                        const event = history.find((entry) => entry.status === status);
                        const isDone = currentIndex >= 0 && index < currentIndex;
                        const isCurrent = index === currentIndex;
                        return (
                            <li key={status} className={`order-progress-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}>
                                <span className="order-progress-dot" aria-hidden="true" />
                                <span className="order-progress-label">{status}</span>
                                {event && (
                                    <span className="order-progress-event">
                                        <time dateTime={event.created_at}>{formatDate(event.created_at)}</time>
                                        {event.note && <small>{event.note}</small>}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            )}
        </section>
    );
};

export default OrderProgress;
