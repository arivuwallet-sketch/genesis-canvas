using UnityEngine;
using UnityEngine.AI;

namespace Genesis.MidLevel
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class GameplayCharacterMotor : MonoBehaviour
    {
        [SerializeField] private GameplayInputManager input;
        [SerializeField] private float walkSpeed = 3.5f;
        [SerializeField] private float runSpeed = 6.0f;
        [SerializeField] private float rotationSpeed = 12.0f;
        [SerializeField] private float jumpHeight = 1.5f;
        [SerializeField] private float gravity = -20.0f;
        [SerializeField] private float airControl = 0.35f;
        [SerializeField] private NavMeshAgent navAgent;
        [SerializeField] private bool useNavAgent;

        private CharacterController controller;
        private Vector2 moveInput;
        private bool jumpQueued;
        private float verticalVelocity;

        public bool IsGrounded => controller != null && controller.isGrounded;

        private void Awake()
        {
            controller = GetComponent<CharacterController>();
            input ??= GetComponent<GameplayInputManager>();
        }

        private void OnEnable()
        {
            if (input == null) return;
            input.MoveChanged += HandleMove;
            input.JumpPressed += QueueJump;
        }

        private void OnDisable()
        {
            if (input == null) return;
            input.MoveChanged -= HandleMove;
            input.JumpPressed -= QueueJump;
        }

        private void Update()
        {
            if (useNavAgent && navAgent != null)
            {
                if (moveInput.sqrMagnitude > 0.01f)
                {
                    var world = new Vector3(moveInput.x, 0, moveInput.y);
                    navAgent.Move(world.normalized * (walkSpeed * Time.deltaTime));
                }
                return;
            }

            var desired = new Vector3(moveInput.x, 0, moveInput.y);
            desired = Vector3.ClampMagnitude(desired, 1f);
            float speed = walkSpeed;

            if (Keyboard.current != null && Keyboard.current.leftShiftKey.isPressed)
                speed = runSpeed;

            if (controller.isGrounded)
            {
                if (verticalVelocity < 0) verticalVelocity = -2f;
                if (jumpQueued)
                {
                    verticalVelocity = Mathf.Sqrt(jumpHeight * -2f * gravity);
                    jumpQueued = false;
                }
            }
            else
            {
                desired *= Mathf.Clamp01(airControl);
            }

            verticalVelocity += gravity * Time.deltaTime;

            var motion = desired * speed;
            motion.y = verticalVelocity;
            controller.Move(motion * Time.deltaTime);

            if (desired.sqrMagnitude > 0.001f)
            {
                Quaternion target = Quaternion.LookRotation(desired, Vector3.up);
                transform.rotation = Quaternion.Slerp(
                    transform.rotation,
                    target,
                    1f - Mathf.Exp(-rotationSpeed * Time.deltaTime));
            }
        }

        private void HandleMove(Vector2 value) => moveInput = value;
        private void QueueJump() => jumpQueued = true;
    }
}
