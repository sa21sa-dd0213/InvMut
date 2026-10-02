import { expect } from "chai";
import { ethers } from "hardhat";

describe("airDrop mutant detection - mcdd017f6", function () {
  it("should detect loop condition change by verifying transfers occur for non-empty recipient list", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock token that can receive transferFrom calls
    const MockToken = await ethers.getContractFactory("MockToken");
    const token = await MockToken.deploy();
    await token.waitForDeployment();
    
    // Deploy the airDrop contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Setup: owner approves airDrop contract to spend tokens
    const value = ethers.parseEther("10");
    await token.connect(owner).approve(await instance.getAddress(), value);
    
    // Fund owner with tokens
    await token.connect(owner).transfer(owner.address, value);
    
    // Create recipient list with one address
    const recipients = [addr1.address];
    
    // Call transfer function with v=10, decimals=18 (since parseEther uses 18 decimals)
    const tx = await instance.connect(owner).transfer(
      owner.address,
      await token.getAddress(),
      recipients,
      10,
      18
    );
    await tx.wait();
    
    // Verify transfer happened: addr1 should have received tokens
    const addr1Balance = await token.balanceOf(addr1.address);
    expect(addr1Balance).to.equal(value);
    
    // If loop condition was changed to i > _tos.length, no transfers occur
    // and addr1Balance would be 0, causing the test to fail
  });
});

// Helper contract for testing
// Note: This would need to be deployed separately or included in the test setup
// For a complete test, deploy this contract first:
contract MockToken {
    mapping(address => uint256) public balances;
    mapping(address => mapping(address => uint256)) public allowances;
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowances[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(allowances[from][msg.sender] >= amount);
        require(balances[from] >= amount);
        allowances[from][msg.sender] -= amount;
        balances[from] -= amount;
        balances[to] += amount;
        return true;
    }
    
    function transfer(address to, uint256 amount) public returns (bool) {
        balances[msg.sender] -= amount;
        balances[to] += amount;
        return true;
    }
    
    function balanceOf(address account) public view returns (uint256) {
        return balances[account];
    }
}