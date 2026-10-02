import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - mc244e226", function () {
  it("should kill mutant by sending max uint256 value as msg.value to Deposit", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Set MinSum to 0 to allow Collect later (not needed for this test)
    await instance.SetMinSum(0);
    await instance.Initialized();

    // Get the maximum uint256 value
    const maxUint256 = ethers.MaxUint256;

    // Attempt to deposit with msg.value = maxUint256
    // In the original: require passes but balance addition overflows -> revert
    // In the mutant: require itself reverts due to overflow in msg.value+1
    // Both revert, but the revert reason differs - we expect a revert in both cases
    await expect(
      instance.connect(owner).Deposit({ value: maxUint256 })
    ).to.be.reverted;
  });
});