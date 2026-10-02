import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant test - onlyOwner modifier inversion", function () {
  it("should revert when owner calls withdrawAll due to != in onlyOwner modifier", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Owner should be able to call withdrawAll in original, but mutant has != so owner call reverts
    await expect(instance.connect(owner).withdrawAll()).to.be.reverted;
  });
});