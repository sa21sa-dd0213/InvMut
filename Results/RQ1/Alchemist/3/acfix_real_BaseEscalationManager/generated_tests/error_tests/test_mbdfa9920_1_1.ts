import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant mbdfa9920", function () {
  it("should revert when non-optimisticAsserter calls requestPrice", async function () {
    const [owner, unauthorizedCaller] = await ethers.getSigners();

    // Deploy the BaseEscalationManager contract with a valid address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Attempt to call requestPrice from an unauthorized caller (not the optimisticAsserter)
    // The contract should revert due to onlyOptimisticAsserter modifier
    await expect(
      instance.connect(unauthorizedCaller).requestPrice(
        ethers.encodeBytes32String("test-identifier"),
        1234567890,
        "0x"
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});