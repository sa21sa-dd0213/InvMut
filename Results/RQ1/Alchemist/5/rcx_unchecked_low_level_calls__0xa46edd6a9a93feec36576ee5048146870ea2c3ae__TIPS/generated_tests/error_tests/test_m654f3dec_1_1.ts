import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant m654f3dec test", function () {
  it("should not revert when transferFrom call succeeds", async function () {
    const [owner, from, to] = await ethers.getSigners();

    // Deploy EBU (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like contract to serve as caddress
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Mint tokens to 'from' address and approve EBU to transfer
    const amount = ethers.parseEther("100");
    await token.mint(from.address, amount);
    await token.connect(from).approve(await instance.getAddress(), amount);

    // Call transfer on EBU with valid parameters - should succeed
    const recipients = [to.address];
    const values = [ethers.parseEther("10")];

    // This should NOT revert on original, but WILL revert on mutant (always reverts)
    await expect(
      instance.connect(owner).transfer(from.address, await token.getAddress(), recipients, values)
    ).to.not.be.reverted;
  });
});

// Simple mock ERC20 for testing
contract MockERC20 {
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
        require(balanceOf[from] >= amount);
        require(allowance[from][msg.sender] >= amount);
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        allowance[from][msg.sender] -= amount;
        return true;
    }
}