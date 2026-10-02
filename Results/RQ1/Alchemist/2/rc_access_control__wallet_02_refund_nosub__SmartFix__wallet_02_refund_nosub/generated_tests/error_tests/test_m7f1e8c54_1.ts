import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m7f1e8c54 detection", function () {
  it("should detect the mutant that changes <= to == in withdraw", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 1 ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Attempt to withdraw only 0.5 ether (partial withdrawal)
    const partialWithdraw = ethers.parseEther("0.5");
    
    // This should succeed on the original (<=) but fail on the mutant (==)
    await expect(
      instance.connect(addr1).withdraw(partialWithdraw)
    ).to.be.reverted;
  });
});