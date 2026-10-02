import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mde82fac5 detection", function () {
  it("should revert when sending more than exactly 10 ether (e.g., 11 ether)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 11 ether to trigger the mutant's relaxed require condition
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("11")
    });

    // Original requires exact 10 ether, so sending 11 should revert
    await expect(tx).to.be.reverted;
  });
});