import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mdc338dca test", function () {
  it("should revert when withdraw fails due to recipient contract rejecting ether, preserving user balance", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a malicious receiver contract that rejects ether
    const MaliciousReceiver = await ethers.getContractFactory("MaliciousReceiver");
    const receiver = await MaliciousReceiver.deploy();
    await receiver.waitForDeployment();
    
    // Fund the Reentrance contract with some ether
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    // Add balance for the receiver contract address in Reentrance
    await instance.connect(attacker).addToBalance({ value: ethers.parseEther("5") });
    
    // Get initial balance
    const initialBalance = await instance.getBalance(await receiver.getAddress());
    
    // Attempt withdrawal - should revert in original, but mutant might not revert
    // We expect the transaction to revert in the original contract
    await expect(
      instance.connect(attacker).withdrawBalance()
    ).to.be.reverted;
    
    // In the mutant, if it doesn't revert, the balance would be set to 0
    // Verify the balance is still the same (only true for original, mutant would fail here)
    const finalBalance = await instance.getBalance(await receiver.getAddress());
    expect(finalBalance).to.equal(initialBalance);
  });
});

// Helper contract to reject ether
contract MaliciousReceiver {
  fallback() external payable {
    revert("Ether rejected");
  }
}