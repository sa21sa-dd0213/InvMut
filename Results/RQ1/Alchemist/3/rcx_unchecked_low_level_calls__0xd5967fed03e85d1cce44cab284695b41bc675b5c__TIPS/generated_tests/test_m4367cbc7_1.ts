import { expect } from "chai";
import { ethers } from "hardhat";

describe("demo mutant kill test - m4367cbc7", function () {
  it("should revert when a transferFrom call fails in the loop, but mutant would not revert", async function () {
    const [owner, from, recipient1, recipient2] = await ethers.getSigners();
    
    // Deploy a simple token contract that the demo contract will call via transferFrom
    const TokenFactory = await ethers.getContractFactory("contracts/ERC20Mock.sol:ERC20Mock");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the demo contract (no constructor arguments)
    const DemoFactory = await ethers.getContractFactory("demo");
    const demo = await DemoFactory.deploy();
    await demo.waitForDeployment();
    
    // Mint tokens to the 'from' address
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Have 'from' approve the demo contract to spend tokens
    await token.connect(from).approve(await demo.getAddress(), mintAmount);
    
    // Setup: first recipient will succeed, second recipient will fail (no approval)
    const recipients = [recipient1.address, recipient2.address];
    const transferAmount = ethers.parseEther("10");
    
    // The demo.transfer function will call token.transferFrom(from, recipient, v)
    // For recipient2, the transfer will fail because recipient2 hasn't approved anything
    // Original contract reverts on failure; mutant continues and returns true
    
    // Test: this should revert in original contract (kill mutant)
    await expect(
      demo.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        transferAmount
      )
    ).to.be.reverted;
  });
});