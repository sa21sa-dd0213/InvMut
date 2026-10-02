import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant mcbc0d017 - kill test", function () {
  it("should revert when _tos array is empty on original, but mutant should not revert", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy a simple ERC20-like token for testing transferFrom
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();

    // Mint some tokens to 'from' address
    await token.mint(from.address, ethers.parseEther("100"));

    // Approve the airDrop contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(await token.getAddress(), ethers.parseEther("100"));

    // Deploy airDrop (no constructor arguments)
    const AirDropFactory = await ethers.getContractFactory("airDrop");
    const airDrop = await AirDropFactory.deploy();
    await airDrop.waitForDeployment();

    // Call transfer with empty _tos array - mutant will NOT revert
    const tx = airDrop.transfer(
      from.address,
      await token.getAddress(),
      [], // empty array - mutant accepts this
      1,
      18
    );

    // The mutant should succeed (not revert), killing it because original would revert
    await expect(tx).to.not.be.reverted;
  });
});

// Minimal ERC20 mock for testing
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    mapping(address => uint256) public balanceOf;

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
    }

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        return true;
    }
}