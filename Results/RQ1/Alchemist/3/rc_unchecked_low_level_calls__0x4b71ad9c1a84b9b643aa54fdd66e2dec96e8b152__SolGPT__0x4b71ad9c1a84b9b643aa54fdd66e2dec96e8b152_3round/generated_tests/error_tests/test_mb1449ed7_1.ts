import { expect } from "chai";
import { ethers } from "hardhat";

describe("airPort mutant test - mb1449ed7", function () {
  it("should detect loop boundary change by reverting on out-of-bounds access", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy the contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("airPort");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a token contract to use as the 'caddress' parameter
    // We need a simple ERC20-like contract with transferFrom function
    const TokenFactory = await ethers.getContractFactory("contracts/TestToken.sol:TestToken");
    const token = await TokenFactory.deploy();
    await token.waitForDeployment();
    
    // Setup: Give owner some tokens and approve the airPort contract
    const amount = ethers.parseEther("10");
    await token.mint(owner.address, amount);
    await token.approve(instance.target, amount);
    
    // Test case: Call transfer with exactly 1 recipient
    // Original: i < 1 means loop runs once (i=0) -> succeeds
    // Mutant: i <= 1 means loop runs twice (i=0 and i=1) -> reverts on out-of-bounds access to _tos[1]
    const recipients = [addr1.address];  // Array with exactly 1 element
    
    await expect(
      instance.transfer(owner.address, token.target, recipients, amount)
    ).to.be.reverted;
  });
});