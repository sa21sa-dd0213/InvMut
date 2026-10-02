import { expect } from "chai";
import { ethers } from "hardhat";

describe("SimpleWallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m87cf6694 by detecting missing overflow check in receive()", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("SimpleWallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Get the maximum uint256 value
    const maxUint = ethers.MaxUint256;

    // Set depositsCount to maxUint - 1 by sending enough Ether to trigger the increment
    // Since we can't directly set state, we'll use the overflow check behavior
    // First, send ether to increment depositsCount close to maxUint
    for (let i = 0; i < 255; i++) {
      await owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      });
    }

    // Get current depositsCount
    let currentCount = await instance.depositsCount();

    // Calculate remaining deposits needed to reach maxUint
    const remaining = maxUint - currentCount;

    // Send ether remaining times to reach maxUint
    for (let i = 0; i < Number(remaining); i++) {
      await owner.sendTransaction({
        to: await instance.getAddress(),
        value: ethers.parseEther("0.001")
      });
    }

    // Now depositsCount should be maxUint
    expect(await instance.depositsCount()).to.equal(maxUint);

    // Attempt one more deposit - in original contract this should revert due to overflow check
    // In mutant, it would succeed and wrap depositsCount to 0
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("0.001")
    });

    // The mutant would allow this transaction to succeed (no revert)
    // The original contract would revert due to overflow check
    // Since we're testing the mutant, we expect the transaction to succeed and depositsCount to wrap to 0
    await (await tx).wait();

    // If the mutant is present, depositsCount will be 0 (wrapped around)
    // If the original contract is present, this line won't be reached (reverted)
    expect(await instance.depositsCount()).to.equal(0);
  });
});