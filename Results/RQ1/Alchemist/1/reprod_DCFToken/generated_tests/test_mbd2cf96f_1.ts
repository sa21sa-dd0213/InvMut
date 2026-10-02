import { expect } from "chai";
import { ethers } from "hardhat";

describe("DCF mutant mbd2cf96f test", function () {
  it("should NOT deduct fee on regular transfer between non-pair addresses", async function () {
    const [owner, userA, userB, liquidityReceiver] = await ethers.getSigners();
    
    // Deploy DCF with liquidityReceiveAddress
    const Factory = await ethers.getContractFactory("DCF");
    const dcf = await Factory.deploy(liquidityReceiver.address);
    await dcf.waitForDeployment();
    
    // Get the pair address from the contract
    const pairAddress = await dcf.pairAddress();
    
    // Transfer some tokens to userA for testing
    const transferAmount = ethers.parseEther("100");
    await dcf.connect(owner).transfer(userA.address, transferAmount);
    
    // Get userA's balance before the regular transfer
    const balanceBefore = await dcf.balanceOf(userA.address);
    
    // Perform a regular transfer from userA to userB (not involving the pair)
    const sendAmount = ethers.parseEther("10");
    await dcf.connect(userA).transfer(userB.address, sendAmount);
    
    // Get userA's balance after transfer
    const balanceAfter = await dcf.balanceOf(userA.address);
    
    // In the original contract, no fee should be deducted for regular transfers
    // The balance difference should equal exactly the sendAmount
    const balanceDifference = balanceBefore - balanceAfter;
    
    // If the mutant is active (if (true) instead of the condition), 
    // a fee would be incorrectly deducted, making the difference > sendAmount
    expect(balanceDifference).to.equal(sendAmount);
  });
});