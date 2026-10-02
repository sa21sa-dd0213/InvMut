import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant kill test - m43b1cf64", function () {
  it("should detect the mutant by depositing and withdrawing exact amount", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const depositAmount = ethers.parseEther("1.0");

    // User deposits exactly 1 ETH
    await instance.connect(user).deposit({ value: depositAmount });

    // In original: balance = 1 ETH
    // In mutant: balance = 1 ETH + 1 wei (due to msg.value+1)

    // Try to withdraw exactly 1 ETH - should succeed in original
    await expect(instance.connect(user).withdraw(depositAmount)).to.not.be.reverted;

    // Now try to withdraw again - in original balance is 0, so this should revert
    // In mutant, after first withdrawal there is still 1 wei left, so second withdrawal of 1 wei should succeed
    // This detects the mutant because the mutant allows an extra withdrawal that shouldn't exist
    await expect(instance.connect(user).withdraw(1)).to.be.reverted;
  });
});