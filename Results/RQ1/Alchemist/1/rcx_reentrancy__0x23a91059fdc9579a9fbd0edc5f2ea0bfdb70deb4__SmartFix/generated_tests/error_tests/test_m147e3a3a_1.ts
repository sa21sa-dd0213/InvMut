import { expect } from "chai";
import { ethers } } from "hardhat";

describe("PrivateBank mutant m147e3a3a - Deposit overflow check mutation", function () {
  it("should revert when depositing with a non-zero existing balance due to mutated subtraction check", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const LogFactory = await ethers.getContractFactory("Log");
    const log = await LogFactory.deploy();
    await log.waitForDeployment();
    
    const PrivateBankFactory = await ethers.getContractFactory("PrivateBank");
    const privateBank = await PrivateBankFactory.deploy(log.target);
    await privateBank.waitForDeployment();

    // First deposit to create a non-zero balance
    const initialDeposit = ethers.parseEther("1");
    await privateBank.connect(addr1).Deposit({ value: initialDeposit });
    
    // Attempt second deposit - mutant will revert due to (balance - msg.value) >= balance
    const secondDeposit = ethers.parseEther("1");
    await expect(
      privateBank.connect(addr1).Deposit({ value: secondDeposit })
    ).to.be.reverted;
  });
});