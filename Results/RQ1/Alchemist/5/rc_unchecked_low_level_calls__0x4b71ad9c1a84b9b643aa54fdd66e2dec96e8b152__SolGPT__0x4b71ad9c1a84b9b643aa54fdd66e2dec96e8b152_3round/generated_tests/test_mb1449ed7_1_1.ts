import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort reference (ethers v6)", function () {
  it("should detect mutant that changes i < _tos.length to i <= _tos.length", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a mock token contract to receive the transferFrom call
    const TokenFactory = await ethers.getContractFactory("SimpleERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to addr1 so transferFrom can succeed
    await token.mint(addr1.address, ethers.parseEther("100"));
    await token.connect(addr1).approve(instance.target, ethers.parseEther("100"));

    // Prepare call data - array with ONE recipient
    const recipients = [addr2.address];
    const value = ethers.parseEther("10");

    // This should revert in the mutant because the loop runs i <= length (0 <= 1)
    // causing an out-of-bounds access on _tos[1] which is a zero address,
    // and the call to transferFrom from zero address will fail
    await expect(
      instance.connect(addr1).transfer(
        addr1.address,
        token.target,
        recipients,
        value
      )
    ).to.be.reverted;
  });
});

// Minimal ERC20 token for testing
contract SimpleERC20 {
  string public name = "SimpleERC20";
  string public symbol = "SIMP";
  uint8 public decimals = 18;
  mapping(address => uint256) public balanceOf;
  mapping(address => mapping(address => uint256)) public allowance;

  function mint(address to, uint256 amount) external {
    balanceOf[to] += amount;
  }

  function approve(address spender, uint256 amount) external returns (bool) {
    allowance[msg.sender][spender] = amount;
    return true;
  }

  function transferFrom(address from, address to, uint256 amount) external returns (bool) {
    require(allowance[from][msg.sender] >= amount);
    allowance[from][msg.sender] -= amount;
    balanceOf[from] -= amount;
    balanceOf[to] += amount;
    return true;
  }
}