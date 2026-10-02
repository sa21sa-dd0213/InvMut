import { expect } from "chai";
import { ethers } from "hardhat";

describe("airdrop reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when loop iterates out-of-bounds due to <= in mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airdrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple ERC20-like token that the airdrop contract will call
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Fund owner with tokens and approve the airdrop contract to spend
    const amount = ethers.parseEther("1");
    await token.mint(owner.address, amount);
    await token.approve(await instance.getAddress(), amount);

    // Prepare single recipient array - this will cause out-of-bounds access on mutant
    const recipients = [addr1.address];
    
    // The mutant changes i < _tos.length to i <= _tos.length
    // With 1 element, loop runs for i=0 and i=1, where i=1 accesses _tos[1] which is out of bounds
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});

// Minimal ERC20 token for testing
contract TestToken {
    string public name = "TestToken";
    string public symbol = "TT";
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