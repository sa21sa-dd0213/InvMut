import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when depositing 0 value (original assert fails, mutant passes)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 ether - original contract should revert
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});