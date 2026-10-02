import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mba127442 - detect <= instead of ==", function () {
  it("should revert when sending less than 10 ether, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 9 ether to fallback - should revert on original (9 != 10) but pass on mutant (9 <= 10)
    // If mutant is alive, the tx will succeed (no revert), and we can detect the kill
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("9")
    });

    // On the original contract this would revert, so we expect revert
    // If the mutant is present, the tx succeeds and we catch it as a failure
    await expect(tx).to.be.reverted;
  });
});