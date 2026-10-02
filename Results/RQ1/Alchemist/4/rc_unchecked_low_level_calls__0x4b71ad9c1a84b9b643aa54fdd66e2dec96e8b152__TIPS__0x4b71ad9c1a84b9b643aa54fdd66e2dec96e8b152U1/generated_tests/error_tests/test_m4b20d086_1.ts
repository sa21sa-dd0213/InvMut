import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant m4b20d086 test", function () {
  it("should revert when loop condition is inverted (i > _tos.length) so no calls are made", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deploy a simple token contract that tracks transferFrom calls
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();

    // Fund owner with tokens and approve airPort contract to transfer
    const amount = ethers.parseEther("10");
    await token.mint(owner.address, amount);
    await token.approve(await instance.getAddress(), amount);

    // Test with a non-empty array of recipients
    const recipients = [addr1.address, addr2.address];

    // Expect revert because the mutated loop (i > _tos.length) never executes,
    // so no transferFrom call happens, but the original contract would succeed.
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, ethers.parseEther("5"))
    ).to.be.revertedWith(""); // No specific revert reason, just that call fails
  });
});

// Helper contract to provide transferFrom functionality for testing
contract SimpleToken {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;

    function mint(address to, uint256 amount) external {
        balances[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(allowances[from][msg.sender] >= amount, "insufficient allowance");
        require(balances[from] >= amount, "insufficient balance");
        balances[from] -= amount;
        balances[to] += amount;
        allowances[from][msg.sender] -= amount;
        return true;
    }
}