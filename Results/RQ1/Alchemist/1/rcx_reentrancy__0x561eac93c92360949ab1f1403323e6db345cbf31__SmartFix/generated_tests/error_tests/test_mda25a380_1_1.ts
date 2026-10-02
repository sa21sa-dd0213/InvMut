import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant mda25a380 by depositing with zero value when balance is non-zero", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit to give addr1 a non-zero balance
    await instance.connect(addr1).deposit({ value: ethers.parseEther("1.0") });
    
    // Now attempt to deposit with 0 value - should pass on original, revert on mutant
    await expect(
      instance.connect(addr1).deposit({ value: 0 })
    ).to.not.be.reverted;
  });
});