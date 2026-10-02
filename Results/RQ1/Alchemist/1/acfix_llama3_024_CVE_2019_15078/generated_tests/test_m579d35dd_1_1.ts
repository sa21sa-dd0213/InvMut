import { expect } from "chai";
import { ethers } from "hardhat";

describe("XBORNID - kill mutant m579d35dd (getTokens division replaced by subtraction)", function () {
  it("should revert when value becomes less than 100000 after repeated getTokens calls in the mutant", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("XBORNID");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send ether to trigger getTokens() via receive()
    // The initial value is 1000e18 (1000 * 10^18)
    // We need to call getTokens enough times to reduce value below 100000
    // In the original: value = (value / 100000) * 99999, so it slowly decreases
    // After many calls, value will become 0 without revert
    // In the mutant: value = (value - 100000) * 99999, which will underflow when value < 100000

    // First call from addr1 (not blacklisted)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Continue calling until value gets small enough
    // We'll call getTokens directly from addr2 which is not blacklisted yet
    for (let i = 0; i < 10; i++) {
      try {
        const tx = await instance.connect(addr2).getTokens({ value: ethers.parseEther("1") });
        await tx.wait();
      } catch (error: any) {
        // If it reverts, the mutant is killed (original would not revert)
        expect(error.message).to.include("revert");
        return;
      }
    }

    // If we get here without revert, check that value is now very small
    // In the original, value should eventually become 0
    // In the mutant, we should have reverted by now if value < 100000
    const currentValue = await instance.value();

    // For the original, value should be 0 after enough iterations
    // For the mutant, this line should never be reached because it should revert
    // But if it doesn't revert, we need to force a call that would trigger the underflow
    // Make one more call from addr1 (which should now be blacklisted but we can use a fresh address)
    const [,, addr3] = await ethers.getSigners();
    const tx = await instance.connect(addr3).getTokens({ value: ethers.parseEther("1") });
    await expect(tx).to.be.reverted;
  });
});