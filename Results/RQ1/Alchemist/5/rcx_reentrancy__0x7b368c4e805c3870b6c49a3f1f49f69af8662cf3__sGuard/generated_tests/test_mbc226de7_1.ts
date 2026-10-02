import { expect } from "chai";
import { ethers } } from "hardhat";

describe("W_WALLET mutant kill test", function () {
  it("should kill mutant mbc226de7 by depositing > MinSum and expecting successful collect", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required by W_WALLET constructor)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy W_WALLET with Log address
    const Factory = await ethers.getContractFactory("W_WALLET");
    const instance = await Factory.deploy(await logInstance.getAddress());
    await instance.waitForDeployment();
    
    const MinSum = await instance.MinSum();
    
    // Deposit amount greater than MinSum (e.g., 2 ether)
    const depositAmount = MinSum * 2n; // 2 ether
    await instance.connect(addr1).Put(0, { value: depositAmount });
    
    // Verify balance is > MinSum
    const holderInfo = await instance.Acc(addr1.address);
    expect(holderInfo.balance).to.equal(depositAmount);
    expect(holderInfo.balance).to.be.gt(MinSum);
    
    // Try to collect an amount (e.g., 1 ether) - should succeed in original, fail in mutant
    const collectAmount = MinSum; // 1 ether
    await expect(
      instance.connect(addr1).Collect(collectAmount)
    ).to.not.be.reverted;
    
    // Verify balance decreased
    const finalBalance = (await instance.Acc(addr1.address)).balance;
    expect(finalBalance).to.equal(depositAmount - collectAmount);
  });
});