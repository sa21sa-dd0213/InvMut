import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect overflow protection removal in addToBalance by sending a large value that would cause overflow", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, add a small amount to the balance to have a base value
    const baseAmount = ethers.parseEther("1");
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: baseAmount
    });

    // Now attempt to add a very large value that would cause overflow
    // We need to find a value such that baseAmount + largeValue overflows uint256
    // Since we have baseAmount = 1 ether, we need to send MAX_UINT256 - baseAmount + 1 to cause overflow
    const maxUint256 = ethers.MaxUint256;
    const overflowValue = maxUint256 - baseAmount + 1n;

    // This transaction should revert on the original contract due to overflow check
    // but would succeed on the mutant (which lacks the check)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: overflowValue
      })
    ).to.be.reverted;
  });
});