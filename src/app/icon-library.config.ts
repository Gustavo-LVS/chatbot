import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { 
  // Solid Icons - adicione os ícones que você precisa aqui
  faUser,
  faUserPlus,
  faHeart,
  faHome,
  faSearch,
  faCog,
  faBars,
  faTimes,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCheck,
  faPlus,
  faMinus,
  faEdit,
  faTrash,
  faSave,
  faArrowLeft,
  faArrowRight,
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
  faEye,
  faEyeSlash,
  faStar,
  faComment,
  faShare,
  faPaperPlane,
  faImage,
  faVideo,
  faFile,
  faDownload,
  faUpload,
  faSpinner,
  faCircle,
  faSquare,
  faExclamationTriangle,
  faInfoCircle,
  faCheckCircle,
  faTimesCircle,
  faSignOutAlt
} from '@fortawesome/free-solid-svg-icons';

import {
  // Regular Icons
  faUser as farUser,
  faHeart as farHeart,
  faStar as farStar,
  faComment as farComment,
  faCalendar as farCalendar,
  faFileAlt as farFileAlt,
  faClock as farClock,
  faCircle as farCircle,
  faSquare as farSquare
} from '@fortawesome/free-regular-svg-icons';

import {
  // Brand Icons
  faFacebook,
  faFacebookSquare,
  faTwitter,
  faInstagram,
  faLinkedin,
  faGithub,
  faYoutube,
  faWhatsapp,
  faGoogle,
  faApple,
  faMicrosoft
} from '@fortawesome/free-brands-svg-icons';

export function initializeIconLibrary(library: FaIconLibrary) {
  // Adiciona todos os ícones Solid
  library.addIcons(
    faUser,
    faUserPlus,
    faHeart,
    faHome,
    faSearch,
    faCog,
    faBars,
    faTimes,
    faEnvelope,
    faPhone,
    faMapMarkerAlt,
    faCheck,
    faPlus,
    faMinus,
    faEdit,
    faTrash,
    faSave,
    faArrowLeft,
    faArrowRight,
    faChevronDown,
    faChevronUp,
    faChevronLeft,
    faChevronRight,
    faEye,
    faEyeSlash,
    faStar,
    faComment,
    faShare,
    faPaperPlane,
    faImage,
    faVideo,
    faFile,
    faDownload,
    faUpload,
    faSpinner,
    faCircle,
    faSquare,
    faExclamationTriangle,
    faInfoCircle,
    faCheckCircle,
    faTimesCircle,
    faSignOutAlt
  );

  // Adiciona todos os ícones Regular
  library.addIcons(
    farUser,
    farHeart,
    farStar,
    farComment,
    farCalendar,
    farFileAlt,
    farClock,
    farCircle,
    farSquare
  );

  // Adiciona todos os ícones de Brands
  library.addIcons(
    faFacebook,
    faFacebookSquare,
    faTwitter,
    faInstagram,
    faLinkedin,
    faGithub,
    faYoutube,
    faWhatsapp,
    faGoogle,
    faApple,
    faMicrosoft
  );
}
