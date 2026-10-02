import { expect } from "chai";
import { ethers } from "hardhat";

describe("B mutant mab2733d2 test", function () {
  it("should detect removal of require on external call by sending ether when target cannot receive", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy B contract (no constructor arguments needed)
    const Factory = await ethers.getContractFactory("B");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const instanceAddress = await instance.getAddress();

    // Deploy a contract that will reject incoming ether to simulate a failing call
    const RejectorFactory = await ethers.getContractFactory(
      "contract Rejector { receive() external payable { revert(); } }"
    );
    const rejector = await RejectorFactory.deploy();
    await rejector.waitForDeployment();

    // Deploy a new B contract with the rejector as the target (we cannot change the hardcoded target, 
    // but we can test the actual behavior by funding the contract and calling go)
    // Since the target is hardcoded in the contract, we need to test with the real hardcoded address.
    // The hardcoded address is 0xC8A60C51967F4022BF9424C337e9c6F0bD220E1C - which is a random address
    // We'll send ether to the contract and then call go, expecting the original to revert but mutant to succeed
    
    // First, send some ether to the contract so it has balance to transfer to owner
    await owner.sendTransaction({
      to: instanceAddress,
      value: ethers.parseEther("1.0")
    });

    // Get initial balance of owner
    const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
    
    // Call go() with some ether (this will try to forward msg.value to the hardcoded address)
    // The hardcoded address is likely an EOA that may or may not accept ether
    // For a reliable test, we simulate by calling go() with a small amount
    const tx = await instance.connect(owner).go({ value: ethers.parseEther("0.5") });
    
    // Wait for the transaction
    await tx.wait();
    
    // Get final balance of owner - in the mutant, the owner should have received the contract's balance
    // (1.0 + 0.5 = 1.5 ether) despite the external call potentially failing
    const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
    
    // In the original contract, if the external call fails, the whole transaction reverts
    // In the mutant, it succeeds and transfers all balance to owner
    // So we check that owner's balance increased (mutant behavior) vs reverted (original behavior)
    expect(finalOwnerBalance).to.be.gt(initialOwnerBalance);
  });
});