import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant m3f8e0a63 test", function () {
  it("should revert when external call fails, but mutant returns true", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the demo contract (no constructor arguments)
    const Factory = await ethers.getContractFactory("demo");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a simple token contract that will revert on transferFrom
    const TokenFactory = await ethers.getContractFactory("SimpleToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Setup: owner has tokens, approves demo contract to spend them
    const amount = ethers.parseEther("1");
    await token.approve(await instance.getAddress(), amount);
    
    // Create array of recipients (one is enough)
    const recipients = [addr1.address];
    
    // This call should fail because token's transferFrom will revert
    // (token has no allowance for owner -> demo contract call)
    await expect(
      instance.transfer(owner.address, await token.getAddress(), recipients, amount)
    ).to.be.reverted;
  });
});

// Helper contract to ensure the external call can fail
contract SimpleToken {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    constructor() {
        balanceOf[msg.sender] = 1000000 ether;
    }
    
    function approve(address spender, uint256 amount) public returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }
    
    function transferFrom(address from, address to, uint256 amount) public returns (bool) {
        require(allowance[from][msg.sender] >= amount, "insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}