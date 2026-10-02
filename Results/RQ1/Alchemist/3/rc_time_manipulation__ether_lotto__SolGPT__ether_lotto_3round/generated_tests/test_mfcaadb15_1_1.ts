import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherLotto mutant detection - mfcaadb15", function () {
  it("should revert when sending wrong ticket amount (mutant removed require check)", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EtherLotto");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 5 wei instead of the required 10 wei - mutant should not revert
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 5
      })
    ).to.be.reverted;

    // Also verify that sending 0 wei also reverts (original contract would revert both)
    await expect(
      player.sendTransaction({
        to: await instance.getAddress(),
        value: 0
      })
    ).to.be.reverted;
  });
});