import { expect } from "chai";
import { ethers } from "hardhat";

describe("keepMyEther mutant test - ma5396465", function () {
  it("should detect the mutant by sending 1 wei and expecting withdrawal to revert", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("keepMyEther");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 1 wei via fallback
    const tx = await attacker.sendTransaction({
      to: await instance.getAddress(),
      value: 1
    });
    await tx.wait();

    // Verify balance shows 1 wei in original, but mutant would show 2 wei
    const balance = await instance.balances(attacker.address);

    // Try to withdraw - mutant will try to send 2 wei but contract only has 1 wei
    await expect(
      instance.connect(attacker).withdraw()
    ).to.be.reverted;
  });
});