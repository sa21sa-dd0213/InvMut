import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant detection - withdrawAll modifier removal", function () {
  it("should revert when non-owner calls withdrawAll after receiving funds", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the wallet with some ether from owner
    const fundAmount = ethers.parseEther("1.0");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: fundAmount
    });

    // Verify balance before attack
    const balanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceBefore).to.equal(fundAmount);

    // Non-owner (attacker) attempts to call withdrawAll - should revert in original
    await expect(
      instance.connect(attacker).withdrawAll()
    ).to.be.revertedWith("");

    // Verify balance remains unchanged (safety check for mutant detection)
    const balanceAfter = await ethers.provider.getBalance(await instance.getAddress());
    expect(balanceAfter).to.equal(fundAmount);
  });
});