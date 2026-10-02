import { expect } from "chai";
import { ethers } from "hardhat";

describe("BANK_SAFE mutant kill test - mda25a380", function () {
  it("should kill mutant by depositing 0 ETH after a positive balance is set", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("BANK_SAFE");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit some ETH to set a positive balance
    const depositAmount = ethers.parseEther("1.0");
    const tx1 = await instance.connect(owner).Deposit({ value: depositAmount });
    await tx1.wait();

    // Now attempt to deposit 0 ETH - this should succeed in original but revert in mutant
    // The mutant require((balance * 0) >= balance) will fail when balance > 0
    const tx2 = instance.connect(owner).Deposit({ value: 0 });
    await expect(tx2).to.be.reverted;
  });
});