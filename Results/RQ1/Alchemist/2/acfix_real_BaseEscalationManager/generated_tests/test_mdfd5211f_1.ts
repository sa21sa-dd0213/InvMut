import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant mdfd5211f detection", function () {
  it("should emit PriceRequestAdded event when requestPrice is called by the optimistic asserter", async function () {
    const [owner] = await ethers.getSigners();
    
    // Deploy a mock optimistic asserter first (since constructor requires address)
    const MockOptimisticAsserterFactory = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockOptimisticAsserter = await MockOptimisticAsserterFactory.deploy();
    await mockOptimisticAsserter.waitForDeployment();
    
    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockOptimisticAsserter.getAddress());
    await instance.waitForDeployment();
    
    // Prepare test parameters
    const identifier = ethers.encodeBytes32String("test-identifier");
    const time = Math.floor(Date.now() / 1000);
    const ancillaryData = ethers.toUtf8Bytes("test-ancillary-data");
    
    // Call requestPrice from the optimistic asserter address (which is allowed by onlyOptimisticAsserter modifier)
    // We need to impersonate the optimistic asserter contract to call from its address
    await ethers.provider.send("hardhat_impersonateAccount", [await mockOptimisticAsserter.getAddress()]);
    const asserterSigner = await ethers.getSigner(await mockOptimisticAsserter.getAddress());
    
    // Fund the impersonated account with some ETH for gas
    await owner.sendTransaction({
      to: await mockOptimisticAsserter.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    // Expect the PriceRequestAdded event to be emitted with correct parameters
    await expect(
      instance.connect(asserterSigner).requestPrice(identifier, time, ancillaryData)
    )
      .to.emit(instance, "PriceRequestAdded")
      .withArgs(identifier, time, ancillaryData);
    
    // Stop impersonating
    await ethers.provider.send("hardhat_stopImpersonatingAccount", [await mockOptimisticAsserter.getAddress()]);
  });
});