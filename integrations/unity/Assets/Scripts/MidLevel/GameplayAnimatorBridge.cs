using UnityEngine;

namespace Genesis.MidLevel
{
    public sealed class GameplayAnimatorBridge : MonoBehaviour
    {
        [SerializeField] private Animator animator;
        [SerializeField] private GameplayCharacterMotor motor;
        [SerializeField] private GameplayInputManager input;
        [SerializeField] private string speedParameter = "Speed";
        [SerializeField] private string groundedParameter = "Grounded";
        [SerializeField] private string verticalParameter = "VerticalSpeed";
        [SerializeField] private string primaryTrigger = "Primary";
        [SerializeField] private string interactTrigger = "Interact";

        private void Awake()
        {
            animator ??= GetComponentInChildren<Animator>();
            motor ??= GetComponent<GameplayCharacterMotor>();
            input ??= GetComponent<GameplayInputManager>();
        }

        private void OnEnable()
        {
            if (input == null) return;
            input.PrimaryPressed += TriggerPrimary;
            input.InteractPressed += TriggerInteract;
        }

        private void OnDisable()
        {
            if (input == null) return;
            input.PrimaryPressed -= TriggerPrimary;
            input.InteractPressed -= TriggerInteract;
        }

        private void Update()
        {
            if (animator == null || motor == null) return;

            var velocity = motor.GetComponent<CharacterController>()?.velocity ?? Vector3.zero;
            animator.SetFloat(speedParameter, new Vector3(velocity.x, 0, velocity.z).magnitude);
            animator.SetBool(groundedParameter, motor.IsGrounded);
            animator.SetFloat(verticalParameter, velocity.y);
        }

        public void TriggerPrimary() => animator?.SetTrigger(primaryTrigger);
        public void TriggerInteract() => animator?.SetTrigger(interactTrigger);
    }
}
