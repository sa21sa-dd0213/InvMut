import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant kill test", function () {
  it("should revert when withdrawal fails (mutant removed revert)", async function () {
    const [owner, attacker] = await ethers.getSigners();
    
    // Deploy the Reentrance contract (no constructor args needed for this contract)
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Deploy a receiver contract that rejects incoming ETH
    const ReceiverFactory = await ethers.getContractFactory("RejectingReceiver");
    const receiver = await ReceiverFactory.deploy();
    await receiver.waitForDeployment();
    
    // Fund the Reentrance contract with some ETH
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Fund the receiver's balance in Reentrance
    const receiverAddress = await receiver.getAddress();
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.5")
    });
    // Directly set balance for receiver (since addToBalance uses msg.sender)
    // We'll use attacker to add balance to the receiver contract's address
    await instance.connect(attacker).addToBalance({ value: ethers.parseEther("0.5") });
    // Actually we need the receiver contract to be the one calling withdrawBalance
    // So let's transfer ownership of the balance to receiver contract
    
    // Alternative approach: have the receiver contract call withdrawBalance
    // First add balance to the receiver contract's address
    await instance.connect(owner).addToBalance({ value: ethers.parseEther("0.5") });
    // Wait, we need to add balance from receiver contract's perspective
    
    // Simpler: Use the receiver contract to call withdrawBalance
    // First ensure receiver has balance in the contract
    // Fund the contract and set balance for receiver address
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("2.0")
    });
    
    // Call addToBalance from receiver contract to credit its address
    await receiver.addBalance(await instance.getAddress(), { value: ethers.parseEther("1.0") });
    
    // Now receiver has balance, call withdrawBalance from receiver
    // This should fail because receiver rejects ETH, and the original would revert
    await expect(
      receiver.withdrawFrom(await instance.getAddress())
    ).to.be.reverted;
    
    // Verify that receiver's balance in Reentrance is preserved in original (not in mutant)
    // In the original, the revert would keep the balance; in mutant, balance would be 0
    const balanceAfter = await instance.getBalance(await receiver.getAddress());
    expect(balanceAfter).to.equal(ethers.parseEther("1.0"));
  });
});

// Helper contract that rejects ETH
// This would be deployed as a separate contract
// Note: For a complete test, you'd need to deploy this contract too
// But since we can't deploy two contracts in this test, we'll use a different approach

// Alternative simpler test:
describe("Reentrance mutant kill test v2", function () {
  it("should revert when external call fails", async function () {
    const [owner] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    
    // Create a contract that will reject ETH
    const Rejector = await ethers.getContractFactory("RejectingReceiver");
    const rejector = await Rejector.deploy();
    await rejector.waitForDeployment();
    
    const rejectorAddress = await rejector.getAddress();
    
    // Add balance to rejector address in Reentrance
    await instance.connect(owner).addToBalance({ value: ethers.parseEther("1.0") });
    
    // Have rejector call withdrawBalance
    // The original would revert because rejector rejects ETH
    // The mutant would not revert, setting balance to 0 incorrectly
    await expect(
      rejector.callWithdraw(await instance.getAddress())
    ).to.be.reverted;
    
    // Check that balance is preserved (original behavior)
    const balance = await instance.getBalance(rejectorAddress);
    expect(balance).to.equal(ethers.parseEther("1.0"));
  });
});