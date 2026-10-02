import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant test - deposit overflow protection", function () {
  it("should detect missing overflow assertion in deposit by causing a revert when depositing near max uint256", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, deposit a small amount to establish a balance
    const initialDeposit = ethers.parseEther("1");
    await instance.connect(addr1).deposit({ value: initialDeposit });

    // Now attempt to deposit an amount that would cause overflow
    // The current balance is 1 ether (approximately 10^18 wei)
    // We need to deposit close to MAX_UINT256 - currentBalance to trigger overflow
    const maxUint256 = ethers.MaxUint256;
    const currentBalance = await instance.balances(addr1.address);

    // Calculate amount that would overflow: currentBalance + amount > maxUint256
    const overflowAmount = maxUint256 - currentBalance + 1n;

    // In the original contract, the assert should cause a revert
    // In the mutant without the assert, this would succeed but overflow
    await expect(
      instance.connect(addr1).deposit({ value: overflowAmount })
    ).to.be.reverted;
  });
});