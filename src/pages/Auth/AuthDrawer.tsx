import RightDrawer from "./RightDrawer";
import SupabaseAuth from "./SupabaseAuth";


interface AuthDrawerProps {
  open: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

const AuthDrawer = ({ open, onClose, onAuthSuccess }: AuthDrawerProps) => {
  return (
    <RightDrawer isOpen={open} onClose={onClose} title="User Login">
      <SupabaseAuth onAuthSuccess={() => {
        onClose();
        if (onAuthSuccess) onAuthSuccess();
      }} />
    </RightDrawer>
  );
};

export default AuthDrawer;