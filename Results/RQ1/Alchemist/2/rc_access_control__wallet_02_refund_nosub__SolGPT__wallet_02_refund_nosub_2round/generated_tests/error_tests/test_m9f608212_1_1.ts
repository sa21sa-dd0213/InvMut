import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant detection - m9f608212", function () {
  it("should kill mutant by depositing 1 wei with zero balance", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 1 wei into a wallet with zero balance
    // Original: 0 + 1 > 0 => true, passes
    // Mutant: 0 * 1 > 0 => false, assertion fails and reverts
    await expect(
      instance.connect(owner).deposit({ value: ethers.parseEther("0.000000000000000001") })
    ).to.be.reverted;
  });
});