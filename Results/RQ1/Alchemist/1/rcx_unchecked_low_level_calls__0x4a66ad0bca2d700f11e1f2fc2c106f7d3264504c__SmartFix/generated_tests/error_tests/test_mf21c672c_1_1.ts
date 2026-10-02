import { expect } from "chai";
import { ethers } from "hardhat";

describe("EBU mutant mf21c672c test", function () {
  it("should revert on original but pass on mutant with overflow value", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("EBU");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Use a value that will cause overflow when multiplied by 1e18
    // 2^256 / 1e18 ≈ 1.15e59, so any value > 1.15e59 will overflow
    // We use 2^200 which is well above the overflow threshold
    const hugeValue = ethers.toBigInt("1606938044258990275541962092341162602522202993782792835301376"); // 2^200
    
    const recipients = [ethers.ZeroAddress]; // dummy address
    const amounts = [hugeValue];

    // On the original contract, this would revert because (hugeValue * 1e18) / hugeValue != 1e18 due to overflow
    // On the mutant, the >= check would pass because the overflowed result / hugeValue could be >= 1e18
    await expect(
      instance.connect(owner).transfer(recipients, amounts)
    ).to.not.be.reverted;
  });
});