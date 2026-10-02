import { expect } from "chai";
import { ethers } from "hardhat";

describe("PrivateBank reference (ethers v6)", function () {
  it("should detect mutant that adds 1 extra wei to balance on deposit", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy Log contract first (required constructor argument for PrivateBank)
    const LogFactory = await ethers.getContractFactory("Log");
    const logInstance = await LogFactory.deploy();
    await logInstance.waitForDeployment();
    
    // Deploy PrivateBank with Log address as constructor argument
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const bankInstance = await PrivateBankFactory.deploy(await logInstance.getAddress());
    await bankInstance.waitForDeployment();
    
    const minDeposit = ethers.parseEther("1");
    const depositAmount = minDeposit; // Exactly 1 ether
    
    // addr1 deposits exactly 1 ether
    const tx = await bankInstance.connect(addr1).Deposit({ value: depositAmount });
    await tx.wait();
    
    // In the original contract, balance should be exactly 1 ether
    // In the mutant, balance should be 1 ether + 1 wei
    // Try to cash out exactly 1 ether + 1 wei - should revert in original but succeed in mutant
    const cashoutAmount = depositAmount + BigInt(1); // 1 ether + 1 wei
    
    // This should revert in the original (balance is exactly 1 ether, not enough for 1 ether + 1 wei)
    // But should succeed in the mutant (balance is 1 ether + 1 wei, exactly enough)
    await expect(
      bankInstance.connect(addr1).CashOut(cashoutAmount)
    ).to.be.reverted;
  });
});