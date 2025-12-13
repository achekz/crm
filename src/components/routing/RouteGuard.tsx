import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { RootState } from "../../store";
import { useSocket } from "../../hooks/useSocket";

interface RouteGuardProps {
  children: React.ReactNode;
}

/**
 * Composant de garde pour vérifier la validité des tokens et gérer les erreurs d'authentification
 */
const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, token, user } = useSelector(
    (state: RootState) => state.auth
  );

  // Initialize socket connection for authenticated users
  useSocket();

  useEffect(() => {
    // Vérifier la validité du token si l'utilisateur est supposé être authentifié
    if (isAuthenticated && token) {
      try {
        // Dans un vrai projet, vous vérifieriez ici la validité du JWT
        // Pour la démo, on accepte le token mock
        if (token === "mock-jwt-token") {
          // Token valide pour la démo
        } else {
          // Pour un vrai JWT, décommentez le code ci-dessous
          // const tokenData = JSON.parse(atob(token.split('.')[1] || '{}'));
          // const currentTime = Date.now() / 1000;
          // if (tokenData.exp && tokenData.exp < currentTime) {
          //   dispatch(authError());
          //   navigate('/login', { replace: true });
          //   return;
          // }
        }
      } catch (error) {
        // Token invalide
        console.warn("Token invalide détecté:", error);
        navigate("/login", { replace: true });
        return;
      }
    }

    // Vérifier la cohérence des données utilisateur
    if (isAuthenticated && !user) {
      navigate("/login", { replace: true });
      return;
    }

    // Redirection automatique si l'utilisateur accède à une route inappropriée
    if (isAuthenticated && user) {
      const currentPath = location.pathname;

      // Si un admin essaie d'accéder aux routes client
      if (user.role === "admin" && currentPath.startsWith("/client")) {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      // Si un client essaie d'accéder aux routes admin
      if (user.role === "client" && currentPath.startsWith("/admin")) {
        navigate("/client/dashboard", { replace: true });
        return;
      }
    }
  }, [isAuthenticated, token, user, location.pathname, dispatch, navigate]);

  return <>{children}</>;
};

export default RouteGuard;
