import { expect } from "chai";
import { ethers } from "hardhat";

describe("Phishable mutant kill test - mb442de3a", function () {
  it("should kill mutant by calling withdrawAll from owner and expecting success", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Phishable");
    const instance = await Factory.deploy(owner.address);
    await instance.waitForDeployment();

    // Send some ETH to the contract so there is balance to withdraw
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0"),
    });

    // Owner calls withdrawAll - should succeed on original, revert on mutant
    const tx = instance.connect(owner).withdrawAll(addr1.address);

    // On the original contract this succeeds; on the mutant it reverts (due to != check)
    await expect(tx).to.not.be.reverted;

    // Verify the balance was transferred to addr1
    expect(await ethers.provider.getBalance(addr1.address)).to.equal(ethers.parseEther("10001.0")); // 10000 initial + 1
  });
});