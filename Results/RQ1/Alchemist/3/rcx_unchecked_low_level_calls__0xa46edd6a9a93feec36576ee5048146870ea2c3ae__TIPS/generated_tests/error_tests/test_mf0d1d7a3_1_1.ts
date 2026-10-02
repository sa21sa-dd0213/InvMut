import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mf0d1d7a3 test", function () {
  it("should detect off-by-one bug when array length is 1", async function () {
    const [owner, from, addr1] = await ethers.getSigners();

    // Deploy a simple ERC20-like contract to use as caddress
    const MockTokenFactory = await ethers.getContractFactory("MockToken");
    const token = await MockTokenFactory.deploy();
    await token.waitForDeployment();

    // Give the "from" address some tokens and approve the EBU contract
    const tokenAmount = ethers.parseEther("10");
    await token.transfer(from.address, tokenAmount);
    await token.connect(from).approve(owner.address, tokenAmount);

    // Deploy EBU (no constructor arguments)
    const Factory = await ethers.getContractFactory("EBU");
    const ebu = await Factory.deploy();
    await ebu.waitForDeployment();

    // Prepare arrays with single element
    const tos = [addr1.address];
    const values = [tokenAmount];

    // Original: processes i=0 only (i < 1) and succeeds
    // Mutant: tries i=0 and i=1 (i <= 1), reverts on out-of-bounds access
    await expect(
      ebu.transfer(from.address, await token.getAddress(), tos, values)
    ).to.be.reverted;
  });
});

// Helper mock token contract for testing
// Note: In a real test environment, this would be compiled separately
// For completeness, include as inline contract
contract MockToken {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;

    function transfer(address to, uint256 amount) public returns (bool) {
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }

    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(allowances[from][msg.sender] >= amount);
        allowances[from][msg.sender] -= amount;
        balances[from] -= amount;
        balances[to] += amount;
        return true;
    }
}