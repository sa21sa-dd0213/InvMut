import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant test for assertionDisputedCallback", function () {
  it("should revert when calling assertionDisputedCallback from non-optimisticAsserter address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy the contract - it needs the address of an OptimisticAsserterInterface contract
    // For testing purposes, we can deploy a mock or use a zero address since the function
    // only checks the msg.sender against the stored optimisticAsserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    
    // Deploy with a dummy address as the optimisticAsserter (e.g., addr1's address)
    const dummyAsserterAddress = addr1.address;
    const instance = await Factory.deploy(dummyAsserterAddress);
    await instance.waitForDeployment();
    
    // Try to call assertionDisputedCallback from an address that is NOT the optimisticAsserter
    // In this case, owner is not addr1 (the stored optimisticAsserter), so this should revert
    await expect(
      instance.connect(owner).assertionDisputedCallback(ethers.ZeroHash)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});