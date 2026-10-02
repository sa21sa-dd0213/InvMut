import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should allow deposit of 0 ether (kill mutant that changes >= to >)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 0 ether should succeed in original (0 >= 0 is true)
    // but fail in mutant (0 > 0 is false)
    await expect(
      instance.connect(addr1).deposit({ value: 0 })
    ).to.not.be.reverted;
  });
});