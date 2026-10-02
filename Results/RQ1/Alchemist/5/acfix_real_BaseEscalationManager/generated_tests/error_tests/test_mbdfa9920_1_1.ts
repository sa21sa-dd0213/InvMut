import { expect } from "chai";
import { ethers } from "hardhat";

describe("BaseEscalationManager mutant mbdfa9920", function () {
  it("should revert when requestPrice is called from non-optimisticAsserter address", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy a mock OptimisticAsserter to pass as constructor argument
    const MockOptimisticAsserter = await ethers.getContractFactory("MockOptimisticAsserter");
    const mockAsserter = await MockOptimisticAsserter.deploy();
    await mockAsserter.waitForDeployment();

    // Deploy BaseEscalationManager with the mock asserter address
    const Factory = await ethers.getContractFactory("BaseEscalationManager");
    const instance = await Factory.deploy(await mockAsserter.getAddress());
    await instance.waitForDeployment();

    // Attempt to call requestPrice from a non-optimisticAsserter address (addr1)
    // In the original contract, this should revert due to onlyOptimisticAsserter modifier
    // In the mutant (without modifier), this call would succeed
    await expect(
      instance.connect(addr1).requestPrice(
        ethers.encodeBytes32String("test"),
        123456,
        "0x"
      )
    ).to.be.revertedWith("Not the optimistic asserter");
  });
});