import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when depositing zero wei (detects removal of assertion)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 0 wei - should revert in original due to assertion
    // In mutant, assertion is removed, so deposit of 0 would succeed
    await expect(
      instance.connect(addr1).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});