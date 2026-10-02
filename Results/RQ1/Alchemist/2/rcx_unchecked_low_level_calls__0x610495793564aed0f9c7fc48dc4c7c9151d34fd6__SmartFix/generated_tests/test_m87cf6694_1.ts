import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should detect mutant m87cf6694 by verifying overflow protection in receive()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get initial depositsCount
    const initialCount = await instance.depositsCount();
    
    // Calculate how many deposits are needed to reach the overflow boundary
    // uint256 max value = 2^256 - 1
    const maxUint = ethers.MaxUint256;
    const depositsNeeded = maxUint - initialCount;
    
    // Send ether to trigger receive() exactly enough times to reach the overflow boundary
    // Each deposit sends 1 wei
    const depositAmount = ethers.parseEther("0.000000000000000001"); // 1 wei
    
    for (let i = 0; i < depositsNeeded.toNumber(); i++) {
      await owner.sendTransaction({
        to: await instance.getAddress(),
        value: depositAmount
      });
    }
    
    // Now depositsCount should be at maxUint
    const countBeforeOverflow = await instance.depositsCount();
    expect(countBeforeOverflow).to.equal(maxUint);
    
    // This next deposit should trigger the overflow check
    // In original: require((maxUint + 1) >= maxUint) → require(0 >= maxUint) → false → reverts
    // In mutant: no check → depositsCount becomes 0 (overflow)
    await expect(
      owner.sendTransaction({
        to: await instance.getAddress(),
        value: depositAmount
      })
    ).to.be.reverted;
    
    // If the test passes (revert occurs), original contract is working correctly
    // If it doesn't revert, the mutant is detected (overflow allowed)
  });
});