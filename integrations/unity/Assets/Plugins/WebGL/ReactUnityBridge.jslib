mergeInto(LibraryManager.library, {
  DispatchReactUnityEvent: function (eventNamePtr, payloadPtr) {
    var eventName = UTF8ToString(eventNamePtr);
    var payload = UTF8ToString(payloadPtr);

    if (typeof window.dispatchReactUnityEvent === "function") {
      window.dispatchReactUnityEvent(eventName, payload);
      return;
    }

    console.warn(
      "[ReactUnityBridge] react-unity-webgl event dispatcher is unavailable.",
      eventName,
      payload
    );
  }
});
