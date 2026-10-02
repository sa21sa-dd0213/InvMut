import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant mf01ed52e test", function () {
  it("should revert when non-owner tries to call withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to call withdrawAll from a non-owner address
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});