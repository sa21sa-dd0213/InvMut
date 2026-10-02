import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant detection", function () {
  it("should revert when non-optimisticAsserter calls requestPrice (mutant removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock optimistic asserter contract address (any valid address)
    const mockOptimisticAsserter = addr1.address;

    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(mockOptimisticAsserter);
    await instance.waitForDeployment();

    // Attempt to call requestPrice from an unauthorized address (not the optimisticAsserter)
    // The original contract should revert, but the mutant (without require) would allow it
    await expect(
      instance.connect(addr1).requestPrice(
        ethers.encodeBytes32String("test"),
        1234567890,
        "0x"
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });

  it("should revert when non-optimisticAsserter calls assertionResolvedCallback (mutant removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const mockOptimisticAsserter = addr1.address;

    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(mockOptimisticAsserter);
    await instance.waitForDeployment();

    // Attempt to call assertionResolvedCallback from an unauthorized address
    await expect(
      instance.connect(addr1).assertionResolvedCallback(
        ethers.randomBytes(32),
        true
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });

  it("should revert when non-optimisticAsserter calls assertionDisputedCallback (mutant removes require check)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const mockOptimisticAsserter = addr1.address;

    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(mockOptimisticAsserter);
    await instance.waitForDeployment();

    // Attempt to call assertionDisputedCallback from an unauthorized address
    await expect(
      instance.connect(addr1).assertionDisputedCallback(
        ethers.randomBytes(32)
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});