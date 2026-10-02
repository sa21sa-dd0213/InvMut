import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrance mutant detection - me1f4e7c2", function () {
  it("should succeed when adding balance with positive msg.value (detects subtraction mutant in require)", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Reentrance");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const initialBalance = await instance.getBalance(addr1.address);
    expect(initialBalance).to.equal(0);

    const depositAmount = ethers.parseEther("1.0");
    
    // On the original contract, this transaction should succeed.
    // On the mutant (with - instead of +), the require will fail and revert.
    await expect(
      instance.connect(addr1).addToBalance({ value: depositAmount })
    ).to.not.be.reverted;

    const finalBalance = await instance.getBalance(addr1.address);
    expect(finalBalance).to.equal(depositAmount);
  });
});