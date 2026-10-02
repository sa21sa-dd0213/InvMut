import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant detection - overflow protection", function () {
  it("should revert on deposit that would cause overflow in original, but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, initialize the contract so we can deposit
    await instance.connect(owner).SetMinSum(0);
    await instance.connect(owner).Initialized();

    // Get the maximum uint256 value
    const MAX_UINT = ethers.MaxUint256;
    
    // First deposit a large amount to addr1's balance to set up overflow condition
    // We need to make addr1's balance large enough so that adding 1 would overflow
    const largeAmount = MAX_UINT - BigInt(1);
    
    // Send ether to the contract to fund addr1's balance
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: largeAmount
    });
    
    // Deposit the large amount as addr1
    // We need to call deposit through receive() by sending ether
    await addr1.sendTransaction({
      to: await instance.getAddress(),
      value: largeAmount
    });

    // Now try to deposit 1 wei - this should overflow in original (revert)
    // but in mutant it will silently overflow and wrap around
    const tx = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: 1
    });

    // In the original contract, this should revert due to overflow check
    // In the mutant, it will succeed (killing the mutant)
    await expect(tx).to.be.reverted;
  });
});