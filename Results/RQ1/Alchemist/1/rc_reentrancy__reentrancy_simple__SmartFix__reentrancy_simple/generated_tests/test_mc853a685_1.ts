import { expect } from "chai";
import { ethers } } from "hardhat";

describe("Reentrance mutant test - mc853a685", function () {
  it("should revert when withdrawing to a contract that rejects ETH, preventing balance from being zeroed", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy the Reentrance contract
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();
    
    // Deploy a malicious receiver that always reverts on receive
    const MaliciousReceiverFactory = await ethers.getContractFactory("MaliciousReceiver");
    const maliciousReceiver = await MaliciousReceiverFactory.deploy();
    await maliciousReceiver.waitForDeployment();
    
    // Fund the Reentrance contract
    const depositAmount = ethers.parseEther("1.0");
    await user.sendTransaction({
      to: await reentrance.getAddress(),
      value: depositAmount
    });
    
    // Verify balance before withdrawal
    const balanceBefore = await reentrance.getBalance(await maliciousReceiver.getAddress());
    expect(balanceBefore).to.equal(depositAmount);
    
    // Attempt withdrawal to the malicious receiver - should revert
    await expect(
      reentrance.connect(user).withdrawBalance()
    ).to.be.reverted;
    
    // Verify balance was NOT zeroed (original behavior)
    const balanceAfter = await reentrance.getBalance(await maliciousReceiver.getAddress());
    expect(balanceAfter).to.equal(depositAmount);
  });
});