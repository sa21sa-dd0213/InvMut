import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant m9316c5ec test", function () {
  it("should revert when depositing value that would cause overflow in original contract, but mutant allows it", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First, set the balance of owner to near max uint256
    const maxUint = ethers.MaxUint256;
    const deposit1 = maxUint - 1n; // leaves balance at maxUint - 1
    
    // Manually add to balance using addToBalance with same value to get to maxUint - 1
    await instance.connect(owner).addToBalance({ value: deposit1 });

    // Now balance is maxUint - 1, depositing 2 wei would overflow in original
    const deposit2 = 2n;
    // Original contract would revert, mutant would allow because condition is always true
    await expect(instance.connect(owner).addToBalance({ value: deposit2 })).to.not.be.reverted;

    // Verify that overflow occurred (balance should be 1, not maxUint+1)
    const balance = await instance.getBalance(owner.address);
    expect(balance).to.equal(1n);
  });
});