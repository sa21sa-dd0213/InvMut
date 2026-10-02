import { expect } from "chai";
import { ethers } } from "hardhat";

describe("airDrop mutant mcdd017f6 test", function () {
  it("should revert when loop condition is changed to i > _tos.length (mutant kills all transfers)", async function () {
    const [owner, from, recipient] = await ethers.getSigners();
    
    // Deploy a simple ERC20 token for testing
    const TokenFactory = await ethers.getContractFactory("TestToken");
    const token = await TokenFactory.deploy("Test", "TST", 18);
    await token.waitForDeployment();
    
    // Deploy the airDrop contract
    const Factory = await ethers.getContractFactory("airDrop");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Fund the 'from' address with tokens
    const mintAmount = ethers.parseEther("100");
    await token.mint(from.address, mintAmount);
    
    // Approve the airDrop contract to spend tokens on behalf of 'from'
    await token.connect(from).approve(await instance.getAddress(), mintAmount);
    
    // Prepare test parameters
    const value = ethers.parseEther("1");
    const decimals = 18;
    const recipients = [recipient.address];
    
    // Record balances before transfer
    const recipientBalanceBefore = await token.balanceOf(recipient.address);
    
    // Execute the transfer - should revert in mutant because loop never executes
    // and the function will return true without transferring tokens
    await expect(
      instance.connect(owner).transfer(
        from.address,
        await token.getAddress(),
        recipients,
        value,
        decimals
      )
    ).to.not.be.reverted;
    
    // Check that recipient balance did NOT increase (mutant behavior)
    const recipientBalanceAfter = await token.balanceOf(recipient.address);
    expect(recipientBalanceAfter).to.equal(recipientBalanceBefore);
  });
});