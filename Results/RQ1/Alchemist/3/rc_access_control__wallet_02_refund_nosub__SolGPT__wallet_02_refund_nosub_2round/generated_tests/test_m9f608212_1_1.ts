import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m9f608212 test", function () {
  it("should kill the mutant by depositing from an address with zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero balance, deposit should succeed in original but fail in mutant
    const depositAmount = ethers.parseEther("1.0");
    await expect(
      instance.connect(addr1).deposit({ value: depositAmount })
    ).to.not.be.reverted;
  });
});