import { ORDER_STATUS_CLASSES, ORDER_STATUS_LABELS, type OrderStatus } from "@/lib/orderStatus";

const OrderStatusBadge = ({ status, className = "" }: { status: OrderStatus; className?: string }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${ORDER_STATUS_CLASSES[status]} ${className}`}
  >
    {ORDER_STATUS_LABELS[status]}
  </span>
);

export default OrderStatusBadge;