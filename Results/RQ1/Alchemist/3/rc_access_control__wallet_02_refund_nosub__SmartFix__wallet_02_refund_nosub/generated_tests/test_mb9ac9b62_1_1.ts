import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant mb9ac9b62 by withdrawing exact balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit some ether from addr1
    const depositAmount = ethers.parseEther("1.0");
    await instance.connect(addr1).deposit({ value: depositAmount });

    // Withdraw the exact full balance (should succeed on original, revert on mutant)
    await expect(
      instance.connect(addr1).withdraw(depositAmount)
    ).to.not.be.reverted;

    // Verify balance is zero after withdrawal
    expect(await ethers.provider.getBalance(instance.getAddress())).to.equal(0);
  });
});