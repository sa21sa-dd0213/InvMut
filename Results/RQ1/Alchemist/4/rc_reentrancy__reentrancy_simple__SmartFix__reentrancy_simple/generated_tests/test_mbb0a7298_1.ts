import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant mbb0a7298 - addToBalance with zero value", function () {
  it("should succeed with zero value on original but revert on mutant", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Call addToBalance with zero ether value - should succeed on original
    // but revert on mutant because mutant uses > instead of >=
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0"),
        data: instance.interface.encodeFunctionData("addToBalance")
      })
    ).to.not.be.reverted;
  });
});