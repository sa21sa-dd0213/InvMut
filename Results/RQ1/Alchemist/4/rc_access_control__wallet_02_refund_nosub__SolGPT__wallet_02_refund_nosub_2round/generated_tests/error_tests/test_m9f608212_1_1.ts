import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - m9f608212", function () {
  it("should detect the mutant by depositing 1 wei with zero balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero balance initially
    // On the original contract, depositing 1 wei should succeed
    // On the mutant, the assertion 0 * 1 > 0 evaluates to false, causing revert
    await expect(
      instance.connect(addr1).deposit({ value: ethers.parseEther("0") })
    ).to.be.reverted;
  });
});