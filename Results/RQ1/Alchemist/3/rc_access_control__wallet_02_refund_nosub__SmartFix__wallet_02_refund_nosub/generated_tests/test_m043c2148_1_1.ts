import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert deposit when balance is zero and amount is positive due to multiplication assertion mutation", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero balance, calling deposit with 1 ether should revert on mutant
    // because 0 * 1 ether > 0 is false (assertion fails)
    await expect(
      instance.connect(addr1).deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});