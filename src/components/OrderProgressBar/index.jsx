import React from 'react';

/**
 * OrderProgressBar Component
 * Displays order status progress with 4 stages:
 * 1. Order Placed (PENDING)
 * 2. Preparing (ACCEPTED, READY)
 * 3. On the way (SHIPPING)
 * 4. Delivered (COMPLETED)
 */
function OrderProgressBar({ status }) {
  const statusUpper = String(status || "").toUpperCase();

  // Determine current stage
  let currentStage = 0;
  if (["COMPLETED"].includes(statusUpper)) {
    currentStage = 4; // Delivered
  } else if (["SHIPPING", "ON_THE_WAY"].includes(statusUpper)) {
    currentStage = 3; // On the way
  } else if (["ACCEPTED", "READY", "PROCESSING", "PREPARING"].includes(statusUpper)) {
    currentStage = 2; // Preparing
  } else if (["PENDING"].includes(statusUpper)) {
    currentStage = 1; // Order Placed
  } else if (["CANCELLED", "REJECTED"].includes(statusUpper)) {
    currentStage = 0; // Cancelled/Rejected
  }

  const stages = [
    { 
      id: 1, 
      label: "Order Placed", 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 2, 
      label: "Preparing", 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14M5 11a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 01-2 2M5 11v6a2 2 0 002 2h10a2 2 0 002-2v-6M9 15h6" />
        </svg>
      )
    },
    { 
      id: 3, 
      label: "On the way", 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 4, 
      label: "Delivered", 
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
  ];

  const isCancelled = ["CANCELLED", "REJECTED"].includes(statusUpper);
  const isOrderCompleted = currentStage === 4;
  const isShipping = ["SHIPPING", "ON_THE_WAY", "DELIVERED"].includes(statusUpper);
  
  // Get color scheme based on status - softer, muted colors
  const getProgressColor = () => {
    if (isCancelled) return "from-red-200 to-red-300 opacity-60";
    if (isOrderCompleted) return "from-green-200 to-green-300 opacity-60";
    if (isShipping) return "from-blue-200 to-blue-300 opacity-60";
    return "from-yellow-200 to-yellow-300 opacity-60"; // PENDING, ACCEPTED, READY, etc.
  };
  
  const getIconColor = () => {
    if (isCancelled) return "bg-red-50 opacity-70";
    if (isOrderCompleted) return "bg-green-50 opacity-70";
    if (isShipping) return "bg-blue-50 opacity-70";
    return "bg-yellow-50 opacity-70";
  };
  
  const getIconTextColor = () => {
    if (isCancelled) return "text-red-400";
    if (isOrderCompleted) return "text-green-400";
    if (isShipping) return "text-blue-400";
    return "text-yellow-400";
  };
  
  const getStageColor = (stageCompleted, stageActive, stageId) => {
    if (isCancelled) return "bg-red-200 opacity-70";
    // Nếu order đã completed, tất cả stages (completed hoặc active) đều dùng màu xanh
    if (isOrderCompleted && (stageCompleted || stageActive)) return "bg-green-200 opacity-70";
    // Nếu order đang shipping (nhưng chưa completed), dùng màu xanh dương
    if (isShipping && !isOrderCompleted && (stageCompleted || stageActive)) return "bg-blue-200 opacity-70";
    // Các trường hợp khác (pending, accepted, ready) dùng màu vàng
    if (stageCompleted || stageActive) return "bg-yellow-200 opacity-70";
    return "bg-gray-200 opacity-50";
  };
  
  const getStageTextColor = (stageCompleted, stageActive, stageId) => {
    if (isCancelled) return "text-red-400";
    // Nếu order đã completed, tất cả stages (completed hoặc active) đều dùng màu xanh
    if (isOrderCompleted && (stageCompleted || stageActive)) return "text-green-400";
    // Nếu order đang shipping (nhưng chưa completed), dùng màu xanh dương
    if (isShipping && !isOrderCompleted && (stageCompleted || stageActive)) return "text-blue-400";
    // Các trường hợp khác (pending, accepted, ready) dùng màu vàng
    if (stageCompleted || stageActive) return "text-yellow-400";
    return "text-gray-400";
  };

  return (
    <div className="w-full py-6 px-2">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-3xl font-black text-gray-900 mb-2 drop-shadow-md">
            {isCancelled ? "Cancelled" : currentStage === 4 ? "Completed" : "In Progress"}
          </h3>
          {!isCancelled && currentStage < 4 && (
            <p className="text-sm text-gray-500 mt-1">
              For more support, please go to Help Center.
            </p>
          )}
        </div>
        {!isCancelled && isOrderCompleted && (
          <div className={`w-16 h-16 ${getIconColor()} rounded-full flex items-center justify-center`}>
            <svg
              className={`w-8 h-8 ${getIconTextColor()}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isCancelled && (
        <div className="relative py-4">
          {/* Stage Icons - Aligned horizontally */}
          <div className="relative flex justify-between items-center">
            {/* Progress Line - positioned at center of icons (24px from top for 48px icon) */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-100" style={{ left: '24px', right: '24px' }}>
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-700 ease-out`}
                style={{ width: `${((currentStage - 1) / 3) * 100}%` }}
              />
            </div>
            
            {stages.map((stage) => {
              const isCompleted = stage.id < currentStage;
              const isActive = stage.id === currentStage;
              const isPending = stage.id > currentStage;

              return (
                <div key={stage.id} className="flex flex-col items-center flex-1 relative z-10">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 relative z-10 ${
                      isCompleted
                        ? `${getStageColor(true, false, stage.id)} text-gray-600`
                        : isActive
                        ? `${getStageColor(false, true, stage.id)} text-gray-600`
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <div className="text-current">
                        {stage.icon}
                      </div>
                    )}
                  </div>
                  <p
                    className={`mt-2 text-xs font-semibold text-center max-w-[80px] leading-tight ${
                      isCompleted || isActive
                        ? `${getStageTextColor(isCompleted, isActive, stage.id)}`
                        : "text-gray-500"
                    }`}
                  >
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancelled State */}
      {isCancelled && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-50 opacity-70 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-red-400">Order {statusUpper}</p>
        </div>
      )}

      {/* Status Text */}
      {!isCancelled && currentStage < 4 && (
        <div className="mt-8 text-center">
          <p className="text-base text-gray-600 font-medium">
            {currentStage === 1 && "Your order has been placed and is waiting to be accepted."}
            {currentStage === 2 && "Your order is being prepared with care."}
            {currentStage === 3 && "Your order is on the way to you."}
          </p>
        </div>
      )}

      {!isCancelled && currentStage === 4 && (
        <div className="mt-6 text-center">
          <p className={`text-lg ${getIconTextColor()} font-black drop-shadow-md`}>Order completed</p>
        </div>
      )}
    </div>
  );
}

export default OrderProgressBar;

