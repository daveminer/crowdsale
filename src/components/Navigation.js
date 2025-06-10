import { Navbar } from "react-bootstrap";
import logo from "../logo.png";

function Navigation() {
  return (
    <Navbar>
      <img
        alt="logo"
        src={logo}
        width="40"
        height="40"
        className="d-inline-block align-top mx-3"
      />
      <Navbar.Brand href="#">Shiba Snax Crowdsale</Navbar.Brand>
    </Navbar>
  );
}

export default Navigation;
