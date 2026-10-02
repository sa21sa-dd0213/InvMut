import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m9316c5ec test", function () {
  it("should detect mutant by sending max uint256 value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const maxUint256 = ethers.MaxUint256;

    // This should succeed on original but revert on mutant due to msg.value+1 overflow
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: maxUint256,
      })
    ).to.be.reverted;
  });
});