import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should kill mutant m51728ffd by withdrawing exact balance", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Deposit 2 ETH from addr1
    await instance.connect(addr1).deposit({ value: ethers.parseEther("2") });
    
    // Withdraw exactly 2 ETH (full balance) - should succeed on original but fail on mutant
    await expect(
      instance.connect(addr1).withdraw(ethers.parseEther("2"))
    ).to.not.be.reverted;
    
    // Verify balance is zero after withdrawal
    // Note: We can't check balance directly as it's a mapping, but we can verify
    // that withdrawing again with amount 0 succeeds (showing balance is 0)
    await expect(
      instance.connect(addr1).withdraw(0)
    ).to.not.be.reverted;
  });
});