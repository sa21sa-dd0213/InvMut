import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mde82fac5 test", function () {
  it("should revert when sending exactly 10 ether but fail when sending more than 10 ether due to mutant", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, send exactly 10 ether to set pastBlockTime and allow subsequent transactions
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Now send more than 10 ether (e.g., 11 ether) - should revert on original (exact equality)
    // but succeed on mutant (>= check). This difference kills the mutant.
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("11")
      })
    ).to.be.reverted; // Will pass on original (revert expected), fail on mutant (no revert)
  });
});