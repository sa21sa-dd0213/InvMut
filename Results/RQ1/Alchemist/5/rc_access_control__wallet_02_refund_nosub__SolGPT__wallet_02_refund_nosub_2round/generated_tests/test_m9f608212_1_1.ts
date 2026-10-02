import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m9f608212 - deposit assertion change", function () {
  it("should allow deposit from address with zero balance in original, but mutant reverts due to 0 * msg.value > 0 being false", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // addr1 has zero balance initially
    // Call deposit with a non-zero value from addr1
    // In original: assert(balance + value > balance) passes
    // In mutant: assert(balance * value > balance) => 0 * value > 0 => false => revert
    await expect(
      instance.connect(addr1).deposit({ value: ethers.parseEther("1.0") })
    ).to.be.reverted;
  });
});