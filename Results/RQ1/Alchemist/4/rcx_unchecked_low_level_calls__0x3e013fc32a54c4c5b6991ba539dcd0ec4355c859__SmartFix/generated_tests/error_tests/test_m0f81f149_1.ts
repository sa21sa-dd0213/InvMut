import { expect } from "chai";
import { ethers } from "hardhat";

describe("MultiplicatorX4 mutant kill test - m0f81f149", function () {
  it("should revert when non-owner calls Command after mutant removes owner check", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("MultiplicatorX4");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund contract so there's balance to potentially send
    const fundTx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    await fundTx.wait();

    // Attempt to call Command from unauthorized address
    // Mutant removes require(msg.sender == Owner), so this should NOT revert in mutant
    // But in original contract it should revert
    const maliciousData = "0x";
    await expect(
      instance.connect(attacker).Command(attacker.address, maliciousData, {
        value: ethers.parseEther("0.5")
      })
    ).to.be.reverted;
  });
});