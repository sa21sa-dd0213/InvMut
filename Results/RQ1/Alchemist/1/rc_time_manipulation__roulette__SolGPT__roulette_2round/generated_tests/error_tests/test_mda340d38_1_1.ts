import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mda340d38 test", function () {
  it("should not transfer balance when block.number % 15 != 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy({ value: ethers.parseEther("10") });
    await instance.waitForDeployment();

    // Fund the contract with some ether to make balance transfer meaningful
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Record balance before call
    const balanceBefore = await ethers.provider.getBalance(addr1.address);

    // Call the fallback from addr1 with exactly 10 ether
    const tx = await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    const balanceAfter = await ethers.provider.getBalance(addr1.address);

    // On original: if block.number % 15 != 0, no transfer should occur
    // On mutant: transfer always occurs, so balanceAfter would be higher
    // We verify no transfer happened (i.e., balance difference is only the sent 10 ether minus gas)
    // For a reliable check, we verify addr1 did not receive the contract's balance
    expect(balanceAfter).to.be.lessThan(balanceBefore - ethers.parseEther("9.9"));
  });
});