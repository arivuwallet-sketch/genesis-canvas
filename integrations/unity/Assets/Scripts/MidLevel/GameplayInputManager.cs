using System;
using UnityEngine;
using UnityEngine.InputSystem;

namespace Genesis.MidLevel
{
    public enum GameplayContext
    {
        Locomotion,
        Combat,
        UI
    }

    public sealed class GameplayInputManager : MonoBehaviour
    {
        [SerializeField] private InputActionAsset inputActions;

        private InputActionMap locomotion;
        private InputActionMap combat;
        private InputActionMap ui;

        public event Action<Vector2> MoveChanged;
        public event Action JumpPressed;
        public event Action PrimaryPressed;
        public event Action InteractPressed;
        public event Action<GameplayContext> ContextChanged;

        private void Awake()
        {
            if (inputActions == null) return;

            locomotion = inputActions.FindActionMap("Locomotion", false);
            combat = inputActions.FindActionMap("Combat", false);
            ui = inputActions.FindActionMap("UI", false);

            Bind(locomotion, "Move", OnMove);
            Bind(locomotion, "Jump", OnJump);
            Bind(locomotion, "Interact", OnInteract);
            Bind(combat, "Primary", OnPrimary);

            SetContext(GameplayContext.Locomotion);
        }

        private static void Bind(
        InputActionMap map,
        string actionName,
        Action<InputAction.CallbackContext> callback)
    {
        if (map == null) return;
        InputAction action = map.FindAction(actionName, false);
        if (action != null) action.performed += callback;
    }

        private void OnDestroy()
        {
            Unbind(locomotion, "Move", OnMove);
            Unbind(locomotion, "Jump", OnJump);
            Unbind(locomotion, "Interact", OnInteract);
            Unbind(combat, "Primary", OnPrimary);
        }

        private static void Unbind(
        InputActionMap map,
        string actionName,
        Action<InputAction.CallbackContext> callback)
    {
        if (map == null) return;
        InputAction action = map.FindAction(actionName, false);
        if (action != null) action.performed -= callback;
    }

        private void Update()
        {
            if (locomotion == null) return;
            var move = locomotion.FindAction("Move", false)?.ReadValue<Vector2>() ?? Vector2.zero;
            MoveChanged?.Invoke(move);
        }

        public void SetContext(GameplayContext context)
        {
            locomotion?.Disable();
            combat?.Disable();
            ui?.Disable();

            switch (context)
            {
                case GameplayContext.Locomotion:
                    locomotion?.Enable();
                    break;
                case GameplayContext.Combat:
                    combat?.Enable();
                    locomotion?.Enable();
                    break;
                case GameplayContext.UI:
                    ui?.Enable();
                    break;
            }

            ContextChanged?.Invoke(context);
        }

        private void OnMove(InputAction.CallbackContext context)
        {
            MoveChanged?.Invoke(context.ReadValue<Vector2>());
        }

        private void OnJump(InputAction.CallbackContext context)
        {
            if (context.performed) JumpPressed?.Invoke();
        }

        private void OnPrimary(InputAction.CallbackContext context)
        {
            if (context.performed) PrimaryPressed?.Invoke();
        }

        private void OnInteract(InputAction.CallbackContext context)
        {
            if (context.performed) InteractPressed?.Invoke();
        }
    }
}
