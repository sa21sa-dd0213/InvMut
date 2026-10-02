import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant m94e41e9b", function () {
  it("should revert when calling requestPrice from unauthorized address due to onlyOptimisticAsserter modifier", async function () {
    const [owner, unauthorizedUser] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter address (any address will work for the constructor)
    const mockOptimisticAsserter = ethers.Wallet.createRandom().address;
    
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(mockOptimisticAsserter);
    await instance.waitForDeployment();
    
    // Attempt to call requestPrice from an unauthorized address (not the optimistic asserter)
    const identifier = ethers.encodeBytes32String("test");
    const time = 1000;
    const ancillaryData = "0x";
    
    // This should revert on the original contract but might pass on the mutant
    await expect(
      instance.connect(unauthorizedUser).requestPrice(identifier, time, ancillaryData)
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});