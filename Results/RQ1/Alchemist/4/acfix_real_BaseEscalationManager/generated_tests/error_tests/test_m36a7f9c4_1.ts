import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager - mutant m36a7f9c4", function () {
  it("should revert when assertionResolvedCallback is called from unauthorized address", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter to pass as constructor argument
    // Since BaseEscalationManager expects an OptimisticAsserterInterface address,
    // we can use any address since the test only checks the modifier behavior
    const mockAsserterAddress = addr1.address;
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(mockAsserterAddress);
    await instance.waitForDeployment();

    // Try to call assertionResolvedCallback from an unauthorized address (not the optimistic asserter)
    const assertionId = ethers.hexlify(ethers.randomBytes(32));
    
    await expect(
      instance.connect(addr1).assertionResolvedCallback(assertionId, true)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});