import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mdc338dca - kill test", function () {
  it("should revert withdrawal when recipient rejects Ether, preserving balance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments)
    const ReentranceFactory = await ethers.getContractFactory("Reentrance");
    const reentrance = await ReentranceFactory.deploy();
    await reentrance.waitForDeployment();
    
    // Deploy a malicious receiver that reverts on receive
    const MaliciousReceiverFactory = await ethers.getContractFactory("MaliciousReceiver");
    const maliciousReceiver = await MaliciousReceiverFactory.deploy();
    await maliciousReceiver.waitForDeployment();
    
    // Fund the Reentrance contract with some Ether
    await owner.sendTransaction({
      to: await reentrance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Add balance for the malicious receiver address
    await reentrance.connect(attacker).addToBalance({ value: ethers.parseEther("5") });
    
    // Verify initial balance
    expect(await reentrance.getBalance(await maliciousReceiver.getAddress())).to.equal(ethers.parseEther("5"));
    
    // Attempt withdrawal - should revert because maliciousReceiver rejects Ether
    // In the original contract, this reverts and keeps balance intact
    // In the mutant, balance would be set to 0 despite failed call
    await expect(
      reentrance.connect(attacker).withdrawBalance()
    ).to.be.reverted;
    
    // Verify balance is preserved (not zeroed out) - this will pass on original, fail on mutant
    expect(await reentrance.getBalance(await maliciousReceiver.getAddress())).to.equal(ethers.parseEther("5"));
  });
});

// Helper contract that reverts on receive
contract MaliciousReceiver {
  receive() external payable {
    revert("I reject your Ether");
  }
}