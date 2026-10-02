import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - onlyOwner modifier removal", function () {
  it("should revert when non-owner calls withdrawAll", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 is not the owner, so calling withdrawAll should revert
    await expect(
      instance.connect(addr1).withdrawAll()
    ).to.be.reverted;
  });
});