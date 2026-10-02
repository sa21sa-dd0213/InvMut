import { expect } from "chai";
import { ethers } from "hardhat";

describe("MStableYieldSource - mutant mc1ae70e6", function () {
  it("should emit ApprovedMax event when approveMax is called", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // We need to deploy with a valid ISavingsContractV2 that has underlying()
    // For testing purposes, we'll use a mock that returns a token address
    const mockSavingsFactory = await ethers.getContractFactory("MockSavingsContractV2");
    const mockSavings = await mockSavingsFactory.deploy();
    await mockSavings.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("MStableYieldSource");
    const instance = await Factory.deploy(await mockSavings.getAddress());
    await instance.waitForDeployment();
    
    // Get the event filter for ApprovedMax
    const approvedMaxFilter = instance.filters.ApprovedMax(null);
    
    // Call approveMax and wait for transaction
    const tx = await instance.connect(owner).approveMax();
    const receipt = await tx.wait();
    
    // Get events from the transaction receipt
    const events = await instance.queryFilter(approvedMaxFilter, receipt.blockNumber, receipt.blockNumber);
    
    // Verify the event was emitted with the correct address
    expect(events.length).to.equal(1);
    expect(events[0].args[0]).to.equal(owner.address);
  });
});