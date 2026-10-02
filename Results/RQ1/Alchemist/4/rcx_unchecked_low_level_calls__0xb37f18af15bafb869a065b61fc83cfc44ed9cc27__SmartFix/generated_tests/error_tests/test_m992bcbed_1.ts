import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet mutant m992bcbed detection", function () {
  it("should kill the mutant by triggering overflow in depositsCount", async function () {
    const [owner, attacker] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();
    const contractAddress = await instance.getAddress();

    // Send ether to the contract until depositsCount reaches max uint256
    const maxUint = ethers.MaxUint256;
    const currentDepositsCount = await instance.depositsCount();
    
    // Calculate how many deposits needed to reach max
    const depositsNeeded = maxUint - currentDepositsCount;
    
    // Perform deposits one by one to increment depositsCount
    for (let i = 0; i < depositsNeeded.toNumber(); i++) {
      await owner.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("0.001")
      });
    }

    // Verify depositsCount is now at max
    const finalCount = await instance.depositsCount();
    expect(finalCount).to.equal(maxUint);

    // This final deposit should revert on the original (overflow protection)
    // but succeed on the mutant (where * 1 always passes)
    await expect(
      owner.sendTransaction({
        to: contractAddress,
        value: ethers.parseEther("0.001")
      })
    ).to.be.reverted;
  });
});